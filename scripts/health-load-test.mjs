/**
 * 헬스체크 & 공개 API 부하 테스트
 * 인증 없이 서버의 기본 처리 능력을 확인합니다.
 * 
 * 사용법: node scripts/health-load-test.mjs [API_URL]
 */

const API_URL = process.argv[2] || 'http://localhost:3001';

const CONFIG = {
  VIRTUAL_USERS: 100,
  TEST_DURATION_MS: 60 * 1000, // 1분
  REQUEST_INTERVAL_MS: 100,    // 100ms마다 요청
};

const results = {
  health: { total: 0, success: 0, times: [] },
  teams: { total: 0, success: 0, times: [] },
  prices: { total: 0, success: 0, times: [] },
};

async function testEndpoint(name, url) {
  const start = performance.now();
  try {
    const res = await fetch(url);
    const duration = performance.now() - start;
    results[name].total++;
    results[name].times.push(duration);
    if (res.ok) results[name].success++;
    return { success: res.ok, duration };
  } catch (e) {
    results[name].total++;
    return { success: false, duration: performance.now() - start };
  }
}

async function simulateUser(userId) {
  const endTime = Date.now() + CONFIG.TEST_DURATION_MS;
  
  while (Date.now() < endTime) {
    // 랜덤하게 엔드포인트 선택
    const rand = Math.random();
    if (rand < 0.4) {
      await testEndpoint('health', `${API_URL}/health`);
    } else if (rand < 0.7) {
      await testEndpoint('teams', `${API_URL}/api/teams`);
    } else {
      // 팀 상세 조회 (ID 1~6)
      const teamId = Math.floor(Math.random() * 6) + 1;
      await testEndpoint('prices', `${API_URL}/api/teams/${teamId}`);
    }
    
    await new Promise(r => setTimeout(r, CONFIG.REQUEST_INTERVAL_MS));
  }
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.ceil(p / 100 * sorted.length) - 1] || 0;
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 헬스체크 & 공개 API 부하 테스트 결과');
  console.log('='.repeat(60));
  
  for (const [name, data] of Object.entries(results)) {
    if (data.total === 0) continue;
    const avg = data.times.reduce((a, b) => a + b, 0) / data.times.length;
    const successRate = (data.success / data.total * 100).toFixed(2);
    
    console.log(`\n📍 ${name.toUpperCase()}:`);
    console.log(`   총 요청: ${data.total}`);
    console.log(`   성공률: ${successRate}%`);
    console.log(`   평균: ${avg.toFixed(2)}ms`);
    console.log(`   P50: ${percentile(data.times, 50).toFixed(2)}ms`);
    console.log(`   P95: ${percentile(data.times, 95).toFixed(2)}ms`);
    console.log(`   P99: ${percentile(data.times, 99).toFixed(2)}ms`);
  }
  
  // 종합 분석
  const allTimes = [...results.health.times, ...results.teams.times, ...results.prices.times];
  const totalRequests = results.health.total + results.teams.total + results.prices.total;
  const totalSuccess = results.health.success + results.teams.success + results.prices.success;
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 종합 분석');
  console.log('='.repeat(60));
  console.log(`총 요청: ${totalRequests}`);
  console.log(`총 성공: ${totalSuccess} (${(totalSuccess/totalRequests*100).toFixed(2)}%)`);
  console.log(`전체 P95: ${percentile(allTimes, 95).toFixed(2)}ms`);
  console.log(`RPS: ${(totalRequests / (CONFIG.TEST_DURATION_MS / 1000)).toFixed(2)}`);
  
  const p95 = percentile(allTimes, 95);
  const successRate = totalSuccess / totalRequests * 100;
  
  if (p95 < 500 && successRate > 95) {
    console.log('\n✅ 결론: 서버 성능 양호! 100명 동시 접속 처리 가능');
  } else if (p95 < 1000 && successRate > 90) {
    console.log('\n⚠️  결론: 성능 보통. 피크 시간대 약간의 지연 예상');
  } else {
    console.log('\n❌ 결론: 성능 개선 필요');
  }
}

async function main() {
  console.log('🚀 헬스체크 & 공개 API 부하 테스트');
  console.log(`📊 대상: ${API_URL}`);
  console.log(`👥 가상 사용자: ${CONFIG.VIRTUAL_USERS}명`);
  console.log(`⏱️  테스트 시간: ${CONFIG.TEST_DURATION_MS / 1000}초\n`);
  
  // 서버 확인
  try {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error('Health check failed');
    console.log('✅ 서버 연결 확인\n');
  } catch (e) {
    console.error('❌ 서버에 연결할 수 없습니다');
    process.exit(1);
  }
  
  // 테스트 실행
  const users = [];
  for (let i = 0; i < CONFIG.VIRTUAL_USERS; i++) {
    users.push(simulateUser(i));
  }
  
  const interval = setInterval(() => {
    const total = results.health.total + results.teams.total + results.prices.total;
    process.stdout.write(`\r⏳ 진행 중... 요청: ${total}`);
  }, 1000);
  
  await Promise.all(users);
  clearInterval(interval);
  
  printResults();
}

main();

