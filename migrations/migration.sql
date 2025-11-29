-- =====================================================
-- 사용자 투자 추적 시스템 마이그레이션
-- Supabase SQL Editor에서 직접 실행
-- =====================================================

-- 1. 사용자별 투자 포트폴리오 테이블 생성
CREATE TABLE IF NOT EXISTS "user_investments" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "team_id" INTEGER NOT NULL REFERENCES competition_teams(id) ON DELETE CASCADE,
  "shares" NUMERIC(18, 6) NOT NULL DEFAULT 0,
  "invested_amount" INTEGER NOT NULL DEFAULT 0,
  "average_price" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, team_id)
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_investments_user_id 
ON user_investments(user_id);

CREATE INDEX IF NOT EXISTS idx_user_investments_team_id 
ON user_investments(team_id);

-- 3. users 테이블에 총 자산 관련 컬럼 추가
ALTER TABLE users
ADD COLUMN IF NOT EXISTS total_assets INTEGER DEFAULT 0;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS stock_value INTEGER DEFAULT 0;

-- 4. 투자 기록 테이블 생성 (히스토리)
CREATE TABLE IF NOT EXISTS "investment_history" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "team_id" INTEGER NOT NULL REFERENCES competition_teams(id) ON DELETE CASCADE,
  "type" VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
  "amount" INTEGER NOT NULL,
  "price" INTEGER NOT NULL,
  "shares" NUMERIC(18, 6) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. 투자 기록 인덱스
CREATE INDEX IF NOT EXISTS idx_investment_history_user_id 
ON investment_history(user_id);

CREATE INDEX IF NOT EXISTS idx_investment_history_created_at 
ON investment_history(created_at DESC);

-- 6. 확인 쿼리
SELECT 'user_investments 테이블 생성 완료' as status;
SELECT 'investment_history 테이블 생성 완료' as status;
SELECT 'users 테이블 업데이트 완료' as status;

-- 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('user_investments', 'investment_history')
ORDER BY table_name;

-- users 테이블 컬럼 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('total_assets', 'stock_value');

