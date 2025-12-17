import { Controller, Get, Param, ParseIntPipe, Query, NotFoundException, Res, Patch, Body, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiBody } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import { CompetitionTeam, TeamStatus } from "./entity/team.entity";
import { Price } from "../prices/entity/price.entity";
import type { Response } from "express";
import axios from "axios";

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

  @Get("ongoing")
  @ApiOperation({ summary: "현재 발표 중인 팀 조회" })
  @ApiOkResponse({
    description: "발표 중인 팀",
    type: CompetitionTeam,
  })
  async getOngoingTeam(): Promise<CompetitionTeam | null> {
    const team = await this.teamRepo.findOne({
      where: { status: "ongoing" },
      order: { updated_at: "DESC" },
    });
    return team;
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

  @Get(":id/pitch")
  @ApiOperation({ summary: "특정 팀 피치 자료 PDF 프록시" })
  @ApiParam({ name: "id", type: Number, example: 1 })
  async getTeamPitch(
    @Param("id", ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const team = await this.teamRepo.findOne({ where: { id } });
    if (!team || !team.pitch_url) {
      throw new NotFoundException("피치 자료가 없습니다.");
    }

    try {
      const upstream = await axios.get(team.pitch_url, {
        responseType: "stream",
      });

      res.setHeader("Content-Type", upstream.headers["content-type"] || "application/pdf");
      if (upstream.headers["content-length"]) {
        res.setHeader("Content-Length", upstream.headers["content-length"]);
      }

      upstream.data.pipe(res);
    } catch (error) {
      throw new NotFoundException("피치 자료를 불러오는 데 실패했습니다.");
    }
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

  @Patch(":id/status")
  @ApiOperation({ summary: "팀 상태 업데이트 (인터널용)" })
  @ApiParam({ name: "id", type: Number, example: 1 })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["upcoming", "ongoing", "ended"],
        },
      },
    },
  })
  @ApiOkResponse({
    description: "업데이트된 팀 정보",
    type: CompetitionTeam,
  })
  async updateTeamStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("status") status: TeamStatus
  ): Promise<CompetitionTeam> {
    const team = await this.teamRepo.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException("팀을 찾을 수 없습니다.");
    }

    // ongoing으로 변경할 때, 다른 팀들의 상태를 ended로 변경
    if (status === "ongoing") {
      await this.teamRepo.update(
        { status: "ongoing" },
        { status: "ended" }
      );
    }

    team.status = status;
    return await this.teamRepo.save(team);
  }

  @Get(":id/current-slide")
  @ApiOperation({ summary: "현재 슬라이드 번호 조회" })
  @ApiParam({ name: "id", type: Number, example: 1 })
  @ApiOkResponse({
    description: "현재 슬라이드 번호",
    schema: {
      type: "object",
      properties: {
        currentSlide: { type: "number" },
      },
    },
  })
  async getCurrentSlide(@Param("id", ParseIntPipe) id: number): Promise<{ currentSlide: number }> {
    const team = await this.teamRepo.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException("팀을 찾을 수 없습니다.");
    }
    return { currentSlide: team.currentSlide || 1 };
  }

  @Post(":id/current-slide")
  @ApiOperation({ summary: "현재 슬라이드 번호 업데이트 (인터널용)" })
  @ApiParam({ name: "id", type: Number, example: 1 })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        currentSlide: { type: "number" },
      },
    },
  })
  @ApiOkResponse({
    description: "업데이트된 슬라이드 번호",
    schema: {
      type: "object",
      properties: {
        currentSlide: { type: "number" },
      },
    },
  })
  async updateCurrentSlide(
    @Param("id", ParseIntPipe) id: number,
    @Body("currentSlide") currentSlide: number
  ): Promise<{ currentSlide: number }> {
    const team = await this.teamRepo.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException("팀을 찾을 수 없습니다.");
    }
    team.currentSlide = currentSlide;
    await this.teamRepo.save(team);
    return { currentSlide };
  }
}

