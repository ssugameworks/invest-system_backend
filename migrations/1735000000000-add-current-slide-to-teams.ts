import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCurrentSlideToTeams1735000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "competition_teams",
      new TableColumn({
        name: "currentSlide",
        type: "integer",
        isNullable: true,
        default: 1,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("competition_teams", "currentSlide");
  }
}

