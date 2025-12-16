-- pricing_config 테이블의 P0 값을 700으로 수정
UPDATE pricing_config SET value = '700' WHERE key = 'P0';

-- 확인
SELECT * FROM pricing_config;

