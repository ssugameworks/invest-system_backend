import { Module } from "@nestjs/common";
import { InvestController } from "./invest.controller";
import { InvestService } from "./invest.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/entity/user.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";
import { UserInvestment } from "../investments/entity/user-investment.entity";
import { InvestmentHistory } from "../investments/entity/investment-history.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      CompetitionTeam,
      UserInvestment,
      InvestmentHistory,
    ]),
  ],
  controllers: [InvestController],
  providers: [InvestService],
})
export class InvestModule {}
