-- 모든 투자 데이터 초기화 (정확한 테이블 이름 사용!)
DELETE FROM investment_history;
DELETE FROM user_investments;  -- ⭐ 복수형!

-- ⭐ prices 테이블도 삭제 (중요!)
DELETE FROM prices;

-- ⭐⭐ 모든 팀 주가와 투자금 초기화 (p0도 700으로 변경!)
UPDATE competition_teams SET p = 700, p0 = 700, money = 0;

-- 모든 사용자 자본 초기화 (초기 자본 45,000원)
UPDATE users SET capital = 45000, stock_value = 0, total_assets = 45000, roi = 0;

-- 확인
SELECT id, "teamName", p, p0, money FROM competition_teams;
SELECT id, name, capital, stock_value, total_assets FROM users LIMIT 5;
SELECT COUNT(*) as price_count FROM prices;

