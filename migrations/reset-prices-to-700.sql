-- 모든 팀의 주가를 700원으로 리셋
UPDATE competition_teams SET p = 700;
UPDATE competition_teams SET money = 0;

-- 확인
SELECT id, "teamName", p, money FROM competition_teams;

