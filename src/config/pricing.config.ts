import { registerAs } from "@nestjs/config";

export default registerAs("pricing", () => {
  const N = Number(process.env.PRICING_N ?? 200);
  const T = Number(process.env.PRICING_T ?? 6);
  const P0 = Number(process.env.PRICING_P0 ?? 1000);
  const C1 = Number(process.env.PRICING_C1 ?? 30000);
  const C2 = Number(process.env.PRICING_C2 ?? 20000);
  const GAMMA = Number(process.env.PRICING_GAMMA ?? 0.5);
  const L1 = Number(process.env.PRICING_L1 ?? 0.7);
  const U1 = Number(process.env.PRICING_U1 ?? 1.5);
  const L2 = Number(process.env.PRICING_L2 ?? 0.8);
  const U2 = Number(process.env.PRICING_U2 ?? 1.4);
  const E1 = (N * C1) / T;
  const E2 = (N * C2) / T;
  return { N, T, P0, C1, C2, E1, E2, GAMMA, L1, U1, L2, U2 };
});
