import { describe, expect, it } from 'vitest';
import { allTitle, goalsFor, quarterLabel, quarterOf } from './goals';

describe('분기 목표', () => {
  it('분기는 석 달이고 연말 축제는 겨울에 속한다', () => {
    expect(quarterOf(0)).toBe(quarterOf(89));
    expect(quarterOf(90)).toBe(quarterOf(0) + 1);
    expect(quarterOf(361)).toBe(quarterOf(300)); // 12월과 축제는 같은 분기
    expect(quarterLabel(quarterOf(0))).toContain('봄');
  });
  it('목표 진행은 그 분기의 기록만 센다', () => {
    const q = quarterOf(100);
    const t = [
      { day: 100, id: 'IRON', side: 'buy' as const, qty: 1, price: 100 },
      { day: 101, id: 'BANK', side: 'sell' as const, qty: 1, price: 100 },
      { day: 102, id: 'GRAN', side: 'buy' as const, qty: 1, price: 100 },
      { day: 110, id: 'IRON', side: 'div' as const, qty: 5, price: 3 },
      { day: 10, id: 'SHIP', side: 'buy' as const, qty: 1, price: 100 }, // 다른 분기
    ];
    const g = goalsFor({ trades: t, qtalk: { key: q, n: 5 } }, q);
    expect(g.find((x) => x.id === 'guilds')).toMatchObject({ have: 3, done: true, title: '여름의 장터 나그네' });
    expect(g.find((x) => x.id === 'dividend')).toMatchObject({ have: 15, done: true });
    expect(g.find((x) => x.id === 'talks')).toMatchObject({ have: 5, done: true });
    expect(goalsFor({ trades: t, qtalk: { key: q - 1, n: 9 } }, q).find((x) => x.id === 'talks')!.have).toBe(0);
    expect(allTitle(q)).toBe('여름의 상인');
  });
});
