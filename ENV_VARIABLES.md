# 환경 변수 설정 가이드

## 🔐 필수 환경 변수

### 1. SUPABASE_DB_POOLED_URL
**설명**: Supabase PostgreSQL Pooled 연결 URL

**어디서 가져오나요?**
1. [Supabase 대시보드](https://app.supabase.com) 로그인
2. 프로젝트 선택
3. Settings → Database → Connection string
4. **"Connection pooling"** 탭 선택
5. "URI" 복사

**형식**:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

**주의사항**:
- ⚠️ 반드시 **Pooled URL** (포트 6543) 사용
- ⚠️ Direct URL (포트 5432) 사용 시 연결 제한 발생 가능

---

### 2. JWT_SECRET
**설명**: JWT 토큰 암호화에 사용되는 비밀 키

**생성 방법**:
```bash
# 터미널에서 실행
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

또는

```bash
# macOS/Linux
openssl rand -hex 64
```

**예시**:
```
a1b2c3d4e5f6....(128자 길이의 랜덤 문자열)
```

**주의사항**:
- ⚠️ 절대 GitHub에 커밋하지 마세요
- ⚠️ 최소 32자 이상 권장
- ⚠️ 프로덕션과 개발 환경은 다른 값 사용

---

## 📌 선택적 환경 변수 (기본값 있음)

### 3. NODE_ENV
**설명**: 실행 환경 구분

**값**: `production` (Railway 배포 시)
**기본값**: `development`

---

### 4. PORT
**설명**: 서버가 실행될 포트

**값**: `3001`
**기본값**: `3001`
**Railway**: 자동으로 할당됨 (설정 불필요)

---

### 5. JWT_ACCESS_EXPIRATION
**설명**: 액세스 토큰 만료 시간

**값**: `15m` (15분)
**기본값**: `1h`

---

### 6. JWT_REFRESH_EXPIRATION
**설명**: 리프레시 토큰 만료 시간

**값**: `7d` (7일)
**기본값**: `7d`

---

### 7. FRONTEND_URL
**설명**: CORS 허용 프론트엔드 URL

**예시**: `https://your-frontend.vercel.app`
**기본값**: 모든 origin 허용 (true)

**주의사항**:
- 보안을 위해 프로덕션에서는 명시적으로 설정 권장
- 여러 도메인: 코드 수정 필요

---

## 🚀 Railway 설정 방법

### 방법 1: Web UI (추천)

1. Railway 대시보드 접속
2. 프로젝트 선택
3. "Variables" 탭 클릭
4. "New Variable" 클릭하여 하나씩 추가:

```
SUPABASE_DB_POOLED_URL = postgresql://postgres.xxxxx:...
JWT_SECRET = a1b2c3d4e5f6...
NODE_ENV = production
FRONTEND_URL = https://your-frontend.vercel.app
```

5. 저장 → 자동 재배포

### 방법 2: Railway CLI

```bash
# 하나씩 설정
railway variables set SUPABASE_DB_POOLED_URL="postgresql://..."
railway variables set JWT_SECRET="your-secret-key"
railway variables set NODE_ENV="production"
railway variables set FRONTEND_URL="https://your-frontend.vercel.app"

# 확인
railway variables
```

### 방법 3: .env 파일 업로드 (비추천)

```bash
# .env 파일 내용을 Railway에 업로드
railway variables set --from-env-file .env
```

⚠️ 주의: .env 파일이 GitHub에 커밋되지 않도록 주의

---

## ✅ 환경 변수 체크리스트

배포 전 확인:

- [ ] SUPABASE_DB_POOLED_URL 설정 (필수)
  - [ ] Pooled URL 맞는지 확인 (포트 6543)
  - [ ] 비밀번호 포함되어 있는지 확인
  
- [ ] JWT_SECRET 설정 (필수)
  - [ ] 64자 이상 랜덤 문자열
  - [ ] 프로덕션 전용 키 사용
  
- [ ] NODE_ENV = production (권장)
  
- [ ] FRONTEND_URL 설정 (보안 권장)
  - [ ] Vercel 프론트엔드 URL로 설정

배포 후 확인:

- [ ] Railway 로그에서 환경 변수 로딩 확인
- [ ] 데이터베이스 연결 성공 확인
- [ ] API 엔드포인트 응답 확인

---

## 🔍 문제 해결

### "Database connection failed"

**원인**: SUPABASE_DB_POOLED_URL이 잘못되었거나 없음

**해결**:
1. Supabase 대시보드에서 URL 다시 확인
2. Pooled URL (포트 6543) 사용 중인지 확인
3. 비밀번호가 URL에 포함되어 있는지 확인

### "JWT secret is missing"

**원인**: JWT_SECRET이 설정되지 않음

**해결**:
1. 새로운 시크릿 키 생성
2. Railway Variables에 추가
3. 재배포 대기

### "CORS error"

**원인**: FRONTEND_URL이 실제 프론트엔드 URL과 다름

**해결**:
1. Vercel에서 프론트엔드 URL 확인
2. FRONTEND_URL 업데이트
3. 재배포

---

## 📝 환경 변수 예시 (참고용)

```env
# ⚠️ 실제 값으로 교체하세요!
SUPABASE_DB_POOLED_URL=postgresql://postgres.abcdefgh:your-password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
NODE_ENV=production
FRONTEND_URL=https://invest-system-frontend.vercel.app
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
PORT=3001
```

---

## 🔐 보안 Best Practices

1. ✅ 환경 변수는 절대 Git에 커밋하지 마세요
2. ✅ 프로덕션과 개발 환경은 다른 JWT_SECRET 사용
3. ✅ FRONTEND_URL을 명시적으로 설정 (CORS 보안)
4. ✅ 주기적으로 JWT_SECRET 로테이션
5. ✅ Supabase 비밀번호 강력하게 설정

