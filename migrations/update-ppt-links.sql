-- =====================================================
-- 팀별 PPT 링크 업데이트 SQL
-- =====================================================

-- 일식이좋아
UPDATE competition_teams 
SET pitch_url = 'https://mieoqhpegvdjsvhtwnlb.supabase.co/storage/v1/object/public/PPT/didim.pdf',
    updated_at = NOW()
WHERE "teamName" = '일식이좋아' OR "teamName" = '일식이 조아';

-- 불개미
UPDATE competition_teams 
SET pitch_url = 'https://mieoqhpegvdjsvhtwnlb.supabase.co/storage/v1/object/public/PPT/fireants.pdf',
    updated_at = NOW()
WHERE "teamName" = '불개미';

-- SLOW
UPDATE competition_teams 
SET pitch_url = 'https://mieoqhpegvdjsvhtwnlb.supabase.co/storage/v1/object/public/PPT/slow.pdf',
    updated_at = NOW()
WHERE "teamName" = 'SLOW' OR "teamName" = 'slow';

-- 벤양
UPDATE competition_teams 
SET pitch_url = 'https://mieoqhpegvdjsvhtwnlb.supabase.co/storage/v1/object/public/PPT/ven.pdf',
    updated_at = NOW()
WHERE "teamName" = '벤양';

-- 힙72
UPDATE competition_teams 
SET pitch_url = 'https://mieoqhpegvdjsvhtwnlb.supabase.co/storage/v1/object/public/PPT/hip72.pdf',
    updated_at = NOW()
WHERE "teamName" = '힙72';

-- TIO
UPDATE competition_teams 
SET pitch_url = 'https://mieoqhpegvdjsvhtwnlb.supabase.co/storage/v1/object/public/PPT/tio.pdf',
    updated_at = NOW()
WHERE "teamName" = 'TIO' OR "teamName" = 'tio';

-- =====================================================
-- 확인 쿼리
-- =====================================================

-- 업데이트된 팀별 PPT 링크 확인
SELECT id, "teamName", pitch_url 
FROM competition_teams 
ORDER BY id;

