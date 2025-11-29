import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserInvestments1732800000000 implements MigrationInterface {
  name = "CreateUserInvestments1732800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 사용자별 투자 포트폴리오 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_investments" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "team_id" INTEGER NOT NULL REFERENCES competition_teams(id) ON DELETE CASCADE,
        "shares" NUMERIC(18, 6) NOT NULL DEFAULT 0,
        "invested_amount" INTEGER NOT NULL DEFAULT 0,
        "average_price" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
        "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
        UNIQUE(user_id, team_id)
      )
    `);

    // 인덱스 생성
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_investments_user_id 
      ON user_investments(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_investments_team_id 
      ON user_investments(team_id)
    `);

    // users 테이블에 총 자산 관련 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS total_assets INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS stock_value INTEGER DEFAULT 0
    `);

    // 투자 기록 테이블 생성 (히스토리)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "investment_history" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "team_id" INTEGER NOT NULL REFERENCES competition_teams(id) ON DELETE CASCADE,
        "type" VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
        "amount" INTEGER NOT NULL,
        "price" INTEGER NOT NULL,
        "shares" NUMERIC(18, 6) NOT NULL,
        "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL
      )
    `);

    // 투자 기록 인덱스
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_investment_history_user_id 
      ON investment_history(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_investment_history_created_at 
      ON investment_history(created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_investment_history_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_investment_history_user_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS investment_history`);

    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS stock_value,
      DROP COLUMN IF EXISTS total_assets
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_investments_team_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_investments_user_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_investments`);
  }
}

