import { MigrationInterface, QueryRunner } from "typeorm";

export class Round2CoreSchema1730817600000 implements MigrationInterface {
  name = "Round2CoreSchema1730817600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "orders" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "team_id" integer NOT NULL REFERENCES competition_teams(id) ON DELETE CASCADE,
        "round" SMALLINT NOT NULL,
        "amount" integer NOT NULL,
        "exec_price" integer NOT NULL,
        "shares" numeric(18,6) NOT NULL,
        "idempotency_key" VARCHAR(120) UNIQUE NOT NULL,
        "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL
      )`
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "prices" (
        "id" SERIAL PRIMARY KEY,
        "team_id" integer NOT NULL REFERENCES competition_teams(id) ON DELETE CASCADE,
        "round" SMALLINT NOT NULL,
        "price" integer NOT NULL,
        "tick_ts" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
        UNIQUE(team_id, round, tick_ts)
      )`
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_prices_team_tick ON prices(team_id, tick_ts)`
    );

    await queryRunner.query(
      `ALTER TABLE competition_teams
        ADD COLUMN IF NOT EXISTS p integer NULL,
        ADD COLUMN IF NOT EXISTS p0 integer DEFAULT 1000,
        ADD COLUMN IF NOT EXISTS p1 integer NULL,
        ADD COLUMN IF NOT EXISTS p2 integer NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE competition_teams
        DROP COLUMN IF EXISTS p2,
        DROP COLUMN IF EXISTS p1,
        DROP COLUMN IF EXISTS p0`
    );

    await queryRunner.query(`DROP INDEX IF EXISTS idx_prices_team_tick`);
    await queryRunner.query(`DROP TABLE IF EXISTS prices`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders`);
  }
}
