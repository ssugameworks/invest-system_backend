-- =====================================================
-- 투자 기록 데이터 삭제 스크립트
-- ⚠️ 주의: users와 competition_teams 테이블은 절대 삭제하지 않습니다!
-- =====================================================

-- 1. 투자 기록 테이블 데이터 삭제
TRUNCATE TABLE investment_history CASCADE;
TRUNCATE TABLE user_investments CASCADE;

-- 2. users 테이블의 투자 관련 컬럼 초기화
-- total_assets와 stock_value를 0으로 리셋
-- capital은 초기 자본(45000)으로 복원 (필요시 조정)
UPDATE users 
SET 
  total_assets = 0,
  stock_value = 0,
  capital = 45000  -- 초기 자본으로 복원 (필요에 따라 변경 가능)
WHERE total_assets > 0 OR stock_value > 0;

-- 3. competition_teams 테이블의 투자금 초기화
-- 각 팀의 money를 0으로 리셋
UPDATE competition_teams 
SET money = 0
WHERE money > 0;

-- 4. 삭제 확인 쿼리
SELECT 
  'investment_history' as table_name,
  COUNT(*) as remaining_records
FROM investment_history
UNION ALL
SELECT 
  'user_investments' as table_name,
  COUNT(*) as remaining_records
FROM user_investments;

-- 5. users 테이블 확인
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN total_assets > 0 THEN 1 ELSE 0 END) as users_with_assets,
  SUM(CASE WHEN stock_value > 0 THEN 1 ELSE 0 END) as users_with_stocks
FROM users;

-- 6. competition_teams 테이블 확인
SELECT 
  id,
  "teamName",
  money,
  p,
  p0
FROM competition_teams
ORDER BY id;

