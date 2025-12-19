-- =====================================================
-- 대회 시작 전 주가 데이터 초기화 SQL
-- 모든 투자 데이터와 주가를 초기 상태로 리셋
-- =====================================================

-- 1. 투자 거래 이력 삭제
DELETE FROM investment_history;

-- 2. 사용자 투자 포트폴리오 삭제
DELETE FROM user_investments;

-- 3. 주가 이력 삭제
DELETE FROM prices;

-- 4. 모든 팀의 주가와 투자금 초기화
--    p: 현재 주가를 1000원으로 초기화
--    p0: 초기 주가를 1000원으로 초기화
--    money: 누적 투자금을 0으로 초기화
UPDATE competition_teams 
SET p = 1000, p0 = 1000, money = 0;

-- 5. 모든 사용자 자산 초기화
--    capital: 보유 현금을 50,000원으로 초기화
--    stock_value: 주식 평가액을 0으로 초기화
--    total_assets: 총 자산을 50,000원으로 초기화
--    roi: 수익률을 0으로 초기화
UPDATE users 
SET capital = 50000, 
    stock_value = 0, 
    total_assets = 50000, 
    roi = 0;

-- =====================================================
-- 확인 쿼리
-- =====================================================

-- 팀별 주가 확인
SELECT id, "teamName", p, p0, money 
FROM competition_teams 
ORDER BY id;

-- 사용자 자산 확인 (상위 5명)
SELECT id, name, capital, stock_value, total_assets, roi 
FROM users 
ORDER BY id 
LIMIT 5;

-- 주가 이력 개수 확인 (0이어야 함)
SELECT COUNT(*) as price_count FROM prices;

-- 투자 이력 개수 확인 (0이어야 함)
SELECT COUNT(*) as investment_history_count FROM investment_history;

-- 사용자 투자 포트폴리오 개수 확인 (0이어야 함)
SELECT COUNT(*) as user_investments_count FROM user_investments;

