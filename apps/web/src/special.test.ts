import { describe, expect, it } from 'vitest';
import { catchOf } from './activity';
import { nodesFor } from './dungeon';
import { rareFind } from './gather';
import { SPECIALS, specialOf } from './special';

const days = Array.from({ length: 400 }, (_, i) => i), on = (id: string) => days.filter((d) => specialOf(d).id === id);
describe('오늘의 특별 날', () => {
  it('날짜로 정해지고 5종류가 모두 나오며 어제와 같은 종류가 연달아 오지 않는다', () => {
    expect(new Set(days.map((d) => specialOf(d).id)).size).toBe(5);
    for (let d = 1; d < 400; d++) { expect(specialOf(d)).toEqual(specialOf(d)); expect(specialOf(d).id).not.toBe(specialOf(d - 1).id); }
    const plain = on('plain').length / 400; expect(plain).toBeGreaterThan(0.1); expect(plain).toBeLessThan(0.3);
    for (const s of Object.values(SPECIALS)) expect(s.desc.length).toBeGreaterThan(5);
  });
  it('풍어의 날엔 생물·물건이 더 자주, 풍년의 날엔 귀한 것을 더 자주 찾는다', () => {
    const rate = (ds: number[], f: (d: number, c: number) => boolean) => ds.flatMap((d) => Array.from({ length: 20 }, (_, c) => f(d, c))).filter(Boolean).length / (ds.length * 20);
    const nonFish = (d: number, c: number) => catchOf(d, c, 4).kind !== 'fish';
    const other = days.filter((d) => !['bigcatch'].includes(specialOf(d).id) && !on('plain').includes(d) === false || specialOf(d).id === 'plain');
    expect(rate(on('bigcatch'), nonFish)).toBeGreaterThan(rate(other.slice(0, 120), nonFish) * 1.4);
    const rare = (d: number, c: number) => rareFind(d, 1, c);
    expect(rate(on('harvest'), rare)).toBeGreaterThan(rate(on('plain'), rare) * 1.5);
  });
  it('떠돌이 상인의 날엔 층 사이마다 상인이 길에 하나 있다', () => {
    for (const d of on('merchant').slice(0, 30)) for (let f = 1; f < 20; f++) expect(nodesFor(d, f)).toContain('shop');
  });
});
