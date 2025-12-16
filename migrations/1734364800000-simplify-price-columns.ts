import { MigrationInterface, QueryRunner } from "typeorm";

export class SimplifyPriceColumns1734364800000 implements MigrationInterface {
  name = "SimplifyPriceColumns1734364800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 모든 팀의 p를 700으로 초기화
    await queryRunner.query(
      `UPDATE competition_teams SET p = 700`
    );
    
    // 2. p0, p1, p2 컬럼 제거
    await queryRunner.query(
      `ALTER TABLE competition_teams DROP COLUMN IF EXISTS p0`
    );
    await queryRunner.query(
      `ALTER TABLE competition_teams DROP COLUMN IF EXISTS p1`
    );
    await queryRunner.query(
      `ALTER TABLE competition_teams DROP COLUMN IF EXISTS p2`
    );
    
    // 3. p 컬럼의 기본값을 700으로 설정
    await queryRunner.query(
      `ALTER TABLE competition_teams ALTER COLUMN p SET DEFAULT 700`
    );
    
    // 4. p 컬럼을 NOT NULL로 변경
    await queryRunner.query(
      `ALTER TABLE competition_teams ALTER COLUMN p SET NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // p0, p1, p2 컬럼 복원
    await queryRunner.query(
      `ALTER TABLE competition_teams ADD COLUMN IF NOT EXISTS p0 integer DEFAULT 1000`
    );
    await queryRunner.query(
      `ALTER TABLE competition_teams ADD COLUMN IF NOT EXISTS p1 integer NULL`
    );
    await queryRunner.query(
      `ALTER TABLE competition_teams ADD COLUMN IF NOT EXISTS p2 integer NULL`
    );
    
    // p 컬럼을 nullable로 변경
    await queryRunner.query(
      `ALTER TABLE competition_teams ALTER COLUMN p DROP NOT NULL`
    );
  }
}

