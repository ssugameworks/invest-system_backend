import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersModule } from "./users/user.module";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule } from "@nestjs/config";
import { InjectDataSource, TypeOrmModule } from "@nestjs/typeorm";
import { CommentsModule } from "./comments/comments.module";
import { DataSource } from "typeorm";
import pricingConfig from "./config/pricing.config";
import { PricingModule } from "./pricing/pricing.module";
import { InvestModule } from "./invest/invest.module";
import { TeamsModule } from "./teams/team.module";
import { DbInternalModule } from "./db-internal/db-internal.module";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.SUPABASE_DB_POOLED_URL, // ✅ pooled 연결 권장
      ssl: { rejectUnauthorized: false },
      autoLoadEntities: true,
      synchronize: false, // ✅ 운영은 false (마이그레이션 사용)
      extra: {
        max: 30, // 권장: 20~50
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 5_000,
      },
    }),
    ConfigModule.forRoot({ isGlobal: true, load: [pricingConfig] }),
    UsersModule,
    AuthModule,
    CommentsModule,
    InvestModule,
    PricingModule,
    TeamsModule,
    DbInternalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
