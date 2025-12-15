import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  try {
    // 환경 변수 체크
    if (!process.env.SUPABASE_DB_POOLED_URL) {
      console.error('❌ 환경 변수 SUPABASE_DB_POOLED_URL이 설정되지 않았습니다.');
      process.exit(1);
    }

    console.log('🚀 서버 시작 중...');
    console.log(`📦 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 PORT: ${process.env.PORT || '3001'}`);

    const defaultOrigins = ['https://invest.gameworks.app', 'https://gameworks-flow-v1.vercel.app', 'http://localhost:3000'];
    
    let allowedOrigins: string[] = [];
    
    if (process.env.FRONTEND_URL) {
      allowedOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim()).filter(url => url.length > 0);
    }
    
    let index = 1;
    while (process.env[`FRONTEND_URL_${index}`]) {
      const url = process.env[`FRONTEND_URL_${index}`]?.trim();
      if (url && !allowedOrigins.includes(url)) {
        allowedOrigins.push(url);
      }
      index++;
    }
    
    if (allowedOrigins.length === 0) {
      allowedOrigins = defaultOrigins;
    }

    console.log(`🌐 허용된 CORS Origins: ${allowedOrigins.join(', ')}`);

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      cors: {
        origin: (origin, callback) => {
          const isProduction = process.env.NODE_ENV === 'production';
          
          // origin이 없는 경우 (같은 origin 요청, 서버간 통신, 헬스체크 등)
          // 브라우저가 아닌 요청은 origin이 없을 수 있으므로 허용
          if (!origin) {
            // 로깅만 하고 허용 (헬스체크, 모니터링 등을 위해)
            if (isProduction) {
              console.log('⚠️  Origin 없는 요청 접수 (헬스체크/모니터링 가능)');
            }
            callback(null, true);
            return;
          }
          
          // 허용된 origin 목록에 있으면 허용
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
          }
          
          // 허용되지 않은 origin은 로깅하고 거부
          console.warn(`🚫 CORS 차단: 허용되지 않은 origin - ${origin}`);
          callback(new Error('CORS: Not allowed by CORS policy'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'],
      },
    });

    // 프로덕션 환경에서는 Swagger 비활성화
    const isProduction = process.env.NODE_ENV === 'production';
    const enableSwagger = process.env.ENABLE_SWAGGER === 'true' || !isProduction;
    
    if (enableSwagger) {
      const swaggerConfig = new DocumentBuilder()
        .setTitle("Invest System API")
        .setDescription("API documentation for the Invest System backend")
        .setVersion("1.0.0")
        .addBearerAuth(
          {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Enter access token",
          },
          "bearer"
        )
        .build();
      const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup("api", app, swaggerDocument);
      console.log('📚 Swagger 문서가 /api 경로에서 활성화되었습니다.');
    }

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    const configService = app.get(ConfigService);
    const port = Number(configService.get<string>("PORT", "3001"));
    
    await app.listen(port);
    console.log(`✅ 서버가 포트 ${port}에서 실행 중입니다.`);
    console.log(`📍 Health check: http://localhost:${port}/health`);
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    if (error instanceof Error) {
      console.error('에러 메시지:', error.message);
      console.error('스택 트레이스:', error.stack);
    }
    process.exit(1);
  }
}

bootstrap();
