import { Controller, Get, Param, ParseIntPipe, NotFoundException } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import { CompetitionTeam } from "./entity/team.entity";
import { Price } from "../prices/entity/price.entity";

class PriceHistoryDto {
  price!: number;
  tickTs!: Date;
}

@ApiTags("Teams")
@Controller("api/teams")
export class TeamController {
  constructor(
    @InjectRepository(CompetitionTeam)
    private readonly teamRepo: Repository<CompetitionTeam>,
    @InjectRepository(Price)
    private readonly priceRepo: Repository<Price>
  ) {}

  @Get()
  @ApiOperation({ summary: "전체 팀 목록 조회" })
  @ApiOkResponse({
    description: "팀 목록",
    type: [CompetitionTeam],
  })
  async getAllTeams(): Promise<CompetitionTeam[]> {
    return await this.teamRepo.find({
      order: { id: "ASC" },
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "특정 팀 정보 조회" })
  @ApiParam({ name: "id", type: Number, example: 1 })
  @ApiOkResponse({
    description: "팀 정보",
    type: CompetitionTeam,
  })
  async getTeam(@Param("id", ParseIntPipe) id: number): Promise<CompetitionTeam> {
    const team = await this.teamRepo.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException("팀을 찾을 수 없습니다.");
    }
    return team;
  }

  @Get(":id/price-history")
  @ApiOperation({ summary: "팀 가격 히스토리 조회 (최근 2.5시간)" })
  @ApiParam({ name: "id", type: Number, example: 1 })
  @ApiOkResponse({
    description: "가격 히스토리",
    type: [PriceHistoryDto],
  })
  async getPriceHistory(@Param("id", ParseIntPipe) id: number): Promise<PriceHistoryDto[]> {
    // 2.5시간 전
    const since = new Date(Date.now() - 2.5 * 60 * 60 * 1000);
    
    const prices = await this.priceRepo.find({
      where: {
        teamId: id,
        tickTs: MoreThan(since),
      },
      order: {
        tickTs: "ASC",
      },
      select: ["price", "tickTs"],
    });

    return prices;
  }
}

