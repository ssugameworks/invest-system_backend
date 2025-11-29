import { Controller, Get, Param, ParseIntPipe, NotFoundException } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompetitionTeam } from "./entity/team.entity";

@ApiTags("Teams")
@Controller("api/teams")
export class TeamController {
  constructor(
    @InjectRepository(CompetitionTeam)
    private readonly teamRepo: Repository<CompetitionTeam>
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
}

