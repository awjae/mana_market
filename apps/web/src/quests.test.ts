import { closedMarket, marketAtDay } from '@mana/engine';
import { describe, expect, it } from 'vitest';
import { change } from './format';
import { questsFor } from './quests';

describe('일일 의뢰', () => {
  it('같은 날은 같은 질문·보기·정답, 최대 3개, 보기 4개에 정답이 들어 있다', () => {
    for (const day of [10, 120, 250]) {
      const m = marketAtDay(day), a = questsFor(m), b = questsFor(m);
      expect(a).toEqual(b);
      expect(a.length).toBeGreaterThanOrEqual(2);
      expect(a.length).toBeLessThanOrEqual(3);
      for (const q of a) { expect(q.options).toHaveLength(4); expect(new Set(q.options).size).toBe(4); expect(q.answer).toBeGreaterThanOrEqual(0); expect(q.answer).toBeLessThan(4); }
    }
  });
  it('정답은 실제 데이터와 일치한다(가장 많이 오른 길드)', () => {
    for (let day = 5; day < 400; day += 7) {
      const m = marketAtDay(day), c = closedMarket(m), q = questsFor(m).find((x) => x.id === 'top-up');
      if (!q) continue;
      const best = Object.keys(c.history).sort((a, b) => change(c.history[b]) - change(c.history[a]))[0];
      expect(q.options[q.answer].startsWith(best)).toBe(true);
    }
  });
  it('질문 종류가 여러 가지 나온다', () => {
    const ids = new Set<string>();
    for (let day = 5; day < 200; day += 3) questsFor(marketAtDay(day)).forEach((q) => ids.add(q.id));
    expect(ids.size).toBeGreaterThanOrEqual(4);
  });
});
