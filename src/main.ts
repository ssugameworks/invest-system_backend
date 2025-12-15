import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
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

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: (origin, callback) => {
        // 프로덕션 환경에서는 origin이 없으면 거부
        const isProduction = process.env.NODE_ENV === 'production';
        
        // origin이 없는 경우 (같은 origin 요청, Postman 등)
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
}

bootstrap();
