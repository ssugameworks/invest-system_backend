import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { CompetitionTeam } from "../teams/entity/team.entity";
import { Price } from "../prices/entity/price.entity";
import { UserInvestment } from "../investments/entity/user-investment.entity";
import { InvestmentHistory } from "../investments/entity/investment-history.entity";
import { ConfigService } from "@nestjs/config";
import { clip, rootCompress } from "../utils/pricing.util";

@Injectable()
export class PricingService implements OnModuleInit {
  private readonly logger = new Logger(PricingService.name);
  private isRecalculating = false; // ⭐ 중복 실행 방지 플래그

  constructor(
    @InjectRepository(CompetitionTeam)
    private readonly teamRepo: Repository<CompetitionTeam>,
    @InjectRepository(Price)
    private readonly priceRepo: Repository<Price>,
    @InjectRepository(UserInvestment)
    private readonly userInvestmentRepo: Repository<UserInvestment>,
    @InjectRepository(InvestmentHistory)
    private readonly investmentHistoryRepo: Repository<InvestmentHistory>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource
  ) {}

  async onModuleInit(): Promise<void> {
    // ⭐ 초기 가격 설정을 먼저 완료하고 기다림
    try {
      await this.initializePrices();
    } catch (err) {
      // 에러 발생 시 무시
    }

    // ⭐ 초기화 완료 후에 스케줄러 시작
    setInterval(() => {
      this.recalcEvery10s().catch(() => {
        // 에러 발생 시 무시
      });
    }, 10_000);
  }

  private async initializePrices(): Promise<void> {
    const INITIAL_PRICE = 1000; // ⭐ 초기 주가 1000원
    
    // ⭐ 주가가 null이거나 0인 팀만 초기 주가로 설정 (이미 설정된 주가는 유지)
    await this.dataSource.query(
      `UPDATE competition_teams SET p = $1 WHERE p IS NULL OR p = 0`,
      [INITIAL_PRICE]
    );
  }

  private async getPricingConfig(): Promise<any> {
    // ⭐ P0는 항상 1000으로 고정
    const FIXED_P0 = 1000;
    
    // DB에서 가격 설정 읽기, 없으면 환경변수에서 읽기
    try {
      const query = `SELECT key, value FROM pricing_config`;
      const rows = await this.dataSource.query(query);
      
      if (rows.length > 0) {
        const config: any = {};
        rows.forEach((row: any) => {
          config[row.key] = Number(row.value);
        });
        
        // ⭐ P0 강제 덮어쓰기
        config.P0 = FIXED_P0;
        
        // E 계산
        const N = config.N || Number(process.env.PRICING_N ?? 100);
        const C = config.C || config.C1 || Number(process.env.PRICING_C ?? process.env.PRICING_C1 ?? 50000);
        const T = config.T || Number(process.env.PRICING_T ?? 6);
        config.E = (N * C) / T;
        // 하위 호환성을 위해 E1, E2도 설정
        config.E1 = config.E;
        config.E2 = config.E;
        
        // 주가 변동 민감도 설정 (DB에 없으면 기본값 사용)
        if (config.BUY_PRICE_CHANGE_PER_WON === undefined || config.BUY_PRICE_CHANGE_PER_WON === null) {
          config.BUY_PRICE_CHANGE_PER_WON = Number(process.env.PRICING_BUY_PRICE_CHANGE_PER_WON ?? 0.00001);
        }
        if (config.SELL_PRICE_CHANGE_PER_WON === undefined || config.SELL_PRICE_CHANGE_PER_WON === null) {
          config.SELL_PRICE_CHANGE_PER_WON = Number(process.env.PRICING_SELL_PRICE_CHANGE_PER_WON ?? 0.00001);
        }
        
        return config;
      }
    } catch (error) {
      // 테이블이 없으면 환경변수에서 읽기
    }

    // 환경변수에서 읽기 (fallback)
    const envConfig = this.configService.get<any>("pricing");
    const N = Number(process.env.PRICING_N ?? 100);
    const C = Number(process.env.PRICING_C ?? process.env.PRICING_C1 ?? 50000);
    const T = Number(process.env.PRICING_T ?? 6);
    const E = (N * C) / T;
    return {
      ...envConfig,
      P0: FIXED_P0, // ⭐ P0 강제 설정
      E,
      // 하위 호환성을 위해 E1, E2도 설정
      E1: E,
      E2: E,
      // 주가 변동 민감도 설정 (기본값)
      BUY_PRICE_CHANGE_PER_WON: Number(process.env.PRICING_BUY_PRICE_CHANGE_PER_WON ?? 0.00001),
      SELL_PRICE_CHANGE_PER_WON: Number(process.env.PRICING_SELL_PRICE_CHANGE_PER_WON ?? 0.00001),
    };
  }

