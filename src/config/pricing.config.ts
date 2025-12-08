import { registerAs } from "@nestjs/config";

export default registerAs("pricing", () => {
  const N = Number(process.env.PRICING_N ?? 50);        // 참가자 수: 50명
  const T = Number(process.env.PRICING_T ?? 6);         // 팀 수: 6개
  const P0 = Number(process.env.PRICING_P0 ?? 1000);    // 초기 주가: 1,000원
  const C1 = Number(process.env.PRICING_C1 ?? 8000);    // 기준 자본: 8,000원
  const C2 = Number(process.env.PRICING_C2 ?? 5000);    // 기준 자본: 5,000원
  const GAMMA = Number(process.env.PRICING_GAMMA ?? 0.55); // 압축 지수: 0.55 (변동성 적당히)
  const L1 = Number(process.env.PRICING_L1 ?? 0.6);     // 최소 배수: 0.6 (40% 하락)
  const U1 = Number(process.env.PRICING_U1 ?? 2.0);     // 최대 배수: 2.0 (2배 상승 → 최대 100,000원)
  const L2 = Number(process.env.PRICING_L2 ?? 0.7);     // 최소 배수: 0.7
  const U2 = Number(process.env.PRICING_U2 ?? 1.8);     // 최대 배수: 1.8
  const E1 = (N * C1) / T;                              // (50 × 8,000) / 6 = 66,667원
  const E2 = (N * C2) / T;                              // (50 × 5,000) / 6 = 41,667원
  return { N, T, P0, C1, C2, E1, E2, GAMMA, L1, U1, L2, U2 };
});
