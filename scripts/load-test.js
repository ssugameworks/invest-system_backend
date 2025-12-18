/**
 * k6 부하 테스트 스크립트
 * 
 * ⚠️  경고: 이 스크립트는 테스트 전용 환경에서만 실행하세요!
 * ⚠️  실제 프로덕션 DB에 연결된 서버에서 실행하지 마세요!
 * ⚠️  실제 유저 토큰이나 데이터를 절대 사용하지 마세요!
 * 
 * 이 테스트는 가짜 토큰(test-token-user-X)만 사용합니다.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 커스텀 메트릭
const buyErrors = new Rate('buy_errors');
const sellErrors = new Rate('sell_errors');
const buyDuration = new Trend('buy_duration');
const sellDuration = new Trend('sell_duration');
const totalTransactions = new Counter('total_transactions');

// 테스트 설정
export const options = {
  // 시나리오 1: 100명이 동시에 2시간 동안 거래
  scenarios: {
    sustained_load: {
      executor: 'constant-vus',
      vus: 100,              // 100명의 가상 사용자
      duration: '5m',        // 테스트 시간 (실제 2시간은 '2h'로 변경 가능)
    },
    // 시나리오 2: 스파이크 테스트 (피크 시간 시뮬레이션)
    spike_test: {
      executor: 'ramping-vus',
      startTime: '5m',       // sustained_load 이후 시작
      stages: [
        { duration: '30s', target: 100 },   // 100명 유지
        { duration: '1m', target: 200 },    // 200명으로 급증 (피크)
        { duration: '30s', target: 100 },   // 100명으로 복귀
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],      // 95%의 요청이 2초 이내
    http_req_failed: ['rate<0.05'],          // 실패율 5% 미만
    buy_errors: ['rate<0.05'],
    sell_errors: ['rate<0.05'],
  },
};

// API 기본 URL (로컬 테스트 전용!)
const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

// ⚠️ 프로덕션 URL 차단
const BLOCKED_URLS = ['invest.gameworks.app', 'railway.app', 'vercel.app'];
if (BLOCKED_URLS.some(blocked => BASE_URL.includes(blocked))) {
  throw new Error('❌ 프로덕션 환경에서는 실행할 수 없습니다! localhost에서만 테스트하세요.');
}

// ⚠️ 가짜 테스트 토큰만 사용 (실제 유저 토큰 절대 사용 금지!)
// 테스트 환경에서는 AuthGuard를 수정하여 이 패턴의 토큰을 허용해야 함
const TEST_TOKEN_PREFIX = 'fake-test-token-';

// 팀 ID 목록 (실제 DB에 있는 팀 ID로 교체 필요)
const TEAM_IDS = [1, 2, 3, 4, 5, 6];

// 거래 금액 범위
const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 5000;

// 유저별 시뮬레이션 데이터
let userStates = {};

export function setup() {
  console.log('🚀 부하 테스트 시작');
  console.log(`📊 대상 서버: ${BASE_URL}`);
  console.log(`👥 가상 사용자: 100명`);
  console.log(`⏱️  테스트 시간: 5분 (스파이크 포함 7분)`);
  
  // 서버 헬스 체크
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    console.error('❌ 서버 헬스 체크 실패!');
    return { healthy: false };
  }
  
  console.log('✅ 서버 헬스 체크 성공');
  return { healthy: true };
}

function getRandomAmount() {
  return Math.floor(Math.random() * (MAX_AMOUNT - MIN_AMOUNT + 1)) + MIN_AMOUNT;
}

function getRandomTeamId() {
  return TEAM_IDS[Math.floor(Math.random() * TEAM_IDS.length)];
}

export default function(data) {
  if (!data.healthy) {
    console.error('서버가 정상이 아닙니다. 테스트 중단.');
    return;
  }

  const vuId = __VU;
  
  // 초기 상태 설정
  if (!userStates[vuId]) {
    userStates[vuId] = {
      capital: 50000,
      holdings: {},  // teamId: { shares: 0, amount: 0 }
    };
  }
  
  const state = userStates[vuId];
  
  // 70% 확률로 매수, 30% 확률로 매도 (초기에는 보유 주식이 없으므로 매수가 많음)
  const shouldBuy = Math.random() < 0.7 || Object.keys(state.holdings).length === 0;
  
  group('거래 시뮬레이션', function() {
    if (shouldBuy) {
      // 매수
      const teamId = getRandomTeamId();
      const amount = getRandomAmount();
      
      const payload = JSON.stringify({
        teamId: teamId,
        amount: amount,
      });
      
      const params = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN_PREFIX}${vuId}`, // ⚠️ 가짜 테스트 토큰
        },
        tags: { name: 'BuyStock' },
      };
      
      const startTime = Date.now();
      const res = http.post(`${BASE_URL}/api/invest`, payload, params);
      const duration = Date.now() - startTime;
      
      buyDuration.add(duration);
      totalTransactions.add(1);
      
      const success = check(res, {
        '매수 성공 (201)': (r) => r.status === 201,
        '매수 응답 시간 < 2s': (r) => r.timings.duration < 2000,
      });
      
      buyErrors.add(!success);
      
      if (success) {
        // 상태 업데이트
        if (!state.holdings[teamId]) {
          state.holdings[teamId] = { shares: 0, amount: 0 };
        }
        state.holdings[teamId].amount += amount;
        state.capital -= amount;
      }
      
    } else {
      // 매도 (보유 주식이 있는 경우에만)
      const holdingTeams = Object.keys(state.holdings).filter(
        teamId => state.holdings[teamId].amount > 0
      );
      
      if (holdingTeams.length > 0) {
        const teamId = holdingTeams[Math.floor(Math.random() * holdingTeams.length)];
        const maxAmount = Math.min(state.holdings[teamId].amount, MAX_AMOUNT);
        const amount = Math.floor(Math.random() * maxAmount) + 1;
        
        const payload = JSON.stringify({
          teamId: parseInt(teamId),
          amount: amount,
        });
        
        const params = {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_TOKEN_PREFIX}${vuId}`, // ⚠️ 가짜 테스트 토큰
          },
          tags: { name: 'SellStock' },
        };
        
        const startTime = Date.now();
        const res = http.post(`${BASE_URL}/api/sell`, payload, params);
        const duration = Date.now() - startTime;
        
        sellDuration.add(duration);
        totalTransactions.add(1);
        
        const success = check(res, {
          '매도 성공 (201)': (r) => r.status === 201,
          '매도 응답 시간 < 2s': (r) => r.timings.duration < 2000,
        });
        
        sellErrors.add(!success);
        
        if (success) {
          state.holdings[teamId].amount -= amount;
          state.capital += amount;
        }
      }
    }
  });
  
  // 실제 사용자처럼 생각하는 시간 (2~5초)
  sleep(Math.random() * 3 + 2);
}

export function teardown(data) {
  console.log('🏁 부하 테스트 완료');
  console.log('');
  console.log('='.repeat(50));
  console.log('📊 테스트 결과 요약');
  console.log('='.repeat(50));
}

