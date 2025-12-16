-- 모든 팀의 p 값을 강제로 700으로 설정
UPDATE competition_teams SET p = 700;

-- 확인
SELECT id, "teamName", p, p0, money FROM competition_teams;

