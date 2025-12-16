import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PricingService } from "./pricing.service";
import { PricingController } from "./pricing.controller";
import { CompetitionTeam } from "../teams/entity/team.entity";
import { Price } from "../prices/entity/price.entity";
import { UserInvestment } from "../investments/entity/user-investment.entity";
import { InvestmentHistory } from "../investments/entity/investment-history.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CompetitionTeam, Price, UserInvestment, InvestmentHistory])],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
