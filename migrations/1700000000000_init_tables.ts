import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from "typeorm";

export class InitTables1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // users
    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          new TableColumn({
            name: "id",
            type: "uuid",
            isPrimary: true,
            isNullable: false,
            default: "gen_random_uuid()",
          }),
          new TableColumn({
            name: "schoolNumber",
            type: "integer",
            isNullable: false,
          }),
          new TableColumn({
            name: "department",
            type: "varchar",
            length: "60",
            isNullable: true,
          }),
          new TableColumn({
            name: "capital",
            type: "integer",
            isNullable: true,
          }),
          new TableColumn({
            name: "roi",
            type: "integer",
            isNullable: true,
          }),
          new TableColumn({
            name: "rank",
            type: "integer",
            isNullable: true,
          }),
          new TableColumn({
            name: "created_at",
            type: "timestamptz",
            isNullable: false,
            default: "now()",
          }),
          new TableColumn({
            name: "updated_at",
            type: "timestamptz",
            isNullable: false,
            default: "now()",
          }),
        ],
      })
    );

    await queryRunner.createIndex(
      "users",
      new TableIndex({
        name: "idx_users_school_number",
        columnNames: ["schoolNumber"],
      })
    );

    // competition_teams
    await queryRunner.createTable(
      new Table({
        name: "competition_teams",
        columns: [
          new TableColumn({
            name: "id",
            type: "integer",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
            isNullable: false,
          }),
          new TableColumn({
            name: "teamName",
            type: "varchar",
            isNullable: false,
          }),
          new TableColumn({
            name: "members",
            type: "jsonb",
            isNullable: true,
          }),
          new TableColumn({
            name: "status",
            type: "varchar",
            length: "16",
            isNullable: false,
            default: "'upcoming'",
          }),
          new TableColumn({
            name: "pitch_url",
            type: "varchar",
            length: "255",
            isNullable: true,
          }),
          new TableColumn({
            name: "created_at",
            type: "timestamptz",
            isNullable: false,
            default: "now()",
          }),
          new TableColumn({
            name: "updated_at",
            type: "timestamptz",
            isNullable: false,
            default: "now()",
          }),
        ],
      })
    );

    await queryRunner.createIndex(
      "competition_teams",
      new TableIndex({
        name: "idx_competition_teams_status",
        columnNames: ["status"],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("competition_teams", "idx_competition_teams_status");
    await queryRunner.dropTable("competition_teams");

    await queryRunner.dropIndex("users", "idx_users_school_number");
    await queryRunner.dropTable("users");
  }
}
