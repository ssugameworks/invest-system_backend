import "dotenv/config";
import { DataSource } from "typeorm";
import { config } from "dotenv";

config();

export default new DataSource({
  type: "postgres",
  url: process.env.SUPABASE_DB_POOLED_URL, // ⚠️ 일반 포트(5432)로 DDL 수행 권장
  ssl: { rejectUnauthorized: false },
  entities: ["src/**/*.entity.{ts,js}"],
  migrations: ["migrations/*.{ts,js}"],
});
