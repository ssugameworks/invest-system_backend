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
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['https://invest.gameworks.app', 'https://gameworks-flow-v1.vercel.app', 'http://localhost:3000'];

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      cors: {
        origin: (origin, callback) => {
          // 프로덕션 환경에서는 origin이 없으면 거부
          const isProduction = process.env.NODE_ENV === 'production';
          
          // origin이 없는 경우
          if (!origin) {
            // 프로덕션에서는 거부, 개발 환경에서만 허용
            if (isProduction) {
              callback(new Error('CORS: Origin is required in production'));
              return;
            }
            callback(null, true);
            return;
          }
          
          // 허용된 origin 목록에 있으면 허용
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
          }
          
          // 허용되지 않은 origin은 거부
          callback(new Error('CORS: Not allowed by CORS policy'));
        },
        credentials: true,
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
