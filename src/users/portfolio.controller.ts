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

      const currentPrice = team.p ?? 1000; // p 기본값 1000
      const shares = Number(inv.shares);
      
      // shares가 0 이하이거나 매우 작은 값(0.0001 이하)인 경우 포트폴리오에서 제외
      if (shares <= 0.0001) {
        continue;
      }
      
      const itemValue = Math.round(shares * currentPrice);
      const profit_loss = itemValue - inv.invested_amount;
      
      // ROI 계산: 평균 매수가(average_price) 기준으로 계산
      // 현재 가격이 평균가보다 높으면 플러스, 낮으면 마이너스
      const averagePrice = inv.average_price ?? 0;
      const profit_rate =
        averagePrice > 0
          ? ((currentPrice - averagePrice) / averagePrice) * 100
          : (inv.invested_amount > 0
            ? (profit_loss / inv.invested_amount) * 100
            : 0);

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
      // 투자 내역이 없으면 초기 주가 1000원 기준으로 ROI 계산
      const team = await this.teamRepo.findOne({ where: { id: teamId } });
      const currentPrice = team?.p ?? 1000; // p 기본값 1000
      const INITIAL_PRICE = 1000;
      // 초기 주가 대비 현재 주가 변동률 계산
      const profit_rate = ((currentPrice - INITIAL_PRICE) / INITIAL_PRICE) * 100;
      
      return {
        team_id: teamId,
        team_name: team?.teamName || "Unknown",
        shares: 0,
        invested_amount: 0,
        average_price: 0,
        current_price: currentPrice,
        current_value: 0,
        amount: 0, // 매도 시 사용
        profit_loss: 0,
        profit_rate,
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

    const currentPrice = team.p ?? 1000; // p 기본값 1000
    const shares = Number(investment.shares);
    const current_value = Math.round(shares * currentPrice);
    const profit_loss = current_value - investment.invested_amount;
    
    // ROI 계산: 평균 매수가(average_price) 기준으로 계산
    // 현재 가격이 평균가보다 높으면 플러스, 낮으면 마이너스
    const averagePrice = investment.average_price ?? 0;
    let profit_rate = 0;
    
    if (averagePrice > 0) {
      // 평균 매수가가 있으면 평균가 기준으로 계산
      profit_rate = ((currentPrice - averagePrice) / averagePrice) * 100;
    } else if (investment.invested_amount > 0 && shares > 0) {
      // 평균 매수가가 없지만 투자 금액이 있으면 손익 기준으로 계산
      profit_rate = (profit_loss / investment.invested_amount) * 100;
    } else {
      // 투자 내역이 없거나 초기 상태면 초기 주가 1000원 기준으로 계산
      const INITIAL_PRICE = 1000;
      profit_rate = ((currentPrice - INITIAL_PRICE) / INITIAL_PRICE) * 100;
    }

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

