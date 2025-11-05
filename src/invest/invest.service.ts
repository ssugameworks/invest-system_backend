import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InvestRequestDto } from "./dto/invest-request.dto";
import { InvestResponseDto } from "./dto/invest-response.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/entity/user.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";

@Injectable()
export class InvestService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
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

  async invest(
    body: InvestRequestDto,
    authorization?: string
  ): Promise<InvestResponseDto> {
    const token = this.extractToken(authorization);

    const user = await this.userRepo.findOne({ where: { accessToken: token } });
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    const currentCapital = user.capital ?? 0;
    if (currentCapital < body.amount) {
      throw new BadRequestException("보유 자본이 부족합니다.");
    }

    user.capital = currentCapital - body.amount;
    await this.userRepo.save(user);

    const team = await this.teamRepo.findOne({ where: { id: body.teamId } });
    if (!team) {
      throw new BadRequestException("유효하지 않은 팀입니다.");
    }
    const currentMoney = team.money ?? 0;
    team.money = currentMoney + body.amount;
    await this.teamRepo.save(team);

    return {
      amount: body.amount,
      status: "success",
      message: "투자가 완료되었습니다.",
    };
  }
}
