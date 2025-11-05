import { MigrationInterface, QueryRunner } from "typeorm";

export class SetInitialPrice1730818400000 implements MigrationInterface {
  name = "SetInitialPrice1730818400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ensure default 1000 for p0 and p
    await queryRunner.query(
      `ALTER TABLE competition_teams ALTER COLUMN p0 SET DEFAULT 1000`
    );
    await queryRunner.query(
      `ALTER TABLE competition_teams ALTER COLUMN p SET DEFAULT 1000`
    );
    // backfill nulls to 1000
    await queryRunner.query(
      `UPDATE competition_teams SET p0 = 1000 WHERE p0 IS NULL`
    );
    await queryRunner.query(
      `UPDATE competition_teams SET p = 1000 WHERE p IS NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // remove default on p only; keep p0 default for safety
    await queryRunner.query(
      `ALTER TABLE competition_teams ALTER COLUMN p DROP DEFAULT`
    );
  }
}
