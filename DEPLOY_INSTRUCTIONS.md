# 🚀 Railway 배포 완벽 가이드 (웹 UI)

## ⏱️ 예상 소요 시간: 10분

---

## 📋 Step 1: Railway 가입 (1분)

1. **브라우저에서 열기**: https://railway.app
2. **"Start a New Project"** 클릭
3. **"Login with GitHub"** 클릭
4. GitHub 계정으로 로그인
5. Railway에 GitHub 저장소 접근 권한 부여

---

## 📦 Step 2: 프로젝트 생성 (2분)

### 옵션 A: GitHub 저장소 연결 (추천)

1. Railway 대시보드에서 **"New Project"** 클릭
2. **"Deploy from GitHub repo"** 선택
3. 저장소 검색: `gameworks` 입력
4. **저장소 선택**: `your-username/gameworks`
5. **Root Directory 설정**:
   - "Root Directory" 필드에 입력: `invest-system_backend`
   - 또는 "Add Root Directory" 클릭 → `invest-system_backend` 입력

### 옵션 B: GitHub에 저장소가 없는 경우

```bash
# 터미널에서 실행
cd /Users/woohyun/Desktop/gameworks

# Git 초기화 (아직 안했다면)
git init
git add .
git commit -m "Initial commit"

# GitHub에 새 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/gameworks.git
git push -u origin main
```

그 다음 위의 옵션 A 진행

---

## 🔐 Step 3: 환경 변수 설정 (5분) ⚠️ 중요!

Railway가 자동으로 빌드를 시작하지만, **환경 변수를 설정하지 않으면 실패합니다!**

### 3-1. Supabase DB URL 가져오기

1. **Supabase 대시보드** 접속: https://app.supabase.com
2. 프로젝트 선택
3. **Settings** (좌측 하단 톱니바퀴) 클릭
4. **Database** 메뉴 클릭
5. **Connection string** 섹션 찾기
6. **⚠️ "Connection pooling" 탭 선택** (Session mode가 아닌!)
7. **URI** 복사 (형식: `postgresql://postgres.xxx:password@...pooler.supabase.com:6543/postgres`)

### 3-2. JWT Secret 생성

터미널에서 실행:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

출력된 긴 문자열을 복사하세요.

### 3-3. Railway에 환경 변수 추가

1. Railway 프로젝트 화면에서 **"Variables"** 탭 클릭
2. **"New Variable"** 버튼 클릭
3. 다음 변수들을 하나씩 추가:

```
Variable Name: SUPABASE_DB_POOLED_URL
Variable Value: [위에서 복사한 Supabase Pooled URL]

Variable Name: JWT_SECRET
Variable Value: [위에서 생성한 랜덤 문자열]

Variable Name: NODE_ENV
Variable Value: production

Variable Name: FRONTEND_URL
Variable Value: https://your-frontend.vercel.app
(⚠️ 실제 Vercel 프론트엔드 URL로 교체)
```

4. **저장하면 자동으로 재배포됩니다!**

---

## ✅ Step 4: 배포 확인 (2분)

### 4-1. 빌드 로그 확인

1. **"Deployments"** 탭 클릭
2. 최신 배포 클릭
3. 로그 확인:
   ```
   ✅ Installing dependencies...
   ✅ Building application...
   ✅ Starting application...
   ✅ Deployment successful!
   ```

### 4-2. 도메인 생성

1. **"Settings"** 탭 클릭
2. **"Networking"** 섹션 찾기
3. **"Public Networking"** 활성화
4. **"Generate Domain"** 클릭
5. 생성된 URL 복사 (예: `invest-backend-production.up.railway.app`)

---

## 🧪 Step 5: 배포 테스트

### 테스트 1: Health Check

브라우저에서 접속:
```
https://your-backend.up.railway.app/health
```

**예상 결과**:
```json
{"status":"ok"}
```

### 테스트 2: Swagger API 문서

브라우저에서 접속:
```
https://your-backend.up.railway.app/api
```

Swagger UI가 표시되어야 합니다!

### 테스트 3: 주가 스케줄러 동작 확인

1. Railway에서 **"Logs"** 탭 클릭
2. 10초마다 다음 로그가 보여야 합니다:
   ```
   [PricingService] Recalculated prices for X teams at ...
   ```

