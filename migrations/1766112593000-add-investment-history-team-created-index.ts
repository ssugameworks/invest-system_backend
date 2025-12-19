import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvestmentHistoryTeamCreatedIndex1766112593000
  implements MigrationInterface
{
  name = "AddInvestmentHistoryTeamCreatedIndex1766112593000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // investment_history 테이블에 team_id + created_at 복합 인덱스 추가
    // 가격 계산 쿼리 성능 향상을 위해 필수
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_investment_history_team_created 
      ON investment_history(team_id, created_at DESC)
    `);
    
    // type 컬럼도 함께 인덱스에 포함하여 더 빠른 필터링
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_investment_history_team_type_created 
      ON investment_history(team_id, type, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_investment_history_team_type_created
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_investment_history_team_created
    `);
  }
}

