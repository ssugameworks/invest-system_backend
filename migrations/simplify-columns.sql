-- ⭐ 컬럼 단순화: p0, p1, p2 제거, p만 사용

-- 1. 모든 팀의 p를 700으로 초기화
UPDATE competition_teams SET p = 700;

-- 2. p0, p1, p2 컬럼 제거
ALTER TABLE competition_teams DROP COLUMN IF EXISTS p0;
ALTER TABLE competition_teams DROP COLUMN IF EXISTS p1;
ALTER TABLE competition_teams DROP COLUMN IF EXISTS p2;

-- 3. p 컬럼의 기본값을 700으로 설정
ALTER TABLE competition_teams ALTER COLUMN p SET DEFAULT 700;

-- 4. p 컬럼을 NOT NULL로 변경
ALTER TABLE competition_teams ALTER COLUMN p SET NOT NULL;

-- 5. 확인
SELECT id, "teamName", p, money FROM competition_teams;

