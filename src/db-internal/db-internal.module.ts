import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DbInternalController } from "./db-internal.controller";
import { DbInternalService } from "./db-internal.service";
import { PricingModule } from "../pricing/pricing.module";
import { CompetitionTeam } from "../teams/entity/team.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([CompetitionTeam]),
    PricingModule
  ],
  controllers: [DbInternalController],
  providers: [DbInternalService],
})
export class DbInternalModule {}

