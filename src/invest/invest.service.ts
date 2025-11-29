import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InvestRequestDto } from "./dto/invest-request.dto";
import { InvestResponseDto } from "./dto/invest-response.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { User } from "../users/entity/user.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";
import { UserInvestment } from "../investments/entity/user-investment.entity";
import { InvestmentHistory } from "../investments/entity/investment-history.entity";

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
    private readonly dataSource: DataSource
  ) {}

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

  async invest(
    body: InvestRequestDto,
    authorization?: string
  ): Promise<InvestResponseDto> {
    const token = this.extractToken(authorization);

    // 트랜잭션으로 원자성 보장
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { accessToken: token },
      });
      if (!user) {
        throw new UnauthorizedException("Invalid token");
      }

      const currentCapital = user.capital ?? 0;
      if (currentCapital < body.amount) {
        throw new BadRequestException("보유 자본이 부족합니다.");
      }

      const team = await manager.findOne(CompetitionTeam, {
        where: { id: body.teamId },
      });
      if (!team) {
        throw new BadRequestException("유효하지 않은 팀입니다.");
      }

      const currentPrice = team.p ?? team.p0 ?? 1000;
      if (currentPrice <= 0) {
        throw new BadRequestException("유효하지 않은 주가입니다.");
      }

      // 주식 수 계산
      const shares = body.amount / currentPrice;

      // 1. 사용자 자본 차감 (반올림)
      user.capital = Math.round(currentCapital - body.amount);
      await manager.save(User, user);

      // 2. 팀 투자금 증가 (반올림)
      const currentMoney = team.money ?? 0;
      team.money = Math.round(currentMoney + body.amount);
      await manager.save(CompetitionTeam, team);

      // 3. 포트폴리오 업데이트
      let investment = await manager.findOne(UserInvestment, {
        where: { user_id: user.id, team_id: body.teamId },
      });

      if (investment) {
        // 기존 투자 업데이트
        investment.shares = Number(investment.shares) + shares;
        investment.invested_amount = Math.round(investment.invested_amount + body.amount);
        investment.average_price = Math.round(
          investment.invested_amount / investment.shares
        );
      } else {
        // 새로운 투자 생성
        investment = manager.create(UserInvestment, {
          user_id: user.id,
          team_id: body.teamId,
          shares,
          invested_amount: Math.round(body.amount),
          average_price: Math.round(currentPrice),
        });
      }
      await manager.save(UserInvestment, investment);

      // 4. 투자 히스토리 기록
      const history = manager.create(InvestmentHistory, {
        user_id: user.id,
        team_id: body.teamId,
        type: "buy",
        amount: body.amount,
        price: currentPrice,
        shares,
      });
      await manager.save(InvestmentHistory, history);

      // 5. 자산 재계산
      await this.updateUserAssets(user.id, manager);

      return {
        amount: body.amount,
        status: "success",
        message: `투자가 완료되었습니다. (${shares.toFixed(4)}주 매수)`,
      };
    });
  }

  async sell(
    body: InvestRequestDto,
    authorization?: string
  ): Promise<InvestResponseDto> {
    const token = this.extractToken(authorization);

    // 트랜잭션으로 원자성 보장
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { accessToken: token },
      });
      if (!user) {
        throw new UnauthorizedException("Invalid token");
      }

      // 보유 주식 확인
      const investment = await manager.findOne(UserInvestment, {
        where: { user_id: user.id, team_id: body.teamId },
      });

      if (!investment) {
        throw new BadRequestException("해당 팀에 투자한 내역이 없습니다.");
      }

      const team = await manager.findOne(CompetitionTeam, {
        where: { id: body.teamId },
      });
      if (!team) {
        throw new BadRequestException("유효하지 않은 팀입니다.");
      }

      const currentPrice = team.p ?? team.p0 ?? 1000;
      if (currentPrice <= 0) {
        throw new BadRequestException("유효하지 않은 주가입니다.");
      }

      // 매도 가능 주식 수 계산
      const sharesToSell = body.amount / currentPrice;
      const currentShares = Number(investment.shares);

      if (sharesToSell > currentShares) {
        throw new BadRequestException(
          `보유 주식이 부족합니다. (보유: ${currentShares.toFixed(4)}주, 매도 시도: ${sharesToSell.toFixed(4)}주)`
        );
      }

      // 1. 사용자 자본 증가 (반올림)
      user.capital = Math.round((user.capital ?? 0) + body.amount);
      await manager.save(User, user);

      // 2. 팀 투자금 감소 (반올림)
      const currentMoney = team.money ?? 0;
      if (currentMoney < body.amount) {
        throw new BadRequestException(
          "팀의 투자금이 부족합니다. (시스템 오류)"
        );
      }
      team.money = Math.round(currentMoney - body.amount);
      await manager.save(CompetitionTeam, team);

      // 3. 포트폴리오 업데이트
      investment.shares = currentShares - sharesToSell;
      const amountToDeduct = Math.round(
        (body.amount / currentPrice) * investment.average_price
      );
      investment.invested_amount = Math.round(investment.invested_amount - amountToDeduct);

      if (investment.shares <= 0.0001) {
        // 보유 주식이 거의 없으면 삭제
        await manager.remove(UserInvestment, investment);
      } else {
        investment.average_price = Math.round(
          investment.invested_amount / investment.shares
        );
        await manager.save(UserInvestment, investment);
      }

      // 4. 투자 히스토리 기록
      const history = manager.create(InvestmentHistory, {
        user_id: user.id,
        team_id: body.teamId,
        type: "sell",
        amount: body.amount,
        price: currentPrice,
        shares: sharesToSell,
      });
      await manager.save(InvestmentHistory, history);

      // 5. 자산 재계산
      await this.updateUserAssets(user.id, manager);

      return {
        amount: body.amount,
        status: "success",
        message: `매도가 완료되었습니다. (${sharesToSell.toFixed(4)}주 매도)`,
      };
    });
  }

  private async updateUserAssets(
    userId: number,
    manager: any
  ): Promise<void> {
    // 모든 보유 주식 가져오기
    const investments = await manager.find(UserInvestment, {
      where: { user_id: userId },
    });

    let stock_value = 0;

    // 각 주식의 현재 평가액 계산 (반올림)
    for (const inv of investments) {
      const team = await manager.findOne(CompetitionTeam, {
        where: { id: inv.team_id },
      });
      if (team) {
        const currentPrice = team.p ?? team.p0 ?? 0;
        stock_value += Math.round(Number(inv.shares) * currentPrice);
      }
    }

    const user = await manager.findOne(User, { where: { id: userId } });
    if (user) {
      const total_assets = Math.round((user.capital ?? 0) + stock_value);
      const INITIAL_CAPITAL = 50000; // 초기 자본 50,000원
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
