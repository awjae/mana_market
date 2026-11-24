import { describe, expect, it } from 'vitest';
import { dateLong, dateShort, dayIndexAt, fantasyDate, marketAtDay, msUntilNextDay, nextDay, skyPhase } from '../src';

const kst = (y: number, m: number, d: number, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h - 9, mi);

describe('현실 시간 ↔ 게임 날짜', () => {
  it('KST 자정에 날짜가 바뀐다', () => {
    expect(dayIndexAt(kst(2026, 1, 1, 0, 0))).toBe(0);
    expect(dayIndexAt(kst(2026, 1, 1, 23, 59))).toBe(0);
    expect(dayIndexAt(kst(2026, 1, 2, 0, 0))).toBe(1);
    expect(dayIndexAt(kst(2026, 11, 23, 12))).toBe(326);
  });
  it('다음 종소리까지 남은 시간', () => {
    expect(msUntilNextDay(kst(2026, 3, 1, 23, 0))).toBe(3600 * 1000);
  });
});

describe('판타지 달력', () => {
  it('건국 첫날과 해의 경계', () => {
    expect(dateLong(0)).toBe('건국력 1024년 새싹달 1일 해의날');
    expect(dateShort(359)).toBe('긴밤달 30일');
    expect(fantasyDate(360).festival).toBe('해넘이제');
    expect(fantasyDate(364).festival).toBe('새벽맞이제');
    expect(fantasyDate(365).year).toBe(1025);
    expect(fantasyDate(365).monthName).toBe('새싹달');
  });
  it('요일은 6일 주기, 매달 같은 요일로 시작한다', () => {
    expect(fantasyDate(0).weekday).toBe(0);
    expect(fantasyDate(6).weekday).toBe(0);
    expect(fantasyDate(30).weekday).toBe(0);
    expect(fantasyDate(31).weekday).toBe(1);
  });
  it('절기가 표시된다', () => {
    expect(fantasyDate(0).holiday?.name).toBe('새해맞이');
  });
});

describe('시간대별 하늘', () => {
  it('가중치의 합은 항상 1', () => {
    for (let h = 0; h < 24; h += 0.25) {
      const p = skyPhase(h);
      expect(p.night + p.dawn + p.day + p.dusk).toBeCloseTo(1, 5);
    }
  });
  it('한낮은 낮, 한밤은 밤', () => {
    expect(skyPhase(13).day).toBeGreaterThan(0.99);
    expect(skyPhase(2).night).toBeGreaterThan(0.99);
  });
});

describe('세계 시장은 날짜만으로 정해진다', () => {
  it('같은 날은 항상 같은 시장, 하루 진행과도 일치', () => {
    expect(marketAtDay(40)).toEqual(marketAtDay(40));
    expect(nextDay(marketAtDay(39))).toEqual(marketAtDay(40));
  });
  it('1년치 계산이 충분히 빠르다', () => {
    const t = performance.now();
    marketAtDay(400);
    expect(performance.now() - t).toBeLessThan(1500);
  });
});
