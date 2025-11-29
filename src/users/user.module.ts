import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { LeaderboardController } from "./leaderboard.controller";
import { PortfolioController } from "./portfolio.controller";
import { InvestmentHistoryController } from "./history.controller";
import { UserDeletionController } from "./user-deletion.controller";
import { UserService } from "./user.service";
import { UserDeletionService } from "./user-deletion.service";
import { AuthHeaderGuard } from "../guards/auth-header.guard";
import { User } from "./entity/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserInvestment } from "../investments/entity/user-investment.entity";
import { InvestmentHistory } from "../investments/entity/investment-history.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserInvestment,
      InvestmentHistory,
      CompetitionTeam,
    ]),
  ],
  controllers: [
    UserController,
    LeaderboardController,
    PortfolioController,
    InvestmentHistoryController,
    UserDeletionController,
  ],
  providers: [UserService, UserDeletionService, AuthHeaderGuard],
  exports: [TypeOrmModule],
})
export class UsersModule {}
