import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddUsersAccessToken1700000007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "accessToken",
        type: "varchar",
        length: "512",
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "accessToken");
  }
}
