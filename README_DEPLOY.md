# 🚀 Railway 배포 완료 가이드

## ✅ 준비 완료!

Railway 배포를 위한 모든 설정이 완료되었습니다.

---

## 📁 생성된 파일

### 배포 설정
- ✅ `railway.json` - Railway 빌드/배포 설정
- ✅ `DEPLOY_INSTRUCTIONS.md` - 상세 배포 가이드 (필독!)
- ✅ `ENV_VARIABLES.md` - 환경 변수 설명
- ✅ `RAILWAY_DEPLOY.md` - 간단 가이드

### 코드 수정
- ✅ `src/main.ts` - CORS 설정 개선 (FRONTEND_URL 지원)

---

## 🎯 다음 단계

### 1️⃣ Railway 웹사이트 접속
```
https://railway.app
```

### 2️⃣ 배포 가이드 따라하기
📖 **상세 가이드**: `DEPLOY_INSTRUCTIONS.md` 열기

**요약**:
1. GitHub로 로그인
2. "Deploy from GitHub repo" 선택
3. Root Directory: `invest-system_backend`
4. 환경 변수 설정 (4개 필수)
5. 도메인 생성 및 URL 복사

### 3️⃣ 환경 변수 준비

**필수 환경 변수**:

```bash
# 1. Supabase URL (Supabase 대시보드에서 복사)
SUPABASE_DB_POOLED_URL=postgresql://postgres.xxx:password@...pooler.supabase.com:6543/postgres

# 2. JWT Secret (아래 명령어로 생성)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# 3. 환경
NODE_ENV=production

# 4. 프론트엔드 URL (Vercel URL)
FRONTEND_URL=https://your-frontend.vercel.app
```

**JWT Secret 생성**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4️⃣ 배포 후 테스트

Railway에서 생성된 URL로 테스트:

```bash
# Health Check
curl https://your-backend.up.railway.app/health

# 브라우저에서 Swagger 확인
open https://your-backend.up.railway.app/api
```

또는 테스트 스크립트 실행:
```bash
cd ..
./test-deployment.sh https://your-backend.up.railway.app
```

---

## 📊 예상 결과

### 성공적인 배포 시

✅ Railway 대시보드에서 "Active" 상태  
✅ Health 엔드포인트 응답: `{"status":"ok"}`  
✅ Swagger 문서 접속 가능  
✅ Logs에 "Backend running" 메시지  
✅ 10초마다 주가 계산 로그  

### 빌드 로그 예시
```
Running build command 'npm install && npm run build'...
✅ Dependencies installed
✅ TypeScript compiled
✅ Build successful

Running start command 'npm run start:prod'...
✅ Backend running on http://localhost:XXXX
✅ Database connection established
✅ [PricingService] Recalculated prices for X teams
```

---

## 🐛 문제 해결

### "Build Failed"
- Root Directory가 `invest-system_backend`인지 확인
- package.json에 `start:prod` 스크립트 있는지 확인

### "Database connection failed"
- SUPABASE_DB_POOLED_URL이 **Pooled URL** (포트 6543)인지 확인
- URL에 비밀번호가 포함되어 있는지 확인

### "Application crashed"
- Railway Logs 탭에서 에러 메시지 확인
- JWT_SECRET이 설정되어 있는지 확인

---

## 💰 비용

**예상 비용** (동접 400명 기준):
- Railway: $50-60/월
- Supabase (Pro 권장): $25/월
- **총계**: $75-85/월

**무료 옵션**:
- Railway: 첫 $5 크레딧 (약 2-3일)
- Supabase Free: 연결 제한 있음 (60 connections)

---

## 📞 지원

- **Railway 문서**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **상세 가이드**: `DEPLOY_INSTRUCTIONS.md`

---

## 🎉 배포 성공 후

1. Railway URL 복사
2. 프론트엔드 환경 변수 업데이트:
   - 가이드: `../invest-system_frontend/UPDATE_BACKEND_URL.md`
3. 전체 시스템 테스트

**다음 문서**: `../invest-system_frontend/UPDATE_BACKEND_URL.md`

---

## ✅ 체크리스트

- [ ] Railway 계정 생성
- [ ] GitHub 저장소 연결
- [ ] Root Directory 설정
- [ ] 환경 변수 4개 설정
- [ ] 빌드 성공 확인
- [ ] Public Domain 생성
- [ ] Health Check 테스트
- [ ] Swagger 문서 확인
- [ ] 스케줄러 로그 확인
- [ ] Railway URL 복사
- [ ] 프론트엔드 업데이트 진행

---

**시작하기**: `DEPLOY_INSTRUCTIONS.md` 열기! 📖

