-- =====================================================
-- 전화번호 컬럼 추가 마이그레이션
-- Supabase SQL Editor에서 실행
-- =====================================================

-- users 테이블에 phone_number 컬럼 추가
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- 확인 쿼리
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'phone_number';

