import { MigrationInterface, QueryRunner } from "typeorm";

export class UniqueUsersSchoolnumber1700000005000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = 'idx_users_school_number' AND n.nspname = current_schema()
        ) THEN
          DROP INDEX idx_users_school_number;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = 'uq_users_schoolnumber' AND n.nspname = current_schema()
        ) THEN
          CREATE UNIQUE INDEX uq_users_schoolnumber ON users (schoolnumber);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_users_schoolnumber;`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_school_number ON users (schoolnumber);`
    );
  }
}
