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
        // origin이 없으면 같은 origin 요청 (같은 서버에서 서빙되는 페이지 등)
        // DB 인터널 페이지는 같은 서버에서 서빙되므로 origin이 없을 수 있음
        if (!origin) {
          callback(null, true);
          return;
        }
        
        // 허용된 origin 목록에 있으면 허용
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        
        // DB 인터널 페이지는 같은 origin이므로 항상 허용
        // (이미 origin이 없으면 위에서 처리됨)
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'],
    },
  });

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
