-- =====================================================
-- 주가 및 개인투자자 투자금 리셋 SQL
-- 주가를 초기값으로 리셋하고 모든 투자 데이터를 초기화합니다.
-- =====================================================

BEGIN;

-- 1. 투자 기록 삭제
DELETE FROM investment_history;

-- 2. 개인 투자 포트폴리오 삭제
DELETE FROM user_investments;

-- 3. 주가 히스토리 삭제
DELETE FROM prices;

-- 4. 모든 팀의 주가 및 투자금 초기화
-- 주가를 초기값(P0)으로 리셋 (기본값: 1000원, 필요시 700원으로 변경 가능)
UPDATE competition_teams 
SET 
  p = 1000,        -- 현재 주가를 초기 주가로 리셋
  p0 = 1000,       -- 초기 주가
  p1 = NULL,       -- 라운드1 주가 초기화 (필요시)
  p2 = NULL,       -- 라운드2 주가 초기화 (필요시)
  money = 0;       -- 투자금 초기화

-- 5. 모든 사용자 자본 및 투자 관련 데이터 초기화
-- 초기 자본: 50,000원 (총 투자 시드 500만원 / 100명)
UPDATE users 
SET 
  capital = 50000,        -- 보유 현금을 초기 자본으로 리셋
  stock_value = 0,        -- 주식 평가액 초기화
  total_assets = 50000,   -- 총 자산 = 보유 현금 (주식 없음)
  roi = 0;                -- 수익률 초기화

-- 확인 쿼리
SELECT 
  '팀 주가 및 투자금' as "구분",
  id, 
  "teamName", 
  p as "현재주가", 
  p0 as "초기주가", 
  money as "투자금"
FROM competition_teams
ORDER BY id;

SELECT 
  '사용자 자본 현황' as "구분",
  id,
  name,
  capital as "보유현금",
  stock_value as "주식평가액",
  total_assets as "총자산",
  roi as "수익률"
FROM users
ORDER BY id
LIMIT 10;

SELECT 
  '데이터 카운트' as "구분",
  (SELECT COUNT(*) FROM user_investments) as "투자포트폴리오",
  (SELECT COUNT(*) FROM investment_history) as "투자기록",
  (SELECT COUNT(*) FROM prices) as "주가히스토리";

COMMIT;

-- =====================================================
-- 참고사항:
-- 1. 주가 초기값을 700원으로 변경하려면 위의 UPDATE 문에서 p = 1000을 p = 700으로 변경
-- 2. 초기 자본을 다른 값으로 변경하려면 capital = 50000을 원하는 값으로 변경
-- 3. 이 SQL은 트랜잭션으로 실행되므로 오류 발생 시 자동 롤백됩니다.
-- =====================================================

