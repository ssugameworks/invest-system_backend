import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { ExpressAdapter } from "@nestjs/platform-express";
import express from "express";
import { Request, Response } from "express";

let cachedApp: express.Application;

async function createApp() {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  // 허용할 origin 목록
  const defaultOrigins = [
    'https://invest.gameworks.app', 
    'https://gameworks-flow-v1.vercel.app', 
    'http://localhost:3000',
    'https://invest-systembackend-production.up.railway.app'
  ];
  
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

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      cors: {
        origin: (origin, callback) => {
          const isProduction = process.env.NODE_ENV === 'production';
          
          // origin이 없는 경우 (같은 origin 요청, 서버간 통신, 헬스체크 등)
          // 브라우저가 아닌 요청은 origin이 없을 수 있으므로 허용
          // db-internal 페이지는 같은 서버에서 서빙되므로 같은 origin 요청
          if (!origin) {
            // 로깅만 하고 허용 (헬스체크, 모니터링, 같은 origin 요청 등을 위해)
            if (isProduction) {
              console.log('⚠️  Origin 없는 요청 접수 (같은 origin 요청/헬스체크/모니터링 가능)');
            }
            callback(null, true);
            return;
          }
          
          // 개발 환경에서는 localhost의 모든 포트 허용 (localhost, 127.0.0.1)
          if (!isProduction) {
            const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
            if (localhostRegex.test(origin)) {
              callback(null, true);
              return;
            }
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
    }
  );

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
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  await app.init();
  cachedApp = expressApp;
  return cachedApp;
}

export default async function handler(req: Request, res: Response) {
  const app = await createApp();
  return app(req, res);
}
