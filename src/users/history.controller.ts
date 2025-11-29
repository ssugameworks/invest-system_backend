import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entity/user.entity";
import { InvestmentHistory } from "../investments/entity/investment-history.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";
import { AuthHeaderGuard } from "../guards/auth-header.guard";

interface InvestmentHistoryDto {
  id: number;
  team_id: number;
  team_name: string;
  type: "buy" | "sell";
  amount: number;
  price: number;
  shares: number;
  created_at: Date;
}

@ApiTags("User")
@Controller("api/user")
export class InvestmentHistoryController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(InvestmentHistory)
    private readonly historyRepo: Repository<InvestmentHistory>,
    @InjectRepository(CompetitionTeam)
    private readonly teamRepo: Repository<CompetitionTeam>
  ) {}

  private extractToken(authorization?: string): string {
    if (!authorization || typeof authorization !== "string") {
      throw new UnauthorizedException("Missing Authorization header");
    }
    if (!authorization.startsWith("Bearer ")) {
      throw new UnauthorizedException(
        "Authorization header must be Bearer token"
      );
    }
    const token = authorization.substring("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedException("Empty Bearer token");
    }
    return token;
  }

  @Get("history")
  @UseGuards(AuthHeaderGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "내 투자 히스토리 조회" })
  @ApiQuery({
    name: "limit",
    required: false,
    schema: { default: 20 },
    description: "조회할 히스토리 수",
  })
  @ApiOkResponse({
    description: "투자 히스토리",
  })
  async getHistory(
    @Req() req: any,
    @Query("limit") limitRaw?: string
  ): Promise<InvestmentHistoryDto[]> {
    const authorization =
      req?.headers?.authorization ?? req?.headers?.Authorization;
    const token = this.extractToken(authorization);

    const user = await this.userRepo.findOne({ where: { accessToken: token } });
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    const limit = Math.min(100, Math.max(1, Number(limitRaw ?? 20)));

    const history = await this.historyRepo.find({
      where: { user_id: user.id },
      order: { created_at: "DESC" },
      take: limit,
    });

    const result: InvestmentHistoryDto[] = [];

    for (const h of history) {
      const team = await this.teamRepo.findOne({ where: { id: h.team_id } });
      result.push({
        id: h.id,
        team_id: h.team_id,
        team_name: team?.teamName ?? "알 수 없는 팀",
        type: h.type,
        amount: h.amount,
        price: h.price,
        shares: Number(h.shares),
        created_at: h.created_at,
      });
    }

    return result;
  }
}

