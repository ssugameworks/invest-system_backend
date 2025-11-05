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

---
This service is a minimal NestJS starter. Add modules under `src/` as needed.
# invest-system_backend