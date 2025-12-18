/**
 * 간단한 Node.js 부하 테스트 스크립트
 * 100명이 2시간 동안 매수/매도를 진행하는 시나리오 시뮬레이션
 * 
 * ⚠️  경고: 이 스크립트는 테스트 전용 환경에서만 실행하세요!
 * ⚠️  실제 프로덕션 DB에 연결된 서버에서 실행하지 마세요!
 * ⚠️  실제 유저 토큰이나 데이터를 사용하지 마세요!
 * 
 * 사용법: node scripts/simple-load-test.mjs [API_URL]
 * 예: node scripts/simple-load-test.mjs http://localhost:3001
 * 
 * 이 테스트는 가짜 토큰(test-token-user-X)을 사용합니다.
 * 테스트 환경에서는 이 토큰을 허용하도록 AuthGuard를 수정하거나,
 * 테스트 전용 유저를 미리 생성해야 합니다.
 */

const API_URL = process.argv[2] || 'http://localhost:3001';

// ⚠️ 프로덕션 URL 차단
const BLOCKED_URLS = [
  'invest.gameworks.app',
  'gameworks-flow',
  'railway.app',
  'vercel.app',
  'production',
];

if (BLOCKED_URLS.some(blocked => API_URL.includes(blocked))) {
  console.error('❌ 오류: 프로덕션 환경에서는 부하 테스트를 실행할 수 없습니다!');
  console.error('   로컬 테스트 환경(localhost)에서만 실행하세요.');
  process.exit(1);
}

// 설정
const CONFIG = {
  VIRTUAL_USERS: 100,           // 가상 사용자 수
  TEST_DURATION_MS: 3 * 60 * 1000,  // 테스트 시간 (3분 - 프리뷰용, 실제는 2시간)
  THINK_TIME_MIN_MS: 2000,      // 최소 생각 시간 (2초)
  THINK_TIME_MAX_MS: 8000,      // 최대 생각 시간 (8초)
  TEAM_IDS: [1, 2, 3, 4, 5, 6], // 팀 ID 목록
  MIN_AMOUNT: 1000,             // 최소 거래 금액
  MAX_AMOUNT: 5000,             // 최대 거래 금액
};

// 결과 수집
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  buyRequests: 0,
  sellRequests: 0,
  responseTimes: [],
  errors: [],
  startTime: null,
  endTime: null,
};

// 동시 요청 수 추적
let currentConcurrentRequests = 0;
let maxConcurrentRequests = 0;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomTeamId() {
  return CONFIG.TEAM_IDS[Math.floor(Math.random() * CONFIG.TEAM_IDS.length)];
}

async function makeRequest(endpoint, body, token) {
  currentConcurrentRequests++;
  maxConcurrentRequests = Math.max(maxConcurrentRequests, currentConcurrentRequests);
  
  const startTime = performance.now();
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    results.totalRequests++;
    results.responseTimes.push(duration);
    
    if (response.ok) {
      results.successfulRequests++;
      return { success: true, duration, status: response.status };
    } else {
      results.failedRequests++;
      const errorBody = await response.text();
      results.errors.push({ status: response.status, body: errorBody, endpoint });
      return { success: false, duration, status: response.status };
    }
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    results.totalRequests++;
    results.failedRequests++;
    results.errors.push({ error: error.message, endpoint });
    
    return { success: false, duration, error: error.message };
  } finally {
    currentConcurrentRequests--;
  }
}

async function simulateUser(userId) {
  // ⚠️ 가짜 테스트 토큰만 사용 (실제 유저 토큰 절대 사용 금지!)
  const token = `fake-test-token-${userId}`;
  let capital = 50000;
  const holdings = {}; // teamId: amount
  
  const userStartTime = Date.now();
  const userEndTime = userStartTime + CONFIG.TEST_DURATION_MS;
  
  while (Date.now() < userEndTime) {
    // 70% 확률로 매수, 30% 확률로 매도
    const holdingTeams = Object.keys(holdings).filter(tid => holdings[tid] > 0);
    const shouldBuy = Math.random() < 0.7 || holdingTeams.length === 0;
    
    if (shouldBuy && capital > CONFIG.MIN_AMOUNT) {
      // 매수
      const teamId = getRandomTeamId();
      const amount = Math.min(getRandomInt(CONFIG.MIN_AMOUNT, CONFIG.MAX_AMOUNT), capital);
      
      const result = await makeRequest('/api/invest', { teamId, amount }, token);
      results.buyRequests++;
      
      if (result.success) {
        capital -= amount;
        holdings[teamId] = (holdings[teamId] || 0) + amount;
      }
    } else if (holdingTeams.length > 0) {
      // 매도
      const teamId = parseInt(holdingTeams[Math.floor(Math.random() * holdingTeams.length)]);
      const maxSellAmount = holdings[teamId];
      const amount = getRandomInt(Math.min(CONFIG.MIN_AMOUNT, maxSellAmount), maxSellAmount);
      
      const result = await makeRequest('/api/sell', { teamId, amount }, token);
      results.sellRequests++;
      
      if (result.success) {
        holdings[teamId] -= amount;
        capital += amount;
      }
    }
    
    // 생각 시간 (실제 사용자 행동 시뮬레이션)
    const thinkTime = getRandomInt(CONFIG.THINK_TIME_MIN_MS, CONFIG.THINK_TIME_MAX_MS);
    await new Promise(resolve => setTimeout(resolve, thinkTime));
  }
}

