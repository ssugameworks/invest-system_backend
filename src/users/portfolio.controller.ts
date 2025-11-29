import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entity/user.entity";
import { UserInvestment } from "../investments/entity/user-investment.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";
import { AuthHeaderGuard } from "../guards/auth-header.guard";

interface PortfolioItemDto {
  team_id: number;
  team_name: string;
  shares: number;
  invested_amount: number;
  average_price: number;
  current_price: number;
  current_value: number;
  profit_loss: number;
  profit_rate: number;
}

interface PortfolioSummaryDto {
  total_invested: number;
  current_value: number;
  profit_loss: number;
  roi: number;
  items: PortfolioItemDto[];
}

@ApiTags("User")
@Controller("api/user")
export class PortfolioController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserInvestment)
    private readonly investmentRepo: Repository<UserInvestment>,
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

  @Get("portfolio")
  @UseGuards(AuthHeaderGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "내 포트폴리오 조회" })
  @ApiOkResponse({
    description: "포트폴리오 정보",
  })
  async getPortfolio(@Req() req: any): Promise<PortfolioSummaryDto> {
    const authorization =
      req?.headers?.authorization ?? req?.headers?.Authorization;
    const token = this.extractToken(authorization);

    const user = await this.userRepo.findOne({ where: { accessToken: token } });
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    // 사용자의 모든 투자 가져오기
    const investments = await this.investmentRepo.find({
      where: { user_id: user.id },
    });

    const items: PortfolioItemDto[] = [];
    let total_invested = 0;
    let current_value = 0;

    for (const inv of investments) {
      const team = await this.teamRepo.findOne({ where: { id: inv.team_id } });
      if (!team) continue;

      const currentPrice = team.p ?? team.p0 ?? 0;
      const shares = Number(inv.shares);
      const itemValue = Math.round(shares * currentPrice);
      const profit_loss = itemValue - inv.invested_amount;
      const profit_rate =
        inv.invested_amount > 0
          ? (profit_loss / inv.invested_amount) * 100
          : 0;

      items.push({
        team_id: inv.team_id,
        team_name: team.teamName,
        shares,
        invested_amount: inv.invested_amount,
        average_price: inv.average_price,
        current_price: currentPrice,
        current_value: itemValue,
        profit_loss,
        profit_rate,
      });

      total_invested += inv.invested_amount;
      current_value += itemValue;
    }

    const profit_loss = current_value - total_invested;
    const roi = total_invested > 0 ? (profit_loss / total_invested) * 100 : 0;

    return {
      total_invested,
      current_value,
      profit_loss,
      roi,
      items,
    };
  }

  @Get("portfolio/:teamId")
  @UseGuards(AuthHeaderGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "특정 팀의 보유 주식 조회" })
  @ApiParam({ name: "teamId", description: "팀 ID" })
  @ApiOkResponse({
    description: "보유 주식 정보 (amount = 주식 평가액)",
    schema: {
      properties: {
        team_id: { type: "number" },
        team_name: { type: "string" },
        shares: { type: "number", description: "보유 주식 수" },
        invested_amount: {
          type: "number",
          description: "투자 원금 (매수 시 사용한 금액)",
        },
        average_price: {
          type: "number",
          description: "평균 매수 단가",
        },
        current_price: {
          type: "number",
          description: "현재 주가",
        },
        current_value: {
          type: "number",
          description: "현재 평가액 (= shares * current_price)",
        },
        amount: {
          type: "number",
          description: "현재 평가액 (current_value와 동일, 매도 시 사용)",
        },
        profit_loss: {
          type: "number",
          description: "평가 손익",
        },
        profit_rate: {
          type: "number",
          description: "수익률 (%)",
        },
      },
    },
  })
  async getTeamInvestment(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Req() req: any
  ): Promise<any> {
    const authorization =
      req?.headers?.authorization ?? req?.headers?.Authorization;
    const token = this.extractToken(authorization);

    const user = await this.userRepo.findOne({ where: { accessToken: token } });
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    // 특정 팀의 투자 가져오기
    const investment = await this.investmentRepo.findOne({
      where: { user_id: user.id, team_id: teamId },
    });

    if (!investment) {
      // 투자 내역이 없으면 0 반환
      const team = await this.teamRepo.findOne({ where: { id: teamId } });
      return {
        team_id: teamId,
        team_name: team?.teamName || "Unknown",
        shares: 0,
        invested_amount: 0,
        average_price: 0,
        current_price: team?.p ?? team?.p0 ?? 0,
        current_value: 0,
        amount: 0, // 매도 시 사용
        profit_loss: 0,
        profit_rate: 0,
      };
    }

    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      return {
        team_id: teamId,
        team_name: "Unknown",
        shares: 0,
        invested_amount: 0,
        average_price: 0,
        current_price: 0,
        current_value: 0,
        amount: 0,
        profit_loss: 0,
        profit_rate: 0,
      };
    }

    const currentPrice = team.p ?? team.p0 ?? 0;
    const shares = Number(investment.shares);
    const current_value = Math.round(shares * currentPrice);
    const profit_loss = current_value - investment.invested_amount;
    const profit_rate =
      investment.invested_amount > 0
        ? (profit_loss / investment.invested_amount) * 100
        : 0;

    return {
      team_id: teamId,
      team_name: team.teamName,
      shares,
      invested_amount: investment.invested_amount,
      average_price: investment.average_price,
      current_price: currentPrice,
      current_value,
      amount: current_value, // 매도 시 사용할 총 금액
      profit_loss,
      profit_rate,
    };
  }
}

