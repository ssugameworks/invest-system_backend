-- 주가 데이터만 리셋 (prices 테이블과 competition_teams.p 컬럼만 초기화)
-- 투자 데이터, 사용자 데이터 등은 유지

-- 1. prices 테이블의 모든 주가 히스토리 데이터 삭제
DELETE FROM prices;

-- 2. 모든 팀의 현재 주가(p)를 700원으로 리셋
UPDATE competition_teams SET p = 700;

-- 확인
SELECT id, "teamName", p, money FROM competition_teams ORDER BY id;

