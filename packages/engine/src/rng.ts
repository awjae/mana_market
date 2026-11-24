export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** (기본 시드, 날짜) → 그날의 시드 */
export function daySeed(seed: number, day: number): number {
  let h = (seed ^ Math.imul(day + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** 표준정규분포 (Box-Muller) */
export function gauss(r: Rng): number {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

export function pick<T>(r: Rng, xs: T[]): T {
  return xs[Math.floor(r() * xs.length)];
}

export function pickWeighted<T extends { weight: number }>(r: Rng, xs: T[]): T {
  let x = r() * xs.reduce((a, b) => a + b.weight, 0);
  for (const t of xs) if ((x -= t.weight) < 0) return t;
  return xs[xs.length - 1];
}
