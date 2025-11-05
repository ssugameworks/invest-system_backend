## invest-system backend (NestJS)

### Prerequisites

- Node.js >= 18
- pnpm / npm / yarn

### Setup

1. Install dependencies

```bash
pnpm install
# or
npm install
# or
yarn
```

2. Run in development

```bash
pnpm start:dev
# or npm run start:dev
```

3. Build and run in production

```bash
pnpm build && pnpm start:prod
# or npm run build && npm run start:prod
```

### Environment

- Default port is 3001. Override with `PORT` env var.

### Endpoints

- `GET /` → returns a welcome message
- `GET /health` → simple health check `{ status: 'ok' }`
- `GET /api` → Swagger API documentation

---

## Vercel 배포

### 배포 방법

1. **Vercel CLI로 배포**

```bash
npm i -g vercel
vercel
```

2. **GitHub 연동 배포 (추천)**
   - [Vercel Dashboard](https://vercel.com)에 접속
   - "New Project" 클릭
   - GitHub 저장소 연결
   - 환경 변수 설정 후 배포

### 필요한 환경 변수

Vercel Dashboard의 프로젝트 Settings → Environment Variables에서 설정:

- `SUPABASE_DB_POOLED_URL`: Supabase PostgreSQL 연결 URL
- `JWT_SECRET`: JWT 토큰 시크릿 (선택사항, 기본값: "dev-secret")
- `JWT_EXPIRES_IN`: JWT 만료 시간 (선택사항, 기본값: "1h")
- `PORT`: 서버 포트 (Vercel에서 자동 설정됨)

### 배포 후

- API: `https://your-project.vercel.app`
- Swagger: `https://your-project.vercel.app/api`
