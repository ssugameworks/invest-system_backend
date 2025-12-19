import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIdempotencyKeyToInvestmentHistory1736000000000 implements MigrationInterface {
  name = "AddIdempotencyKeyToInvestmentHistory1736000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // idempotency_key 컬럼 추가 (nullable, unique)
    await queryRunner.query(`
      ALTER TABLE investment_history
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) NULL
    `);

    // unique 인덱스 생성 (NULL 값은 허용)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_history_idempotency_key
      ON investment_history(idempotency_key)
      WHERE idempotency_key IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 인덱스 삭제
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_investment_history_idempotency_key
    `);

    // 컬럼 삭제
    await queryRunner.query(`
      ALTER TABLE investment_history
      DROP COLUMN IF EXISTS idempotency_key
    `);
  }
}
