import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DbInternalController } from "./db-internal.controller";
import { DbInternalService } from "./db-internal.service";
import { PricingModule } from "../pricing/pricing.module";
import { UsersModule } from "../users/user.module";
import { CompetitionTeam } from "../teams/entity/team.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([CompetitionTeam]),
    PricingModule,
    UsersModule
  ],
  controllers: [DbInternalController],
  providers: [DbInternalService],
})
export class DbInternalModule {}

