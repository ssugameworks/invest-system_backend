import { Module } from "@nestjs/common";
import { InvestController } from "./invest.controller";
import { InvestService } from "./invest.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/entity/user.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";
import { UserInvestment } from "../investments/entity/user-investment.entity";
import { InvestmentHistory } from "../investments/entity/investment-history.entity";
import { DbInternalService } from "../db-internal/db-internal.service";

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
  providers: [InvestService, DbInternalService],
})
export class InvestModule {}
