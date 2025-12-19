import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  ConflictException,
} from "@nestjs/common";
import { InvestRequestDto } from "./dto/invest-request.dto";
import { InvestResponseDto } from "./dto/invest-response.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository, In } from "typeorm";
import { User } from "../users/entity/user.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";
import { UserInvestment } from "../investments/entity/user-investment.entity";
import { InvestmentHistory } from "../investments/entity/investment-history.entity";
import { DbInternalService } from "../db-internal/db-internal.service";
import { randomUUID } from "crypto";

@Injectable()
export class InvestService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(CompetitionTeam)
    private readonly teamRepo: Repository<CompetitionTeam>,
    @InjectRepository(UserInvestment)
    private readonly userInvestmentRepo: Repository<UserInvestment>,
    @InjectRepository(InvestmentHistory)
    private readonly investmentHistoryRepo: Repository<InvestmentHistory>,
    private readonly dataSource: DataSource,
    private readonly dbInternalService: DbInternalService
  ) {}

  private checkTradingEnabled(): void {
    if (!this.dbInternalService.isTradingEnabled()) {
      throw new ServiceUnavailableException(
        "현재 거래가 중단되어 있습니다. 잠시 후 다시 시도해주세요."
      );
    }
  }

  private extractToken(authorization?: string): string {
    if (!authorization || typeof authorization !== "string") {
      throw new UnauthorizedException("Missing Authorization header");
    }
    if (!authorization.startsWith("Bearer ")) {
      throw new UnauthorizedException(
        "Authorization header must be Bearer token"
      );
    }
    const token = authorization.substring("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedException("Empty Bearer token");
    }
    return token;
  }

  /**
   * Idempotency key 생성 (클라이언트가 제공하지 않은 경우)
   */
  private generateIdempotencyKey(userId: number, teamId: number, amount: number, type: 'buy' | 'sell'): string {
    const timestamp = Date.now();
    return `${userId}-${teamId}-${amount}-${type}-${timestamp}-${randomUUID()}`;
  }

  /**
   * 중복 체결 방지: idempotency key로 이미 처리된 거래인지 확인
   */
  private async checkIdempotency(
    manager: any,
    idempotencyKey: string
  ): Promise<InvestmentHistory | null> {
    if (!idempotencyKey) {
      return null;
    }

    const existingHistory = await manager.findOne(InvestmentHistory, {
      where: { idempotency_key: idempotencyKey },
    });

    return existingHistory || null;
  }

  async invest(
    body: InvestRequestDto,
    authorization?: string
  ): Promise<InvestResponseDto> {
    // 거래 중단 상태 체크
    this.checkTradingEnabled();
    
    const token = this.extractToken(authorization);

    // ⭐ SERIALIZABLE 격리 수준으로 트랜잭션 시작 (가장 강한 격리 수준)
    try {
    return await this.dataSource.transaction(
      "SERIALIZABLE",
      async (manager) => {
        // ⭐ 비관적 잠금으로 사용자 조회 (SELECT FOR UPDATE)
        const user = await manager
          .createQueryBuilder(User, "user")
          .setLock("pessimistic_write")
          .where("user.accessToken = :token", { token })
          .getOne();

        if (!user) {
          throw new UnauthorizedException("Invalid token");
        }

        // ⭐ 비관적 잠금으로 팀 조회 (SELECT FOR UPDATE)
        const team = await manager
          .createQueryBuilder(CompetitionTeam, "team")
          .setLock("pessimistic_write")
          .where("team.id = :teamId", { teamId: body.teamId })
          .getOne();

        if (!team) {
          throw new BadRequestException("유효하지 않은 팀입니다.");
        }

        // ⭐ idempotency key 생성 또는 사용
        const idempotencyKey = body.idempotencyKey || this.generateIdempotencyKey(
          user.id,
          body.teamId,
          body.amount,
          'buy'
        );

        // ⭐ 중복 체결 방지: idempotency key로 이미 처리된 거래인지 확인
        const existingHistory = await this.checkIdempotency(manager, idempotencyKey);
        if (existingHistory) {
          // 이미 처리된 거래인 경우 기존 결과 반환
          return {
            amount: existingHistory.amount,
            status: "success",
            message: `이미 처리된 거래입니다. (${(existingHistory.shares as number).toFixed(4)}주 매수)`,
          };
        }

        const currentCapital = user.capital ?? 0;
        if (currentCapital < body.amount) {
          throw new BadRequestException("보유 자본이 부족합니다.");
        }

        // ⭐ 가격은 잠금된 팀 객체에서 가져옴 (트랜잭션 내 일관성 보장)
        const currentPrice = team.p ?? 1000;
        if (currentPrice <= 0) {
          throw new BadRequestException("유효하지 않은 주가입니다.");
        }

        // ⭐ 총 투자 시드 한도 체크 (잠금된 상태에서 SUM 쿼리)
        const TOTAL_INVESTMENT_SEED = 5000000; // 총 투자 시드 500만원
        const totalInvestmentResult = await manager.query(
          `SELECT COALESCE(SUM(money), 0) as total FROM competition_teams FOR UPDATE`
        );
        const currentTotalInvestment = Number(totalInvestmentResult[0]?.total || 0);
        const remainingCapacity = TOTAL_INVESTMENT_SEED - currentTotalInvestment;

        // 투자 가능 금액 제한
        let investAmount = body.amount;
        if (currentTotalInvestment + investAmount > TOTAL_INVESTMENT_SEED) {
          if (remainingCapacity <= 0) {
            throw new BadRequestException(
              `총 투자 시드 500만원에 도달했습니다. 더 이상 투자할 수 없습니다.`
            );
          }
          // 남은 용량만큼만 투자 가능
          investAmount = Math.max(0, remainingCapacity);
          if (investAmount === 0) {
            throw new BadRequestException(
              `총 투자 시드 500만원에 도달했습니다. 더 이상 투자할 수 없습니다.`
            );
          }
        }

        // ⭐ 주식 수 계산 (서버에서 최종 결정, 정밀도 보장)
        const shares = investAmount / currentPrice;

        // 1. 사용자 자본 차감 (반올림) - 실제 투자 금액만큼만 차감
        user.capital = Math.round(currentCapital - investAmount);
        await manager.save(User, user);

        // 2. 팀 투자금 증가 (반올림) - 이미 잠금된 team 객체 사용
        const currentMoney = team.money ?? 0;
        team.money = Math.round(currentMoney + investAmount);
        await manager.save(CompetitionTeam, team);

        // 3. 포트폴리오 업데이트 (비관적 잠금)
        let investment = await manager
          .createQueryBuilder(UserInvestment, "investment")
          .setLock("pessimistic_write")
          .where("investment.user_id = :userId", { userId: user.id })
          .andWhere("investment.team_id = :teamId", { teamId: body.teamId })
          .getOne();

        if (investment) {
          // 기존 투자 업데이트
          investment.shares = Number(investment.shares) + shares;
          investment.invested_amount = Math.round(investment.invested_amount + investAmount);
          investment.average_price = Math.round(
            investment.invested_amount / investment.shares
          );
        } else {
          // 새로운 투자 생성
          investment = manager.create(UserInvestment, {
            user_id: user.id,
            team_id: body.teamId,
            shares,
            invested_amount: Math.round(investAmount),
            average_price: Math.round(currentPrice),
          });
        }
        await manager.save(UserInvestment, investment);

        // 4. 투자 히스토리 기록 (idempotency key 포함)
        const history = manager.create(InvestmentHistory, {
          user_id: user.id,
          team_id: body.teamId,
          type: "buy",
          amount: investAmount,
          price: currentPrice,
          shares,
          idempotency_key: idempotencyKey,
        });
        await manager.save(InvestmentHistory, history);

        // 5. 자산 재계산 (트랜잭션 내부에서 실행)
        await this.updateUserAssets(user.id, manager);

        const message = 
          investAmount < body.amount
            ? `투자가 완료되었습니다. (${shares.toFixed(4)}주 매수, 요청: ${body.amount.toLocaleString()}원, 실제: ${investAmount.toLocaleString()}원 - 총 투자 시드 500만원 제한)`
            : `투자가 완료되었습니다. (${shares.toFixed(4)}주 매수)`;

        // 거래 성공 기록 (트랜잭션 완료 후 실행)
        DbInternalService.recordTransaction('buy', true);

        return {
          amount: investAmount,
          status: "success",
          message,
        };
      }
    );
    } catch (error) {
      // 거래 실패 기록
      DbInternalService.recordTransaction('buy', false);
      throw error;
    }
  }

  async sell(
    body: InvestRequestDto,
    authorization?: string
  ): Promise<InvestResponseDto> {
    // 거래 중단 상태 체크
    this.checkTradingEnabled();
    
    const token = this.extractToken(authorization);

    // ⭐ SERIALIZABLE 격리 수준으로 트랜잭션 시작
    try {
    return await this.dataSource.transaction(
      "SERIALIZABLE",
      async (manager) => {
        // ⭐ 비관적 잠금으로 사용자 조회
        const user = await manager
          .createQueryBuilder(User, "user")
          .setLock("pessimistic_write")
          .where("user.accessToken = :token", { token })
          .getOne();

        if (!user) {
          throw new UnauthorizedException("Invalid token");
        }

        // ⭐ idempotency key 생성 또는 사용
        const idempotencyKey = body.idempotencyKey || this.generateIdempotencyKey(
          user.id,
          body.teamId,
          body.amount,
          'sell'
        );

        // ⭐ 중복 체결 방지
        const existingHistory = await this.checkIdempotency(manager, idempotencyKey);
        if (existingHistory) {
          return {
            amount: existingHistory.amount,
            status: "success",
            message: `이미 처리된 거래입니다. (${(existingHistory.shares as number).toFixed(4)}주 매도)`,
          };
        }

        // ⭐ 비관적 잠금으로 투자 내역 조회
        const investment = await manager
          .createQueryBuilder(UserInvestment, "investment")
          .setLock("pessimistic_write")
          .where("investment.user_id = :userId", { userId: user.id })
          .andWhere("investment.team_id = :teamId", { teamId: body.teamId })
          .getOne();

        if (!investment) {
          throw new BadRequestException("해당 팀에 투자한 내역이 없습니다.");
        }

        // ⭐ 비관적 잠금으로 팀 조회
        const team = await manager
          .createQueryBuilder(CompetitionTeam, "team")
          .setLock("pessimistic_write")
          .where("team.id = :teamId", { teamId: body.teamId })
          .getOne();

        if (!team) {
          throw new BadRequestException("유효하지 않은 팀입니다.");
        }

        // ⭐ 가격은 잠금된 팀 객체에서 가져옴
        const currentPrice = team.p ?? 1000;
        if (currentPrice <= 0) {
          throw new BadRequestException("유효하지 않은 주가입니다.");
        }

        // ⭐ 매도 가능 주식 수 계산 (서버에서 최종 결정)
        const sharesToSell = body.amount / currentPrice;
        const currentShares = Number(investment.shares);

        if (sharesToSell > currentShares) {
          throw new BadRequestException(
            `보유 주식이 부족합니다. (보유: ${currentShares.toFixed(4)}주, 매도 시도: ${sharesToSell.toFixed(4)}주)`
          );
        }

        // ⭐ 실제 투입한 원가 계산 (평균 매수가 * 매도 주식 수)
        // 사용자는 현재 시장가(body.amount)를 받지만, 팀의 money에서는 실제 투입 원가만 차감
        const actualInvestedAmount = Math.round(sharesToSell * investment.average_price);
        const currentMoney = team.money ?? 0;

        // ⭐ 팀의 money가 실제 투입 원가를 차감할 수 있는지 확인
        if (actualInvestedAmount > currentMoney) {
          throw new BadRequestException(
            `팀의 자본금이 부족하여 매도할 수 없습니다. (필요: ${actualInvestedAmount.toLocaleString()}원, 보유: ${currentMoney.toLocaleString()}원)`
          );
        }

        // 1. 사용자 자본 증가 (현재 시장가로 정산) - 반올림
        user.capital = Math.round((user.capital ?? 0) + body.amount);
        await manager.save(User, user);

        // 2. 팀 투자금 감소 (실제 투입 원가만 차감) - 이미 잠금된 team 객체 사용
        // ⭐ 이미 검증했으므로 Math.max 불필요, 명시적으로 차감
        team.money = Math.round(currentMoney - actualInvestedAmount);
        await manager.save(CompetitionTeam, team);

        // 3. 포트폴리오 업데이트
        investment.shares = currentShares - sharesToSell;
        investment.invested_amount = Math.round(investment.invested_amount - actualInvestedAmount);

        // shares가 0 이하이거나 매우 작은 값(0.0001 이하)이면 삭제
        if (investment.shares <= 0.0001 || investment.shares <= 0) {
          // 보유 주식이 거의 없거나 없으면 삭제
          await manager.remove(UserInvestment, investment);
        } else {
          investment.average_price = Math.round(
            investment.invested_amount / investment.shares
          );
          await manager.save(UserInvestment, investment);
        }

        // 4. 투자 히스토리 기록 (idempotency key 포함)
        const history = manager.create(InvestmentHistory, {
          user_id: user.id,
          team_id: body.teamId,
          type: "sell",
          amount: body.amount,
          price: currentPrice,
          shares: sharesToSell,
          idempotency_key: idempotencyKey,
        });
        await manager.save(InvestmentHistory, history);

        // 5. 자산 재계산 (트랜잭션 내부에서 실행)
        await this.updateUserAssets(user.id, manager);

        // 거래 성공 기록
        DbInternalService.recordTransaction('sell', true);

        return {
          amount: body.amount,
          status: "success",
          message: `매도가 완료되었습니다. (${sharesToSell.toFixed(4)}주 매도)`,
        };
      }
    );
    } catch (error) {
      // 거래 실패 기록
      DbInternalService.recordTransaction('sell', false);
      throw error;
    }
  }

  private async updateUserAssets(
    userId: number,
    manager: any
  ): Promise<void> {
    // ⭐ 비관적 잠금으로 모든 보유 주식 가져오기
    const investments = await manager
      .createQueryBuilder(UserInvestment, "investment")
      .setLock("pessimistic_read")
      .where("investment.user_id = :userId", { userId })
      .getMany();

    // ⭐ 최적화: N+1 쿼리 문제 해결 - 모든 팀의 가격을 한 번에 조회 (비관적 잠금)
    const teamIds = investments
      .filter((inv: UserInvestment) => Number(inv.shares) > 0.0001)
      .map((inv: UserInvestment) => inv.team_id);
    
    let teamPrices = new Map<number, number>();
    if (teamIds.length > 0) {
      const teams = await manager
        .createQueryBuilder(CompetitionTeam, "team")
        .setLock("pessimistic_read")
        .where("team.id IN (:...teamIds)", { teamIds })
        .select(["team.id", "team.p"])
        .getMany();
      for (const team of teams) {
        teamPrices.set(team.id, team.p ?? 1000);
      }
    }

    let stock_value = 0;

    // 각 주식의 현재 평가액 계산 (반올림)
    for (const inv of investments) {
      const shares = Number(inv.shares);
      // shares가 0 이하이거나 매우 작은 값(0.0001 이하)인 경우 제외
      if (shares <= 0.0001) {
        continue;
      }
      
      // ⭐ 최적화: 맵에서 조회 (개별 쿼리 대신)
      const currentPrice = teamPrices.get(inv.team_id) ?? 1000;
      stock_value += Math.round(shares * currentPrice);
    }

    // ⭐ 비관적 잠금으로 사용자 조회 및 업데이트
    const user = await manager
      .createQueryBuilder(User, "user")
      .setLock("pessimistic_write")
      .where("user.id = :userId", { userId })
      .getOne();

    if (user) {
      const INITIAL_CAPITAL = 50000; // 초기 자본 50,000원 (총 투자 시드 500만원 / 100명)
      const MAX_TOTAL_ASSETS = 70000; // 최대 총 자산 70,000원
      
      let total_assets = Math.round((user.capital ?? 0) + stock_value);
      
      // 1등 투자자 최대 수익 제한: 총 자산이 최대치를 넘지 않도록 제한
      if (total_assets > MAX_TOTAL_ASSETS) {
        total_assets = MAX_TOTAL_ASSETS;
        // 주식 평가액을 조정하여 총 자산이 최대치가 되도록 함
        stock_value = Math.max(0, MAX_TOTAL_ASSETS - (user.capital ?? 0));
      }
      
      const roi = INITIAL_CAPITAL > 0 
        ? Math.round(((total_assets - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100)
        : 0;

      user.stock_value = Math.round(stock_value);
      user.total_assets = total_assets;
      user.roi = roi;
      await manager.save(User, user);
    }
  }
}