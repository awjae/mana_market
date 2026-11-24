import { describe, expect, it } from 'vitest';
import { monthKey, monthLabel, monthSummary } from './recap';

describe('월간 결산', () => {
  it('달 키는 같은 달 안에서 같고 달이 바뀌면 다르다', () => {
    expect(monthKey(0)).toBe(monthKey(29));
    expect(monthKey(30)).not.toBe(monthKey(29));
    expect(monthKey(361)).toBe(monthKey(360)); // 연말 축제
    expect(monthLabel(monthKey(0))).toContain('새싹달');
  });
  it('기록이 두 달 이상 있어야 지난달이 나오고 숫자만 계산한다', () => {
    const k = monthKey(40), k2 = monthKey(70);
    const base = { trades: [{ day: 45, id: 'IRON', side: 'buy' as const, qty: 1, price: 100 }, { day: 50, id: 'IRON', side: 'div' as const, qty: 2, price: 5 }], achv: { a: 41, b: 100 }, newsLog: [{ day: 46, kind: 'disclosure' as const, templateId: 'x', scope: 'stock' as const, tone: 'good' as const, text: '공시 하나', targetStockIds: [] }] };
    expect(monthSummary({ ...base, worthLog: { [k]: 10000 } }, k)).toBeNull();
    const r = monthSummary({ ...base, worthLog: { [k]: 10000, [k2]: 10500 } }, k)!;
    expect(r).toMatchObject({ start: 10000, end: 10500, trades: 1, dividends: 10, achievements: 1, headline: '공시 하나' });
  });
});
