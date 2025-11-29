import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompetitionTeam } from "./entity/team.entity";
import { TeamController } from "./team.controller";

@Module({
  imports: [TypeOrmModule.forFeature([CompetitionTeam])],
  controllers: [TeamController],
  exports: [TypeOrmModule],
})
export class TeamsModule {}
