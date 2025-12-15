import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { CompetitionTeam } from "../teams/entity/team.entity";
import { Price } from "../prices/entity/price.entity";
import { ConfigService } from "@nestjs/config";
import { clip, rootCompress } from "../utils/pricing.util";

@Injectable()
export class PricingService implements OnModuleInit {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    @InjectRepository(CompetitionTeam)
    private readonly teamRepo: Repository<CompetitionTeam>,
    @InjectRepository(Price)
    private readonly priceRepo: Repository<Price>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource
  ) {}

  onModuleInit(): void {
    // Fallback scheduler without @nestjs/schedule
    setInterval(() => {
      this.recalcEvery10s().catch((err) =>
        this.logger.error("Recalc error", err as any)
      );
    }, 10_000);
  }

  private async getPricingConfig(): Promise<any> {
    // DB에서 가격 설정 읽기, 없으면 환경변수에서 읽기
    try {
      const query = `SELECT key, value FROM pricing_config`;
      const rows = await this.dataSource.query(query);
      
      if (rows.length > 0) {
        const config: any = {};
        rows.forEach((row: any) => {
          config[row.key] = Number(row.value);
        });
        
        // E 계산
        const N = config.N || Number(process.env.PRICING_N ?? 100);
        const C = config.C || config.C1 || Number(process.env.PRICING_C ?? process.env.PRICING_C1 ?? 45000);
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
    const C = Number(process.env.PRICING_C ?? process.env.PRICING_C1 ?? 45000);
    const T = Number(process.env.PRICING_T ?? 6);
    const E = (N * C) / T;
    return {
      ...envConfig,
      E,
      // 하위 호환성을 위해 E1, E2도 설정
      E1: E,
      E2: E,
    };
  }

  async recalcEvery10s(): Promise<void> {
    const config = await this.getPricingConfig();
    const { P0, E, GAMMA, L, U } = config;
    // 하위 호환성을 위해 E1, L1, U1도 지원
    const effectiveE = E || config.E1 || 750000;
    const effectiveL = L || config.L1 || 0.6;
    const effectiveU = U || config.U1 || 15.0;

    const teams = await this.teamRepo.find();
    const now = new Date();

    // 전체 투자금 합계 확인 (총 투자 시드 450만원 제한)
    const TOTAL_INVESTMENT_SEED = 4500000; // 총 투자 시드 450만원
    const currentTotalInvestment = teams.reduce(
      (sum, t) => sum + (t.money ?? 0),
      0
    );

    // 전체 투자금이 450만원을 초과하면 비례적으로 조정
    if (currentTotalInvestment > TOTAL_INVESTMENT_SEED) {
      const scaleFactor = TOTAL_INVESTMENT_SEED / currentTotalInvestment;
      this.logger.warn(
        `Total investment ${currentTotalInvestment.toLocaleString()} exceeds limit ${TOTAL_INVESTMENT_SEED.toLocaleString()}. Scaling by ${scaleFactor.toFixed(4)}`
      );

      // 모든 팀의 투자금을 비례적으로 조정
      for (const team of teams) {
        const adjustedMoney = Math.round((team.money ?? 0) * scaleFactor);
        team.money = adjustedMoney;
        await this.teamRepo.save(team);
      }
    }

    for (const team of teams) {
      const i = Number(team.money ?? 0);
      const d = effectiveE > 0 ? i / effectiveE : 0;
      const r = rootCompress(d, GAMMA);
      const m = clip(r, effectiveL, effectiveU);
      const p1 = Math.round((team.p0 ?? P0) * m);

      const currentPrice = p1;

      await this.priceRepo
        .createQueryBuilder()
        .insert()
        .values([{ teamId: team.id, round: 1, price: p1, tickTs: now }])
        .orIgnore()
        .execute();

      // cache on team
      await this.teamRepo.update(team.id, { p: currentPrice });
    }

    this.logger.debug(
      `Recalculated prices for ${teams.length} teams at ${now.toISOString()}. Total investment: ${currentTotalInvestment.toLocaleString()}`
    );
  }
}
