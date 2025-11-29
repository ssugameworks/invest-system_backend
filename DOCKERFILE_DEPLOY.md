# 🐳 Dockerfile 배포 가이드

## 문제 해결: dist/ 폴더가 배포 컨테이너로 복사 안됨

Railway Nixpacks의 문제를 Dockerfile로 해결했습니다!

---

## ✅ 생성된 파일

- `Dockerfile` - 멀티 스테이지 빌드 설정
- `.dockerignore` - 불필요한 파일 제외

---

## 🚀 Railway에서 재배포

### Step 1: GitHub에 커밋 & Push

터미널에서:
```bash
cd /Users/woohyun/Desktop/gameworks/invest-system_backend

# 새 파일들 추가
git add Dockerfile .dockerignore

# 커밋
git commit -m "Add Dockerfile for Railway deployment"

# Push
git push origin main
```

### Step 2: Railway 자동 재배포

- GitHub에 push하면 **Railway가 자동으로 재배포**합니다!
- Dockerfile이 있으면 자동으로 Docker 빌드 사용

### Step 3: 빌드 로그 확인

Railway → Deployments → 최신 배포

**이렇게 나와야 정상**:
```
✅ Building with Dockerfile
✅ [builder] npm ci
✅ [builder] npm run build
✅ [builder] nest build
✅ Build completed successfully
✅ Starting container
✅ Backend running on http://localhost:XXXX
```

---

## 🎯 Dockerfile 동작 방식

### Stage 1: Builder
```dockerfile
# node:18-alpine 사용 (가벼운 이미지)
# npm ci: package-lock.json 기반 설치
# npm run build: TypeScript 컴파일 → dist/
```

### Stage 2: Production
```dockerfile
# 새 컨테이너 시작 (크기 최소화)
# production dependencies만 설치
# 빌드된 dist/ 폴더 복사 ✅
# npm run start:prod 실행
```

---

## ⏱️ 예상 시간

- Push 후 자동 감지: 30초
- Docker 빌드: 3-5분
- 컨테이너 시작: 1분
- **총 5-7분**

---

## 🧪 테스트

5-7분 후:

```bash
curl https://invest-systembackend-production.up.railway.app/health
```

**예상 결과**:
```json
{"status":"ok"}
```

---

## 📊 로그에서 확인할 것

### 성공 시:
```
✅ [builder] Successfully compiled X files with swc
✅ [production] Copying dist folder
✅ Backend running on http://localhost:XXXX
✅ [TypeOrmModule] Database connection established
✅ [PricingService] Recalculated prices for X teams
```

### 실패 시:
- Docker 빌드 에러 → 로그 확인
- 여전히 Nixpacks 사용 중 → Settings에서 Builder 확인

---

## 🔧 Railway Settings (선택사항)

Railway가 Dockerfile을 자동 감지하지만, 명시적으로 설정 가능:

1. Settings → Build
2. **Builder**: Docker (자동 선택됨)
3. **Dockerfile Path**: `Dockerfile` (기본값)

---

## 💡 왜 Dockerfile이 필요했나요?

**Nixpacks 문제**:
- Build 컨테이너: `npm run build` → dist/ 생성
- Deploy 컨테이너: 새로 시작 → dist/ 없음 ❌

**Dockerfile 해결**:
- Multi-stage build
- Builder 단계에서 dist/ 생성
- Production 단계로 명시적 복사 ✅

---

## ✅ 체크리스트

- [x] Dockerfile 생성
- [x] .dockerignore 생성
- [ ] Git commit & push
- [ ] Railway 자동 재배포 확인
- [ ] 로그에서 "Building with Dockerfile" 확인
- [ ] 로그에서 "nest build" 실행 확인
- [ ] 로그에서 "Backend running" 확인
- [ ] 5-7분 대기
- [ ] curl 테스트 성공

---

## 🆘 여전히 안 되나요?

### Dockerfile을 못 찾는 경우

Railway Settings에서:
1. Build → Builder → Docker 선택
2. Dockerfile Path: `Dockerfile` 입력
3. Context Directory: `.` (루트)

### 빌드 실패 시

로그의 에러 메시지를 복사해서 보여주세요!

---

## 🎉 완료!

이제 Dockerfile로 안정적으로 배포됩니다!

