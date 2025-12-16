import "dotenv/config";
import { DataSource } from "typeorm";
import { config } from "dotenv";

// ⚠️ 안전장치: dotenv-cli를 통해 명시적으로 .env.test가 로드된 경우만 사용
// 일반 실행 시에는 항상 기본 .env 파일 사용 (메인 DB 보호)
if (!process.env.SUPABASE_DB_POOLED_URL) {
  // 환경 변수가 설정되지 않았으면 기본 .env 파일만 로드
  // .env.test는 dotenv-cli를 통해서만 로드됨
  config();
}

export default new DataSource({
  type: "postgres",
  url: process.env.SUPABASE_DB_POOLED_URL, // ⚠️ 일반 포트(5432)로 DDL 수행 권장
  ssl: { rejectUnauthorized: false },
  entities: ["src/**/*.entity.{ts,js}"],
  migrations: ["migrations/*.{ts,js}"],
});
