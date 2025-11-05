export function clip(x: number, min: number, max: number): number {
  if (Number.isNaN(x)) return min;
  return Math.min(Math.max(x, min), max);
}

export function rootCompress(d: number, gamma: number): number {
  if (d <= 0) return 0;
  return Math.pow(d, gamma);
}
