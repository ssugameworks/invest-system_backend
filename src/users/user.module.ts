import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { LeaderboardController } from "./leaderboard.controller";
import { UserService } from "./user.service";
import { AuthHeaderGuard } from "../guards/auth-header.guard";
import { User } from "./entity/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController, LeaderboardController],
  providers: [UserService, AuthHeaderGuard],
  exports: [TypeOrmModule],
})
export class UsersModule {}
