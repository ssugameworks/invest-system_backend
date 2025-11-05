import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMoneyToCompetitionTeams1730817000000
  implements MigrationInterface
{
  name = "AddMoneyToCompetitionTeams1730817000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "competition_teams" ADD COLUMN IF NOT EXISTS "money" integer DEFAULT 0`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "competition_teams" DROP COLUMN IF EXISTS "money"`
    );
  }
}
