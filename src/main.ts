import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  // 허용할 origin 목록
  const defaultOrigins = ['https://invest.gameworks.app', 'https://gameworks-flow-v1.vercel.app', 'http://localhost:3000'];
  
  let allowedOrigins: string[] = [];
  
  // FRONTEND_URL 환경변수가 있으면 쉼표로 구분된 URL들을 파싱
  if (process.env.FRONTEND_URL) {
    allowedOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim()).filter(url => url.length > 0);
  }
  
  // FRONTEND_URL_1, FRONTEND_URL_2 같은 형태의 환경변수도 지원
  let index = 1;
  while (process.env[`FRONTEND_URL_${index}`]) {
    const url = process.env[`FRONTEND_URL_${index}`]?.trim();
    if (url && !allowedOrigins.includes(url)) {
      allowedOrigins.push(url);
    }
    index++;
  }
  
  // 환경변수가 없거나 비어있으면 기본값 사용
  if (allowedOrigins.length === 0) {
    allowedOrigins = defaultOrigins;
  }
  
  // 허용된 origin 목록 로그 출력
  console.log('Allowed CORS origins:', allowedOrigins);

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: (origin, callback) => {
        // origin이 없거나 (같은 origin 요청, Postman 등) 허용된 origin 목록에 있으면 허용
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
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
