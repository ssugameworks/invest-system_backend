# 🔍 성능 분석 보고서: 100명 × 2시간 거래 시나리오

## 📊 시나리오 분석

### 예상 트래픽
- **동시 사용자**: 100명
- **거래 시간**: 2시간 (7,200초)
- **평균 거래 빈도**: 1인당 10~30초당 1회 (생각하고 클릭하는 시간 고려)
- **예상 TPS (초당 트랜잭션)**: 3~10 TPS
- **피크 시간대**: 최대 20~30 TPS (모든 사용자가 동시에 거래할 때)

### 2시간 동안 총 예상 거래 수
- 보수적 추정: 100명 × (7,200초 / 30초) = **24,000 거래**
- 적극적 추정: 100명 × (7,200초 / 10초) = **72,000 거래**

---

## ✅ 현재 아키텍처 장점

### 1. DB 커넥션 풀 설정 (적절함)
```typescript
extra: {
  max: 30,                    // 최대 30개 연결
  idleTimeoutMillis: 10_000,  // 10초 유휴 타임아웃
  connectionTimeoutMillis: 5_000,  // 5초 연결 타임아웃
}
```
- 100명 사용자에게 30개 커넥션은 **충분**합니다.
- 각 트랜잭션이 50~200ms 정도 소요된다고 가정하면, 30개 커넥션으로 **초당 150~600 TPS** 처리 가능

### 2. 트랜잭션 사용 (정확함)
```typescript
return await this.dataSource.transaction(async (manager) => {
  // 원자성 보장
});
```
- 매수/매도 로직이 트랜잭션으로 감싸져 있어 데이터 정합성 보장
- 동시 접근 시 race condition 방지

### 3. 엔티티 인덱스 설정 (일부 적절)
```typescript
// user_investments
@Index(["user_id"])
@Index(["team_id"])
@Index(["user_id", "team_id"], { unique: true })

// investment_history
@Index(["user_id"])
@Index(["created_at"])
```

---

## ⚠️ 잠재적 병목 지점

### 1. 🔴 중요: investment_history 테이블 team_id 인덱스 누락
**문제**: `PricingService.recalcEvery10s()`에서 팀별 최근 거래를 조회할 때:
```typescript
.where("history.team_id = :teamId", { teamId: team.id })
.andWhere("history.type = 'buy'")
.andWhere("history.created_at >= :fifteenSecondsAgo", { fifteenSecondsAgo })
```

**영향**: 거래량이 늘어날수록 Full Table Scan 발생 가능
**예상 영향도**: 높음 (2시간 후 72,000건 조회 시 느려질 수 있음)

**해결책**: team_id + created_at 복합 인덱스 추가 필요

### 2. 🟡 매수 시 전체 팀 조회
```typescript
const allTeams = await manager.find(CompetitionTeam);
```
- 6개 팀이면 문제없음
- 팀 수가 많아지면 문제 될 수 있음

### 3. 🟡 사용자 자산 재계산 시 N+1 쿼리
```typescript
for (const inv of investments) {
  const team = await manager.findOne(CompetitionTeam, {
    where: { id: inv.team_id },
  });
  // ...
}
```
- 보유 팀 수만큼 DB 쿼리 발생
- 현재 6개 팀이면 최대 6회 쿼리

### 4. 🟡 가격 재계산 10초 스케줄러
```typescript
setInterval(() => {
  this.recalcEvery10s().catch(() => {});
}, 10_000);
```
- 6개 팀 × (현재가 조회 + 매수 합계 + 매도 합계 + 가격 저장 + 업데이트) = **30개 쿼리/10초**
- 트래픽이 높은 시간에 스케줄러와 거래 요청이 충돌할 수 있음

---

## 📈 성능 예측

### 정상 상황 (3~10 TPS)
| 지표 | 예상 값 | 상태 |
|------|--------|------|
| 평균 응답 시간 | 100~300ms | ✅ 양호 |
| P95 응답 시간 | 500~1000ms | ✅ 양호 |
| 에러율 | < 1% | ✅ 양호 |
| DB 커넥션 사용 | 5~15개 | ✅ 양호 |

