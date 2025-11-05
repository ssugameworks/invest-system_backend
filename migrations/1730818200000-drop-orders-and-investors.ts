import { MigrationInterface, QueryRunner } from "typeorm";

export class DropOrdersAndInvestors1730818200000 implements MigrationInterface {
  name = "DropOrdersAndInvestors1730818200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS orders CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS investors CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate tables in a minimal form for rollback safety
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS investors (
        id SERIAL PRIMARY KEY,
        external_id VARCHAR(120) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id integer NOT NULL REFERENCES competition_teams(id) ON DELETE CASCADE,
        round SMALLINT NOT NULL,
        amount integer NOT NULL,
        exec_price integer NOT NULL,
        shares numeric(18,6) NOT NULL,
        idempotency_key VARCHAR(120) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )
    `);
  }
}