### 테스트 4: 데이터베이스 연결 확인

로그에서 다음을 찾으세요:
```
✅ Database connection established
```

---

## 📊 Step 6: 모니터링 설정

### 6-1. Metrics 확인

Railway 대시보드:
- **CPU Usage**: 평균 < 50% 정상
- **Memory Usage**: < 1GB 정상
- **Network**: 요청에 따라 변동

### 6-2. 알림 설정 (선택)

1. **"Settings"** → **"Notifications"**
2. Deployment 실패/성공 알림 활성화
3. 이메일 또는 Discord/Slack 연결

---

## 🎯 완료 체크리스트

- [ ] Railway 계정 생성 완료
- [ ] GitHub 저장소 연결 완료
- [ ] `invest-system_backend` 루트 디렉토리 설정
- [ ] 환경 변수 4개 설정 완료:
  - [ ] SUPABASE_DB_POOLED_URL
  - [ ] JWT_SECRET
  - [ ] NODE_ENV
  - [ ] FRONTEND_URL
- [ ] 빌드 성공 확인 (초록색 체크)
- [ ] Public Domain 생성 완료
- [ ] Health Check 성공 (브라우저)
- [ ] Swagger 문서 접속 확인
- [ ] 로그에서 스케줄러 동작 확인

---

## 🔧 문제 해결

### 문제: "Build Failed"

**확인사항**:
1. Root Directory가 `invest-system_backend`로 설정되었는지
2. package.json에 `start:prod` 스크립트가 있는지
3. 환경 변수가 모두 설정되었는지

**해결**:
- Deployments → 실패한 배포 클릭 → 에러 로그 확인
- 에러 메시지에 따라 수정 후 GitHub에 push

---

### 문제: "Database connection failed"

**원인**: SUPABASE_DB_POOLED_URL이 잘못됨

**해결**:
1. Supabase에서 **Pooled URL** (포트 6543) 재확인
2. URL에 비밀번호가 포함되어 있는지 확인
3. Variables 탭에서 재설정
4. 재배포 대기

---

### 문제: "Application crashed"

**확인**:
1. Logs 탭에서 에러 메시지 확인
2. JWT_SECRET 설정 확인
3. 데이터베이스 마이그레이션 필요 여부 확인

---

### 문제: "Port already in use"

**해결**: Railway는 자동으로 포트를 할당하므로 이 문제는 발생하지 않아야 합니다.
만약 발생한다면:
- main.ts에서 PORT 환경 변수를 올바르게 읽는지 확인
- Railway Variables에서 PORT 변수 제거 (Railway가 자동 할당)

---

## 💰 비용 모니터링

### 사용량 확인
1. Railway 대시보드 → **"Usage"** 탭
2. 현재 월 크레딧 사용량 확인
3. 예상 월 비용 확인

### 예상 비용 (동접 400명 기준)
- **Free Trial**: $5 크레딧 (약 2-3일 사용)
- **Hobby Plan**: $5/월 크레딧 (추가 사용량은 추가 과금)
- **예상 실제 비용**: $50-60/월

### 비용 절감 팁
- 개발/테스트 시에는 Sleep Mode 활용
- 사용하지 않는 서비스는 즉시 삭제

---

## 🔄 업데이트 배포

### 자동 배포 (GitHub 연동 시)
```bash
# 코드 수정 후
git add .
git commit -m "Update feature"
git push origin main

# Railway가 자동으로 배포 시작!
```

### 수동 배포 (CLI)
```bash
railway login
railway up
```

---

## 📞 도움이 필요하세요?

- **Railway 문서**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Supabase 문서**: https://supabase.com/docs

---

## 🗑️ 서비스 종료 (1개월 후)

1. Railway 대시보드
2. 프로젝트 선택
3. **"Settings"** → **"Danger Zone"**
4. **"Delete Service"** 클릭
5. 확인

완료! 더 이상 비용이 청구되지 않습니다.

---

## 🎉 배포 완료!

축하합니다! 이제 백엔드가 Railway에서 실행 중입니다.

**다음 단계**:
1. 생성된 Railway URL을 복사
2. 프론트엔드 환경 변수에 백엔드 URL 설정
3. 전체 시스템 테스트

**백엔드 URL**: `https://your-backend.up.railway.app`

