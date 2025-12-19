import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersModule } from "./users/user.module";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
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
    ConfigModule.forRoot({ isGlobal: true, load: [pricingConfig] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>("SUPABASE_DB_POOLED_URL") || process.env.SUPABASE_DB_POOLED_URL;
        
        if (!dbUrl) {
          throw new Error("SUPABASE_DB_POOLED_URL environment variable is required");
        }

        return {
          type: "postgres",
          url: dbUrl,
          ssl: { rejectUnauthorized: false },
          autoLoadEntities: true,
          synchronize: false, // ✅ 운영은 false (마이그레이션 사용)
          extra: {
            max: 50, // 피크 시간대 대비 증가 (30 → 50)
            idleTimeoutMillis: 10_000,
            connectionTimeoutMillis: 5_000,
          },
        };
      },
    }),
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
