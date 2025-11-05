import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompetitionTeam } from "./entity/team.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CompetitionTeam])],
  exports: [TypeOrmModule],
})
export class TeamsModule {}
