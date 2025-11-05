import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PricingService } from "./pricing.service";
import { PricingController } from "./pricing.controller";
import { CompetitionTeam } from "../teams/entity/team.entity";
import { Price } from "../prices/entity/price.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CompetitionTeam, Price])],
  controllers: [PricingController],
  providers: [PricingService],
})
export class PricingModule {}
