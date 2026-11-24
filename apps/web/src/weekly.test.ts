import { describe, expect, it } from 'vitest';
import { WEEKLY_TITLES, WEEK_DAYS, freshWeek, nextWeeklyTitle, weekOf, weeklyGoals } from './weekly';

describe('주간 도전', () => {
  it('한 주는 6일이고 주마다 서로 다른 종류 3개가 정해진다', () => {
    expect(weekOf(0)).toBe(0); expect(weekOf(5)).toBe(0); expect(weekOf(6)).toBe(1); expect(WEEK_DAYS).toBe(6);
    for (let w = 0; w < 80; w++) { const g = weeklyGoals(w, false); expect(g).toHaveLength(3); expect(new Set(g.map((x) => x.group)).size).toBe(3); expect(g.map((x) => x.id)).toEqual(weeklyGoals(w, false).map((x) => x.id)); }
    expect(new Set(Array.from({ length: 60 }, (_, w) => weeklyGoals(w, false).map((x) => x.id).join())).size).toBeGreaterThan(8);
  });
  it('모든 몬스터를 만났으면 새 몬스터 도전은 나오지 않는다', () => { for (let w = 0; w < 80; w++) expect(weeklyGoals(w, true).some((x) => x.group === 'mon')).toBe(false); });
  it('기록으로 진행도를 세고 칭호는 3·8·20번째', () => {
    const w = { ...freshWeek(5, 4), casts: 30, gathers: 25, tries: 5, best: 6 };
    for (const x of weeklyGoals(5, false)) if (x.group !== 'mon') expect(x.have(w, 6)).toBeGreaterThanOrEqual(x.target);
    expect(weeklyGoals(0, false).map((x) => x.have(freshWeek(0, 0), 0))).toEqual([0, 0, 0]);
    expect(WEEKLY_TITLES.map(([n]) => n)).toEqual([3, 8, 20]); expect(nextWeeklyTitle(3)?.[0]).toBe(8); expect(nextWeeklyTitle(20)).toBeNull();
  });
});
