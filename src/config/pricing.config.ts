import { registerAs } from "@nestjs/config";

export default registerAs("pricing", () => {
  const N = Number(process.env.PRICING_N ?? 50);        // 200 → 50 (참가자 수 감소)
  const T = Number(process.env.PRICING_T ?? 6);
  const P0 = Number(process.env.PRICING_P0 ?? 1000);
  const C1 = Number(process.env.PRICING_C1 ?? 5000);    // 30,000 → 5,000 (자본 감소)
  const C2 = Number(process.env.PRICING_C2 ?? 3000);    // 20,000 → 3,000
  const GAMMA = Number(process.env.PRICING_GAMMA ?? 0.5);
  const L1 = Number(process.env.PRICING_L1 ?? 0.7);
  const U1 = Number(process.env.PRICING_U1 ?? 1.5);
  const L2 = Number(process.env.PRICING_L2 ?? 0.8);
  const U2 = Number(process.env.PRICING_U2 ?? 1.4);
  const E1 = (N * C1) / T;                              // (50 × 5,000) / 6 = 41,667원
  const E2 = (N * C2) / T;
  return { N, T, P0, C1, C2, E1, E2, GAMMA, L1, U1, L2, U2 };
});