### 피크 상황 (20~30 TPS)
| 지표 | 예상 값 | 상태 |
|------|--------|------|
| 평균 응답 시간 | 300~800ms | ✅ 양호 |
| P95 응답 시간 | 1~2초 | ⚠️ 주의 |
| 에러율 | 1~3% | ⚠️ 주의 |
| DB 커넥션 사용 | 20~30개 | ⚠️ 주의 |

### 극단적 상황 (50+ TPS)
| 지표 | 예상 값 | 상태 |
|------|--------|------|
| 평균 응답 시간 | 1~3초 | ❌ 느림 |
| P95 응답 시간 | 3~5초 | ❌ 느림 |
| 에러율 | 5~10% | ❌ 높음 |
| DB 커넥션 사용 | 30개 (포화) | ❌ 포화 |

---

## 🎯 결론

### ✅ 100명 × 2시간 = **충분히 감당 가능**

현재 시스템은 **일반적인 거래 패턴(3~10 TPS)에서 충분히 안정적**으로 동작할 것으로 예상됩니다.

다만, 다음 상황에서는 주의가 필요합니다:
1. **피크 시간대** (대회 시작/종료 직전): 모든 사용자가 동시에 거래할 때 지연 발생 가능
2. **장시간 운영 후**: investment_history 테이블 크기 증가로 인한 쿼리 속도 저하

---

## 🔧 권장 개선사항 (우선순위 순)

### 1. [필수] team_id 인덱스 추가
```sql
CREATE INDEX idx_investment_history_team_created 
ON investment_history(team_id, created_at);
```

### 2. [권장] 가격 계산 쿼리 최적화
현재 팀별로 개별 쿼리 → 한 번에 모든 팀의 최근 거래 합계 조회
```sql
SELECT team_id, type, SUM(amount) as total
FROM investment_history
WHERE created_at >= NOW() - INTERVAL '15 seconds'
GROUP BY team_id, type;
```

### 3. [선택] DB 커넥션 풀 증가
피크 시간대 대비:
```typescript
extra: {
  max: 50,  // 30 → 50으로 증가
}
```

### 4. [선택] 캐시 도입
팀 정보 캐싱 (Redis 또는 in-memory):
- 팀 목록은 거의 변하지 않으므로 캐시 가능
- 현재 주가도 짧은 시간(1~5초) 캐시 가능

---

## 🧪 부하 테스트 실행 방법

### ⚠️ 중요 경고
- **실제 프로덕션 DB나 서버에서 부하 테스트를 실행하지 마세요!**
- **실제 유저 토큰이나 데이터를 절대 사용하지 마세요!**
- 테스트는 반드시 **로컬 테스트 환경** 또는 **별도의 테스트 DB**에서만 진행하세요.

### 권장 테스트 방법: 헬스체크 엔드포인트 부하 테스트
실제 유저 데이터 없이 서버의 기본 처리 능력을 확인할 수 있습니다:

```bash
# autocannon으로 헬스체크 부하 테스트 (100 동시 연결, 60초)
npx autocannon -c 100 -d 60 http://localhost:3001/health

# 또는 wrk 사용
wrk -t12 -c100 -d60s http://localhost:3001/health
```

### 방법 1: 테스트 전용 환경 구성 후 테스트
```bash
# 1. 테스트 DB 연결 (.env.test 사용)
# 2. 테스트 유저 100명 생성 (테스트 전용)
# 3. 부하 테스트 실행
cd invest-system_backend
node scripts/simple-load-test.mjs http://localhost:3001
```

### 방법 2: 이론적 성능 검증 (권장)
실제 부하 테스트 대신 다음을 확인하세요:
1. **Supabase 대시보드**에서 DB 연결 제한 확인
2. **Railway 대시보드**에서 서버 리소스 한도 확인
3. 아래의 이론적 분석 결과 참조

---

## 📝 모니터링 권장

대회 당일 다음 지표를 모니터링하세요:
1. **Railway/Supabase 대시보드**: CPU, 메모리, DB 커넥션 수
2. **응답 시간**: 평균 300ms 이하 유지
3. **에러 로그**: 500 에러 발생 여부

---

*분석 일시: 2025-12-18*
*분석 대상: invest-system_backend*

