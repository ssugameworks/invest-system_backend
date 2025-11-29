# Railway 배포 가이드

## 🚀 빠른 시작 (10분 완료)

### 1단계: Railway 계정 생성 (2분)

1. [Railway 웹사이트](https://railway.app) 접속
2. "Start a New Project" 클릭
3. GitHub로 로그인

### 2단계: 프로젝트 생성 (3분)

#### 방법 A: GitHub 연동 (추천)

1. Railway 대시보드에서 "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. 저장소 선택: `invest-system_backend`
4. 루트 디렉토리 선택: `/invest-system_backend`

#### 방법 B: Railway CLI (고급)

```bash
# Railway CLI 설치
npm i -g @railway/cli

# 로그인
railway login

# 프로젝트 초기화
cd invest-system_backend
railway init

# 배포
railway up
```

### 3단계: 환경 변수 설정 (3분)

Railway 대시보드에서:

1. 프로젝트 선택
2. "Variables" 탭 클릭
3. 다음 환경 변수 추가:

```env
# 필수 환경 변수
SUPABASE_DB_POOLED_URL=<Supabase에서 복사>
JWT_SECRET=<강력한 랜덤 문자열 생성>
NODE_ENV=production

# 선택적 환경 변수 (기본값 있음)
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
PORT=3001

# CORS 설정 (프론트엔드 URL)
FRONTEND_URL=https://your-frontend.vercel.app
```

#### JWT_SECRET 생성 방법

터미널에서 실행:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4단계: 배포 확인 (2분)

1. Railway가 자동으로 빌드 시작
2. 빌드 로그 확인:
   - `npm install` 실행
   - `npm run build` 실행
   - `npm run start:prod` 실행
3. 배포 완료 확인 (초록색 체크)
4. 도메인 복사 (예: `your-app.railway.app`)

### 5단계: 도메인 설정 (1분)

1. "Settings" 탭
2. "Domains" 섹션
3. "Generate Domain" 클릭
4. 생성된 URL 복사 (예: `your-backend.up.railway.app`)

---

## ✅ 배포 완료 체크리스트

- [ ] Railway 계정 생성
- [ ] GitHub 저장소 연결
- [ ] 환경 변수 설정 (SUPABASE_DB_POOLED_URL, JWT_SECRET)
- [ ] 빌드 성공 확인
- [ ] 서비스 실행 중 확인
- [ ] 도메인 URL 복사

---

## 🧪 배포 테스트

### Health Check
```bash
curl https://your-backend.up.railway.app/health
# 예상 응답: {"status":"ok"}
```

### Swagger API 문서
브라우저에서 접속:
```
https://your-backend.up.railway.app/api
```

### 로그인 테스트
```bash
curl -X POST https://your-backend.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"schoolNumber": YOUR_SCHOOL_NUMBER, "password": "YOUR_PASSWORD"}'
```

---

## 📊 모니터링

Railway 대시보드에서 확인:
- **Metrics**: CPU, Memory, Network 사용량
- **Logs**: 실시간 서버 로그
- **Deployments**: 배포 히스토리

---

## 🔧 문제 해결

### 빌드 실패 시

1. 로그 확인: "Deployments" → 최신 배포 클릭
2. 오류 메시지 확인
3. 일반적인 원인:
   - 환경 변수 누락
   - 데이터베이스 연결 실패
   - 빌드 명령 오류

### 런타임 오류 시

1. "Logs" 탭에서 실시간 로그 확인
2. 데이터베이스 연결 확인:
   - Supabase URL 올바른지 확인
   - Pooled URL 사용 중인지 확인
3. 환경 변수 다시 확인

### 연결 시간 초과

- Supabase 방화벽 설정 확인
- Railway IP 허용 여부 확인

---

## 💰 비용 모니터링

1. Railway 대시보드 → "Usage"
2. 현재 크레딧 사용량 확인
3. 예상 월 비용 확인

**예상 비용**: $50-60/월 (동접 400명 기준)

---

## 🔄 업데이트 배포

### GitHub 연동 (자동)
- `main` 브랜치에 push → 자동 배포

### CLI (수동)
```bash
railway up
```

---

## 🗑️ 서비스 종료 (1개월 후)

1. Railway 대시보드
2. 프로젝트 선택
3. "Settings" → "Danger Zone"
4. "Delete Project" 클릭

---

## 📞 지원

- [Railway 문서](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway 상태 페이지](https://status.railway.app)

