import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, dividendPerShare, dividendYield, fantasyDate, isDividendDay } from '../src';

describe('분기 배당', () => {
  it('3·6·9·12월 30일에만 지급되고 1년에 네 번이다', () => {
    const days = Array.from({ length: 365 }, (_, i) => i).filter(isDividendDay);
    expect(days.length).toBe(4);
    expect(days.map((d) => fantasyDate(d).month)).toEqual([3, 6, 9, 12]);
    expect(days.every((d) => fantasyDate(d).day === 30)).toBe(true);
  });
  it('연말 축제일에는 지급하지 않는다', () => {
    for (let d = 360; d < 365; d++) expect(isDividendDay(d)).toBe(false);
  });
  it('배당률은 종목마다 양수이고 금융이 마법보다 높다', () => {
    for (const s of DEFAULT_CONFIG.stocks) { const y = dividendYield(s.id); expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(0.02); }
    expect(dividendYield('BANK')).toBeGreaterThan(dividendYield('TOWR'));
  });
  it('주당 배당금은 배당일에만 주가 × 배당률이다', () => {
    const payDay = Array.from({ length: 365 }, (_, i) => i).find(isDividendDay)!;
    expect(dividendPerShare('BANK', payDay, 400)).toBeCloseTo(400 * dividendYield('BANK'), 1);
    expect(dividendPerShare('BANK', payDay + 1, 400)).toBe(0);
  });
});
