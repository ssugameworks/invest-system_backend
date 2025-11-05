import { Module } from "@nestjs/common";
import { InvestController } from "./invest.controller";
import { InvestService } from "./invest.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/entity/user.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User, CompetitionTeam])],
  controllers: [InvestController],
  providers: [InvestService],
})
export class InvestModule {}
