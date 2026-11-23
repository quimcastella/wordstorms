/** A small seeded random number generator (mulberry32 + Box–Muller). */
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [0, max). */
  uniform(max: number): number;
  /** Integer in [0, n). */
  int(n: number): number;
  /** Standard normal. */
  gaussian(): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  let spare: number | null = null;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    uniform: (max) => next() * max,
    int: (n) => Math.floor(next() * n),
    gaussian() {
      if (spare !== null) {
        const s = spare;
        spare = null;
        return s;
      }
      let u = 0;
      while (u === 0) u = next();
      const v = next();
      const r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    },
  };
}
