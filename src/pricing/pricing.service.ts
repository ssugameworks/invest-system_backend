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
    const INITIAL_PRICE = 700; // ⭐ 초기 주가 700원
    
    // ⭐ 모든 팀의 p를 무조건 700으로 초기화
    await this.dataSource.query(
      `UPDATE competition_teams SET p = $1`,
      [INITIAL_PRICE]
    );
  }

  private async getPricingConfig(): Promise<any> {
    // ⭐ P0는 항상 700으로 고정
    const FIXED_P0 = 700;
    
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
    };
  }

  async recalcEvery10s(): Promise<void> {
    // ⭐ 이미 실행 중이면 스킵 (중복 실행 방지)
    if (this.isRecalculating) {
      return;
    }
    
    this.isRecalculating = true;
    try {
      const config = await this.getPricingConfig();
    const { P0, E, GAMMA, L, U } = config;
    // 하위 호환성을 위해 E1, L1, U1도 지원
    const effectiveE = E || config.E1 || 750000;
    const effectiveL = L || config.L1 || 0.6;
    const effectiveU = U || config.U1 || 15.0;

    // DB에서 최신 값 가져오기
    const teams = await this.teamRepo.find();
    const now = new Date();

    // 전체 투자금 합계 확인 (총 투자 시드 500만원 제한)
    const TOTAL_INVESTMENT_SEED = 5000000; // 총 투자 시드 500만원
    const currentTotalInvestment = teams.reduce(
      (sum, t) => sum + (t.money ?? 0),
      0
    );

    // 전체 투자금이 500만원을 초과하면 비례적으로 조정
    if (currentTotalInvestment > TOTAL_INVESTMENT_SEED) {
      const scaleFactor = TOTAL_INVESTMENT_SEED / currentTotalInvestment;

      // 모든 팀의 투자금을 비례적으로 조정
      for (const team of teams) {
        const adjustedMoney = Math.round((team.money ?? 0) * scaleFactor);
        team.money = adjustedMoney;
        await this.teamRepo.save(team);
      }
    }

    for (const team of teams) {
      const i = Number(team.money ?? 0);
      
      // ⭐ Raw SQL로 직접 p 값을 읽기 (캐시 완전 무시)
      const result = await this.dataSource.query(
        `SELECT p FROM competition_teams WHERE id = $1`,
        [team.id]
      );
      let basePrice: number = result[0]?.p ?? P0;
      
      // basePrice가 0이거나 null이면 초기값으로 설정
      if (!basePrice || basePrice === 0) {
        basePrice = P0;
        await this.dataSource.query(
          `UPDATE competition_teams SET p = $1 WHERE id = $2`,
          [P0, team.id]
        );
      }
      
      // 주가 계산: 현재 주가를 기준으로 하되, 최근 투자금 변화량만 반영
      // 문제: team.money는 누적 투자금이므로, 전체를 기준으로 계산하면 주가가 과도하게 상승
      // 해결: 최근 15초 이내 투자 금액만 반영하여 주가 변화량 계산 (10초마다 실행되므로 여유있게 15초)
      // 주가가 700원일 때 50,000원 투자 시 주가가 5~10원 상승하도록 설정
      const fifteenSecondsAgo = new Date(now.getTime() - 15000);
      
      // 최근 15초 이내 매수 금액 조회
      const recentBuys = await this.investmentHistoryRepo
        .createQueryBuilder("history")
        .where("history.team_id = :teamId", { teamId: team.id })
        .andWhere("history.type = 'buy'")
        .andWhere("history.created_at >= :fifteenSecondsAgo", { fifteenSecondsAgo })
        .select("SUM(history.amount)", "totalAmount")
        .getRawOne();
      
      // 최근 15초 이내 매도 금액 조회
      const recentSells = await this.investmentHistoryRepo
        .createQueryBuilder("history")
        .where("history.team_id = :teamId", { teamId: team.id })
        .andWhere("history.type = 'sell'")
        .andWhere("history.created_at >= :fifteenSecondsAgo", { fifteenSecondsAgo })
        .select("SUM(history.amount)", "totalAmount")
        .getRawOne();
      
      const recentBuyAmount = Number(recentBuys?.totalAmount || 0);
      const recentSellAmount = Number(recentSells?.totalAmount || 0);
      
      // 매수와 매도를 반영하여 주가 변화량 계산
      // 매도는 매수보다 더 강한 영향력을 가짐 (매도 시 주가 하락을 더 명확하게 반영)
      const buyPriceChangePerWon = 0.0001; // 매수 1원당 주가 상승량
      const sellPriceChangePerWon = 0.0005; // 매도 1원당 주가 하락량 (매수보다 5배 강함)
      
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

      // prices 테이블에 가격 이력 저장
      await this.priceRepo.save({
        teamId: team.id,
        round: 1,
        price: p1,
        tickTs: now
      });

      // ⭐ Raw SQL로 직접 업데이트 (확실한 저장)
      await this.dataSource.query(
        `UPDATE competition_teams SET p = $1 WHERE id = $2`,
        [currentPrice, team.id]
      );
      
      // ⭐ 즉시 재확인 (에러 체크만, 로그 없음)
      const verifyResult = await this.dataSource.query(
        `SELECT p FROM competition_teams WHERE id = $1`,
        [team.id]
      );
      const savedPrice = verifyResult[0]?.p;
      
      if (savedPrice !== currentPrice) {
        // 업데이트 실패 시 재시도
        await this.dataSource.query(
          `UPDATE competition_teams SET p = $1 WHERE id = $2`,
          [currentPrice, team.id]
        );
      }
    }

    // shares가 1 미만인 user_investments 레코드 삭제
    await this.cleanupLowShares();
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
