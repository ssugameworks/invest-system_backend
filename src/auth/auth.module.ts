import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/entity/user.entity";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>("JWT_SECRET");
        const isProduction = process.env.NODE_ENV === 'production';
        
        // 프로덕션 환경에서는 JWT_SECRET 필수
        if (isProduction && !jwtSecret) {
          throw new Error('JWT_SECRET environment variable is required in production');
        }
        
        // 개발 환경에서도 JWT_SECRET이 없으면 경고
        if (!jwtSecret) {
          console.warn('⚠️  WARNING: JWT_SECRET is not set. Using default secret (NOT SECURE FOR PRODUCTION)');
        }
        
        return {
          secret: jwtSecret || "dev-secret",
          signOptions: {
            expiresIn: configService.get<string>("JWT_EXPIRES_IN", "1h"),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
