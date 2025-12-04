import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePricingConfig1733000000000 implements MigrationInterface {
  name = "CreatePricingConfig1733000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 가격 설정 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pricing_config (
        id SERIAL PRIMARY KEY,
        key VARCHAR(50) UNIQUE NOT NULL,
        value NUMERIC(18, 6) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )
    `);

    // 기본값 삽입 (환경변수에서 가져오거나 기본값 사용)
    const defaultValues = [
      { key: 'N', value: 50, description: '참가자 수' },
      { key: 'T', value: 6, description: '시간 단위' },
      { key: 'P0', value: 1000, description: '초기 가격' },
      { key: 'C1', value: 5000, description: '자본 1' },
      { key: 'C2', value: 3000, description: '자본 2' },
      { key: 'GAMMA', value: 0.5, description: '압축 계수' },
      { key: 'L1', value: 0.7, description: '라운드1 하한' },
      { key: 'U1', value: 1.5, description: '라운드1 상한' },
      { key: 'L2', value: 0.8, description: '라운드2 하한' },
      { key: 'U2', value: 1.4, description: '라운드2 상한' },
    ];

    for (const item of defaultValues) {
      await queryRunner.query(`
        INSERT INTO pricing_config (key, value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) DO NOTHING
      `, [item.key, item.value, item.description]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pricing_config CASCADE`);
  }
}

