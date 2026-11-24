import { describe, expect, it } from 'vitest';
import { DAILY_TITLES, allDailyDone, dailyGoals, nextDailyTitle, type DailyState } from './daily';

describe('오늘의 모험 목표', () => {
  it('날짜로 정해진 세 가지, 같은 종류는 하나만', () => {
    for (let d = 0; d < 120; d++) { const g = dailyGoals(d); expect(g).toHaveLength(3); expect(new Set(g.map((x) => x.group)).size).toBe(3); expect(g.map((x) => x.id)).toEqual(dailyGoals(d).map((x) => x.id)); }
    expect(new Set(Array.from({ length: 60 }, (_, d) => dailyGoals(d).map((x) => x.id).join())).size).toBeGreaterThan(10);
  });
  it('기록으로 진행도를 세고 모두 채우면 달성', () => {
    const day = 77, goals = dailyGoals(day);
    const none: DailyState = { act: { day: -1, casts: 0, tries: 0, sold: 0 }, gather: { day: -1 }, bond: {}, market: { day } };
    expect(allDailyDone(none)).toBe(false);
    const full: DailyState = { act: { day, casts: 99, tries: 99, sold: 99 }, gather: { day, n: 99 }, bond: { a: { day } }, market: { day } };
    expect(goals.every((x) => x.have(full) >= x.target)).toBe(true); expect(allDailyDone(full)).toBe(true);
    expect(goals.every((x) => x.have({ ...full, market: { day: day + 1 } }) === 0 || x.group === 'story')).toBe(true); // 다음 날엔 기록이 초기화된다
  });
  it('날수가 쌓이면 칭호가 열린다', () => { expect(DAILY_TITLES.map(([n]) => n)).toEqual([5, 15, 30, 60]); expect(nextDailyTitle(5)?.[0]).toBe(15); expect(nextDailyTitle(60)).toBeNull(); });
});
