import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserNameUnique1700000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS name varchar(60) NOT NULL;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = 'uq_users_name' AND n.nspname = current_schema()
        ) THEN
          CREATE UNIQUE INDEX uq_users_name ON users (name);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_users_name;
    `);
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS name;
    `);
  }
}
