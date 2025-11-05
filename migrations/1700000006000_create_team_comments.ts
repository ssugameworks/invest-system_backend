import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTeamComments1700000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS team_comments (
        id SERIAL PRIMARY KEY,
        team_id int NOT NULL,
        author_id int NOT NULL,
        body text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Composite index for efficient pagination by team and created_at
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = 'idx_team_comments_team_id_created_at' AND n.nspname = current_schema()
        ) THEN
          CREATE INDEX idx_team_comments_team_id_created_at ON team_comments (team_id, created_at DESC, id DESC);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_team_comments_team_id_created_at;
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS team_comments;
    `);
  }
}
