import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
    private readonly configService: ConfigService
  ) {}

  onModuleInit(): void {
    // Fallback scheduler without @nestjs/schedule
    setInterval(() => {
      this.recalcEvery10s().catch((err) =>
        this.logger.error("Recalc error", err as any)
      );
    }, 10_000);
  }

  async recalcEvery10s(): Promise<void> {
    const { P0, E1, GAMMA, L1, U1 } = this.configService.get<any>("pricing");

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
