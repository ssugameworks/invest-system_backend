import { MigrationInterface, QueryRunner } from "typeorm";

export class UsersIdInteger1700000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsers = await queryRunner.hasTable("users");
    if (hasUsers) {
      // Drop and recreate users with integer id
      await queryRunner.query(`
        DROP TABLE IF EXISTS users CASCADE;
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          schoolNumber integer NOT NULL,
          department varchar(60),
          capital integer,
          roi integer,
          rank integer,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX idx_users_school_number ON users (schoolNumber);
      `);
    } else {
      await queryRunner.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          schoolNumber integer NOT NULL,
          department varchar(60),
          capital integer,
          roi integer,
          rank integer,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX idx_users_school_number ON users (schoolNumber);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to uuid id version
    await queryRunner.query(`
      DROP TABLE IF EXISTS users CASCADE;
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        schoolNumber integer NOT NULL,
        department varchar(60),
        capital integer,
        roi integer,
        rank integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_users_school_number ON users (schoolNumber);
    `);
  }
}
