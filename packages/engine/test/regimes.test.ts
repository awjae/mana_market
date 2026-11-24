import { describe, expect, it } from 'vitest';
import { blocksUpTo, createMarket, nextDay, regimeAt, regimeNews } from '../src';
import { FIRST_CALM } from '../src/regimes';

describe('시장 국면', () => {
  it('같은 시드와 날짜는 항상 같은 국면이다', () => {
    for (const d of [0, 10, 100, 333]) expect(regimeAt(7, d)).toEqual(regimeAt(7, d));
  });
  it('첫 평온 구간(며칠)은 항상 평온하다(새 플레이어를 위해)', () => {
    for (let d = 0; d < FIRST_CALM; d++) expect(regimeAt(123, d).kind).toBe('calm');
  });
  it('버블 다음에는 반드시 폭락이 온다', () => {
    for (const seed of [1, 2, 3, 99, 2026]) {
      const bl = blocksUpTo(seed, 3000);
      bl.slice(0, -1).forEach((b, i) => { if (b.kind === 'bubble') expect(bl[i + 1].kind).toBe('crash'); });
    }
  });
  it('같은 국면이 연달아 오지 않고, 폭락 직후엔 버블이 오지 않는다', () => {
    for (const seed of [1, 2, 3, 99, 2026, 20260101]) {
      const bl = blocksUpTo(seed, 5000);
      bl.slice(1).forEach((b, i) => { expect(b.kind).not.toBe(bl[i].kind); if (bl[i].kind === 'crash') expect(b.kind).not.toBe('bubble'); });
    }
  });
  it('1000일 동안 네 가지 국면이 모두 나온다', () => {
    const kinds = new Set(blocksUpTo(2026, 1000).map((b) => b.kind));
    expect(kinds).toEqual(new Set(['calm', 'boom', 'bubble', 'crash']));
  });
  it('폭락 구간의 지수 하락이 평온 구간보다 크다', () => {
    const seed = 2026; const bl = blocksUpTo(seed, 2000);
    const crash = bl.find((b) => b.kind === 'crash')!;
    let m = createMarket(seed); const idx: number[] = [m.index[0]];
    for (let d = 0; d < crash.start + crash.len + 1; d++) { m = nextDay(m); idx.push(m.index[m.index.length - 1]); }
    expect(idx[crash.start + crash.len] / idx[crash.start]).toBeLessThan(1);
  });
  it('국면 전환 소식은 시작 날에만, 가격은 0 이하로 가지 않는다', () => {
    const seed = 2026; const bl = blocksUpTo(seed, 300), b = bl.find((x) => x.kind === 'crash')!;
    expect(regimeNews(seed, b.start)?.templateId).toBe('regime_crash');
    expect(regimeNews(seed, b.start + 3)).toBeNull();
    let m = createMarket(seed);
    for (let d = 0; d < 400; d++) { m = nextDay(m); for (const p of Object.values(m.prices)) expect(p).toBeGreaterThan(0); }
  });
});
