import { registerAs } from "@nestjs/config";

export default registerAs("pricing", () => {
  const N = Number(process.env.PRICING_N ?? 100);       // 참가자 수: 100명
  const T = Number(process.env.PRICING_T ?? 6);         // 팀 수: 6개
  const P0 = Number(process.env.PRICING_P0 ?? 1000);     // ⭐ 초기 주가: 1000원
  const C = Number(process.env.PRICING_C ?? 50000);     // 기준 자본: 50,000원 (총 투자 시드 500만원 / 100명)
  const GAMMA = Number(process.env.PRICING_GAMMA ?? 0.2); // 압축 지수: 0.2 (변동성 매우 완만하게 - 주가 민감도 매우 낮춤)
  const L = Number(process.env.PRICING_L ?? 0.6);      // 최소 배수: 0.6 (40% 하락)
  // 1등 투자자 최대 수익 7만원 제한을 위해 최대 배수 조정
  // 초기 자본 50,000원, 최대 총 자산 120,000원 (50,000 + 70,000)
  // 주가 변동으로 인한 수익은 자산 계산 시 최대 7만원으로 제한됨
  const U = Number(process.env.PRICING_U ?? 12.0);      // 최대 배수: 15.0 (15배 상승 → 최대 15,000원)
  const E = (N * C) / T;                                // (100 × 45,000) / 6 = 750,000원 (각 팀이 나눠가지는 총 금액)
  return { N, T, P0, C, E, GAMMA, L, U };
});
