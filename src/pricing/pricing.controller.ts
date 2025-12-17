import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompetitionTeam } from "../teams/entity/team.entity";

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
    @InjectRepository(CompetitionTeam) private readonly teamRepo: Repository<CompetitionTeam>
  ) {}

  @Get("prices")
  @ApiOkResponse({ type: [PriceItemDto] })
  async getPrices(): Promise<PriceItemDto[]> {
    // 현재 주가(team.p)만 반환
    const teams = await this.teamRepo.find();
    const now = new Date();
    
    return teams.map(team => ({
      teamId: team.id,
      round: 1,
      price: team.p ?? 1000, // 현재 주가(p), 기본값 1000
      tickTs: now,
    }));
  }
}
