import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DbInternalController } from "./db-internal.controller";
import { DbInternalService } from "./db-internal.service";
import { PricingModule } from "../pricing/pricing.module";

@Module({
  imports: [TypeOrmModule, PricingModule],
  controllers: [DbInternalController],
  providers: [DbInternalService],
})
export class DbInternalModule {}