function calculatePercentile(arr, percentile) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function printResults() {
  const duration = (results.endTime - results.startTime) / 1000;
  const avgResponseTime = results.responseTimes.length > 0 
    ? results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length 
    : 0;
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 부하 테스트 결과');
  console.log('='.repeat(60));
  console.log(`\n🌐 대상 서버: ${API_URL}`);
  console.log(`👥 가상 사용자: ${CONFIG.VIRTUAL_USERS}명`);
  console.log(`⏱️  테스트 시간: ${duration.toFixed(1)}초`);
  console.log(`\n📈 요청 통계:`);
  console.log(`   총 요청: ${results.totalRequests}`);
  console.log(`   성공: ${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`   실패: ${results.failedRequests} (${((results.failedRequests / results.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`   매수 요청: ${results.buyRequests}`);
  console.log(`   매도 요청: ${results.sellRequests}`);
  console.log(`\n⚡ 처리량:`);
  console.log(`   RPS (초당 요청): ${(results.totalRequests / duration).toFixed(2)}`);
  console.log(`   TPS (초당 트랜잭션): ${(results.successfulRequests / duration).toFixed(2)}`);
  console.log(`   최대 동시 요청: ${maxConcurrentRequests}`);
  console.log(`\n⏱️  응답 시간:`);
  console.log(`   평균: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`   P50: ${calculatePercentile(results.responseTimes, 50).toFixed(2)}ms`);
  console.log(`   P90: ${calculatePercentile(results.responseTimes, 90).toFixed(2)}ms`);
  console.log(`   P95: ${calculatePercentile(results.responseTimes, 95).toFixed(2)}ms`);
  console.log(`   P99: ${calculatePercentile(results.responseTimes, 99).toFixed(2)}ms`);
  console.log(`   최소: ${Math.min(...results.responseTimes).toFixed(2)}ms`);
  console.log(`   최대: ${Math.max(...results.responseTimes).toFixed(2)}ms`);
  
  // 에러 분석
  if (results.errors.length > 0) {
    console.log(`\n❌ 에러 분석 (상위 5개):`);
    const errorCounts = {};
    results.errors.forEach(e => {
      const key = e.status || e.error || 'Unknown';
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([key, count]) => {
        console.log(`   ${key}: ${count}건`);
      });
  }
  
  // 권장사항
  console.log(`\n💡 분석 결과:`);
  
  const p95 = calculatePercentile(results.responseTimes, 95);
  const failRate = (results.failedRequests / results.totalRequests) * 100;
  
  if (p95 < 1000 && failRate < 1) {
    console.log(`   ✅ 성능 양호: P95 응답시간 ${p95.toFixed(0)}ms, 실패율 ${failRate.toFixed(2)}%`);
    console.log(`   ✅ 100명의 동시 사용자가 2시간 동안 거래해도 충분히 감당 가능합니다.`);
  } else if (p95 < 2000 && failRate < 5) {
    console.log(`   ⚠️  주의: P95 응답시간 ${p95.toFixed(0)}ms, 실패율 ${failRate.toFixed(2)}%`);
    console.log(`   ⚠️  약간의 지연이 발생할 수 있으나 사용에는 문제없습니다.`);
  } else {
    console.log(`   ❌ 경고: P95 응답시간 ${p95.toFixed(0)}ms, 실패율 ${failRate.toFixed(2)}%`);
    console.log(`   ❌ 성능 개선이 필요합니다. DB 연결 풀 증가 또는 쿼리 최적화를 권장합니다.`);
  }
  
  console.log('='.repeat(60));
}

async function healthCheck() {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🚀 부하 테스트 시작');
  console.log(`📊 대상 서버: ${API_URL}`);
  console.log(`👥 가상 사용자: ${CONFIG.VIRTUAL_USERS}명`);
  console.log(`⏱️  테스트 시간: ${CONFIG.TEST_DURATION_MS / 1000}초`);
  
  // 서버 헬스 체크
  console.log('\n⏳ 서버 헬스 체크 중...');
  const isHealthy = await healthCheck();
  
  if (!isHealthy) {
    console.error('❌ 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.');
    console.log(`   curl ${API_URL}/health 로 확인해보세요.`);
    process.exit(1);
  }
  
  console.log('✅ 서버 헬스 체크 성공');
  console.log('\n⏳ 가상 사용자 생성 및 테스트 시작...');
  
  results.startTime = Date.now();
  
  // 모든 가상 사용자를 동시에 시작
  const userPromises = [];
  for (let i = 1; i <= CONFIG.VIRTUAL_USERS; i++) {
    userPromises.push(simulateUser(i));
  }
  
  // 진행 상황 표시
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - results.startTime) / 1000;
    const rps = results.totalRequests / elapsed;
    process.stdout.write(`\r⏳ 진행 중... ${elapsed.toFixed(0)}초 경과 | 요청: ${results.totalRequests} | RPS: ${rps.toFixed(1)} | 동시: ${currentConcurrentRequests}`);
  }, 1000);
  
  await Promise.all(userPromises);
  
  clearInterval(progressInterval);
  results.endTime = Date.now();
  
  printResults();
}

main().catch(console.error);

