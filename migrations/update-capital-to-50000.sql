-- =====================================================
-- 초기 자본금을 45,000원에서 50,000원으로 업데이트
-- =====================================================

-- 1. 모든 사용자의 capital에 5,000원 추가
UPDATE users 
SET capital = capital + 5000
WHERE capital IS NOT NULL;

-- 2. total_assets 재계산 (capital + stock_value)
UPDATE users 
SET total_assets = COALESCE(capital, 0) + COALESCE(stock_value, 0)
WHERE capital IS NOT NULL;

-- 3. ROI 재계산 (초기 자본 50,000원 기준)
UPDATE users 
SET roi = CASE 
  WHEN COALESCE(total_assets, 0) > 0 AND 50000 > 0 
  THEN ROUND(((COALESCE(total_assets, 0) - 50000)::NUMERIC / 50000::NUMERIC) * 100)
  ELSE 0
END
WHERE capital IS NOT NULL;

-- 4. 확인 쿼리
SELECT 
  id, 
  name, 
  capital, 
  stock_value, 
  total_assets, 
  roi 
FROM users 
ORDER BY id 
LIMIT 10;

-- 5. 통계 확인
SELECT 
  COUNT(*) as total_users,
  AVG(capital) as avg_capital,
  MIN(capital) as min_capital,
  MAX(capital) as max_capital,
  SUM(capital) as total_capital
FROM users
WHERE capital IS NOT NULL;

