import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Price } from "../prices/entity/price.entity";

class PriceItemDto {
  teamId!: number;
  round!: number;
  price!: number;
  tickTs!: Date;
}

@ApiTags("Prices")
@Controller("api")
export class PricingController {
  constructor(
    @InjectRepository(Price) private readonly priceRepo: Repository<Price>
  ) {}

  @Get("prices")
  @ApiOkResponse({ type: [PriceItemDto] })
  async getPrices(): Promise<PriceItemDto[]> {
    // latest price per team (by tickTs) for the most recent round record per team
    const rows = await this.priceRepo
      .createQueryBuilder("p")
      .select([
        "p.team_id AS teamId",
        "p.round AS round",
        "p.price AS price",
        'p.tick_ts AS "tickTs"',
      ])
      .innerJoin(
        (qb) =>
          qb
            .from(Price, "p2")
            .select("p2.team_id", "team_id")
            .addSelect("MAX(p2.tick_ts)", "max_ts")
            .groupBy("p2.team_id"),
        "latest",
        "latest.team_id = p.team_id AND latest.max_ts = p.tick_ts"
      )
      .getRawMany<PriceItemDto>();

    return rows;
  }
}