  async recalcEvery10s(): Promise<void> {
    // ⭐ 이미 실행 중이면 스킵 (중복 실행 방지)
    if (this.isRecalculating) {
      return;
    }
    
    this.isRecalculating = true;
    try {
      // ⭐ 트랜잭션으로 가격 재계산을 원자적으로 수행
      await this.dataSource.transaction(async (manager) => {
      const config = await this.getPricingConfig();
    const { P0, E, GAMMA, L, U } = config;
    // 하위 호환성을 위해 E1, L1, U1도 지원
    const effectiveE = E || config.E1 || 750000;
    const effectiveL = L || config.L1 || 0.6;
    const effectiveU = U || config.U1 || 15.0;

    // ⭐ DB에서 최신 값 가져오기 (트랜잭션 내부)
    const teams = await manager.find(CompetitionTeam);
    const now = new Date();

    // 전체 투자금 합계 확인 (총 투자 시드 500만원 제한)
    const TOTAL_INVESTMENT_SEED = 5000000; // 총 투자 시드 500만원
    const currentTotalInvestment = teams.reduce(
      (sum, t) => sum + (t.money ?? 0),
      0
    );

    // ⭐ 전체 투자금이 500만원을 초과하면 비례적으로 조정 (트랜잭션 내부)
    if (currentTotalInvestment > TOTAL_INVESTMENT_SEED) {
      const scaleFactor = TOTAL_INVESTMENT_SEED / currentTotalInvestment;

      // 모든 팀의 투자금을 비례적으로 조정 (배치 업데이트로 원자성 보장)
      const teamIds = teams.map(t => t.id);
      if (teamIds.length > 0) {
        await manager.query(
          `UPDATE competition_teams SET money = ROUND(money * $1) WHERE id = ANY($2)`,
          [scaleFactor, teamIds]
        );

        // ⭐ user_investments의 invested_amount도 동일한 비율로 조정 (데이터 일관성 유지)
        // 팀 money와 invested_amount의 합계가 일치하도록 보장
        await manager.query(
          `UPDATE user_investments SET invested_amount = ROUND(invested_amount * $1) WHERE team_id = ANY($2)`,
          [scaleFactor, teamIds]
        );
      }
    }

    // ⭐ 최적화: 모든 팀의 최근 거래를 한 번에 조회 (N+1 쿼리 문제 해결)
    const fifteenSecondsAgo = new Date(now.getTime() - 15000);
    
    // ⭐ 모든 팀의 최근 15초 이내 매수/매도 금액을 한 번에 조회 (트랜잭션 내부)
    const recentTransactions = await manager.query(
      `
      SELECT 
        team_id,
        type,
        SUM(amount) as total_amount
      FROM investment_history
      WHERE created_at >= $1
      GROUP BY team_id, type
      `,
      [fifteenSecondsAgo]
    );
    
    // 팀별로 거래 금액을 맵으로 구성
    const teamTransactions = new Map<number, { buy: number; sell: number }>();
    for (const tx of recentTransactions) {
      const teamId = tx.team_id;
      if (!teamTransactions.has(teamId)) {
        teamTransactions.set(teamId, { buy: 0, sell: 0 });
      }
      const teamTx = teamTransactions.get(teamId)!;
      if (tx.type === 'buy') {
        teamTx.buy = Number(tx.total_amount || 0);
      } else if (tx.type === 'sell') {
        teamTx.sell = Number(tx.total_amount || 0);
      }
    }

    // ⭐ 최적화: 모든 팀의 현재 가격을 한 번에 조회 (트랜잭션 내부)
    const teamPriceResults = await manager.query(
      `SELECT id, p FROM competition_teams`
    );
    const teamPriceMap = new Map<number, number>();
    for (const row of teamPriceResults) {
      teamPriceMap.set(row.id, row.p ?? P0);
    }

    // ⭐ 최적화: 배치 업데이트를 위한 배열 준비
    const priceUpdates: Array<{ teamId: number; price: number }> = [];
    const priceHistoryInserts: Array<{ teamId: number; price: number }> = [];

    for (const team of teams) {
      const i = Number(team.money ?? 0);
      
      // ⭐ 최적화: 맵에서 조회 (개별 쿼리 대신)
      let basePrice: number = teamPriceMap.get(team.id) ?? P0;
      
      // basePrice가 0이거나 null이면 초기값으로 설정
      if (!basePrice || basePrice === 0) {
        basePrice = P0;
        teamPriceMap.set(team.id, P0);
      }
      
      // 주가 계산: 현재 주가를 기준으로 하되, 최근 투자금 변화량만 반영
      // 문제: team.money는 누적 투자금이므로, 전체를 기준으로 계산하면 주가가 과도하게 상승
      // 해결: 최근 15초 이내 투자 금액만 반영하여 주가 변화량 계산 (10초마다 실행되므로 여유있게 15초)
      // 주가가 1000원일 때 50,000원 투자 시 주가가 5~10원 상승하도록 설정
      
      // ⭐ 최적화: 맵에서 조회 (개별 쿼리 대신)
      const teamTx = teamTransactions.get(team.id) || { buy: 0, sell: 0 };
      const recentBuyAmount = teamTx.buy;
      const recentSellAmount = teamTx.sell;
      
      // 매수와 매도를 반영하여 주가 변화량 계산
      // 매수와 매도 동일한 영향력으로 설정
      // DB에서 설정값 읽기, 없으면 기본값 사용
      const buyPriceChangePerWon = config.BUY_PRICE_CHANGE_PER_WON !== undefined 
        ? config.BUY_PRICE_CHANGE_PER_WON 
        : 0.00001; // 매수 1원당 주가 상승량
      const sellPriceChangePerWon = config.SELL_PRICE_CHANGE_PER_WON !== undefined 
        ? config.SELL_PRICE_CHANGE_PER_WON 
        : 0.00001; // 매도 1원당 주가 하락량 (매수와 동일)
      
      // 매수로 인한 상승과 매도로 인한 하락을 각각 계산
      const buyPriceChange = recentBuyAmount * buyPriceChangePerWon;
      const sellPriceChange = recentSellAmount * sellPriceChangePerWon;
      
      // 순 주가 변화량 = 매수 상승 - 매도 하락
      const priceChange = buyPriceChange - sellPriceChange;
      
      // ⭐ 주가 계산 로직 (단순화)
      // 최근 거래가 있으면 priceChange를 반영, 없으면 주가 유지
      let targetPrice: number;
      
      if (recentBuyAmount === 0 && recentSellAmount === 0) {
        // 최근 거래가 없으면 주가 유지
        targetPrice = basePrice;
      } else {
        // 매수 또는 매도가 있으면 priceChange 반영 (양수면 상승, 음수면 하락)
        targetPrice = basePrice + priceChange;
      }
      
      // clip을 통해 최소/최대 주가 제한 적용
      const minPrice = Math.round(P0 * effectiveL);
      const maxPrice = Math.round(P0 * effectiveU);
      const p1 = Math.round(Math.min(Math.max(targetPrice, minPrice), maxPrice));

      const currentPrice = p1;

      // ⭐ 최적화: 배치 업데이트를 위해 배열에 추가
      priceUpdates.push({ teamId: team.id, price: currentPrice });
      priceHistoryInserts.push({ teamId: team.id, price: currentPrice });
    }

    // ⭐ 최적화: 모든 가격 업데이트를 배치로 실행 (트랜잭션 내부)
    if (priceUpdates.length > 0) {
      // 개별 업데이트보다는 CASE 문을 사용한 단일 쿼리가 더 효율적이지만,
      // 간단하게 배치로 처리 (트랜잭션 내부이므로 원자성 보장)
      await Promise.all(
        priceUpdates.map(update =>
          manager.query(
            `UPDATE competition_teams SET p = $1 WHERE id = $2`,
            [update.price, update.teamId]
          )
        )
      );
    }

    // ⭐ 최적화: 가격 이력도 배치로 저장
    if (priceHistoryInserts.length > 0) {
      const historyValues = priceHistoryInserts.map((insert, index) => 
        `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`
      ).join(', ');
      const historyParams: any[] = [];
      priceHistoryInserts.forEach(insert => {
        historyParams.push(insert.teamId, 1, insert.price, now);
      });
      
      await manager.query(
        `
        INSERT INTO prices (team_id, round, price, tick_ts)
        VALUES ${historyValues}
        `,
        historyParams
      );
    }

    // shares가 1 미만인 user_investments 레코드 삭제 (트랜잭션 내부)
    await manager.query(
      `DELETE FROM user_investments WHERE shares < 1`
    );
      }); // 트랜잭션 종료
    } finally {
      // ⭐ 플래그 해제
      this.isRecalculating = false;
    }
  }

  private async cleanupLowShares(): Promise<void> {
    // shares가 1 미만인 모든 레코드 삭제
    // numeric 타입이므로 직접 비교 가능
    const result = await this.userInvestmentRepo
      .createQueryBuilder()
      .delete()
      .from(UserInvestment)
      .where("shares < 1")
      .execute();

    // shares가 1 미만인 레코드 삭제 완료 (로그 없음)
  }
}
