import { Controller, Get, Param, ParseIntPipe, Query, NotFoundException } from "@nestjs/common";
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
  @ApiOperation({ summary: "팀 가격 히스토리 조회 (최근 20분 또는 since 이후)" })
  @ApiParam({ name: "id", type: Number, example: 1 })
  @ApiOkResponse({
    description: "가격 히스토리",
    type: [PriceHistoryDto],
  })
  async getPriceHistory(
    @Param("id", ParseIntPipe) id: number,
    @Query("since") sinceParam?: string
  ): Promise<PriceHistoryDto[]> {
    // since 파라미터가 있으면 해당 시간 이후, 없으면 20분 전부터
    const since = sinceParam 
      ? new Date(sinceParam)
      : new Date(Date.now() - 20 * 60 * 1000);
    
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

    // prices 테이블에 데이터가 없거나 부족한 경우, 현재 주가를 포함하여 반환
    const team = await this.teamRepo.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException("팀을 찾을 수 없습니다.");
    }

    const now = new Date();
    const result: PriceHistoryDto[] = [...prices];

    // 현재 주가가 있고, 마지막 히스토리와 시간 차이가 있으면 현재 주가 추가
    if (team.p && team.p > 0) {
      const lastPrice = prices.length > 0 ? prices[prices.length - 1] : null;
      const shouldAddCurrentPrice = !lastPrice || 
        (now.getTime() - new Date(lastPrice.tickTs).getTime()) > 5000; // 5초 이상 차이나면 추가
      
      if (shouldAddCurrentPrice) {
        result.push({
          price: team.p,
          tickTs: now,
        });
      }
    }

    return result;
  }
}

