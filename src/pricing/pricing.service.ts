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
        
        // E1, E2 계산
        const N = config.N || Number(process.env.PRICING_N ?? 50);
        const C1 = config.C1 || Number(process.env.PRICING_C1 ?? 5000);
        const C2 = config.C2 || Number(process.env.PRICING_C2 ?? 3000);
        const T = config.T || Number(process.env.PRICING_T ?? 6);
        config.E1 = (N * C1) / T;
        config.E2 = (N * C2) / T;
        
        return config;
      }
    } catch (error) {
      // 테이블이 없으면 환경변수에서 읽기
    }

    // 환경변수에서 읽기 (fallback)
    const envConfig = this.configService.get<any>("pricing");
    const N = Number(process.env.PRICING_N ?? 50);
    const C1 = Number(process.env.PRICING_C1 ?? 5000);
    const C2 = Number(process.env.PRICING_C2 ?? 3000);
    const T = Number(process.env.PRICING_T ?? 6);
    return {
      ...envConfig,
      E1: (N * C1) / T,
      E2: (N * C2) / T,
    };
  }

  async recalcEvery10s(): Promise<void> {
    const { P0, E1, GAMMA, L1, U1 } = await this.getPricingConfig();

    const teams = await this.teamRepo.find();
    const now = new Date();

    for (const team of teams) {
      const i = Number(team.money ?? 0);
      const d1 = E1 > 0 ? i / E1 : 0;
      const r1 = rootCompress(d1, GAMMA);
      const m1 = clip(r1, L1, U1);
      const p1 = Math.round((team.p0 ?? P0) * m1);

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
      `Recalculated prices for ${teams.length} teams at ${now.toISOString()}`
    );
  }
}
