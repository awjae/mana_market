import { describe, expect, it } from 'vitest';
import { eventOf, eventTitle } from './events';
import { catchOf } from './activity';
import { monsterFor, themeOf } from './dungeon';

describe('축제·기념일 이벤트', () => {
  const evDay = Array.from({ length: 365 }, (_, i) => i).find((d) => eventOf(d)), plain = Array.from({ length: 365 }, (_, i) => i).find((d) => !eventOf(d))!;
  it('1년에 축제 5일과 기념일 7일이 이벤트다', () => {
    const days = Array.from({ length: 365 }, (_, i) => i).filter((d) => eventOf(d));
    expect(days).toHaveLength(12); expect(new Set(days.map((d) => eventOf(d)!.key)).size).toBe(12);
    expect(eventOf(plain)).toBeNull(); expect(eventTitle(eventOf(evDay!)!)).toContain('손님');
  });
  it('이벤트 날에만 낚시에 축제 물고기, 던전 3층에 축제 도깨비가 나온다', () => {
    expect(evDay).toBeDefined();
    const kinds = new Set(Array.from({ length: 60 }, (_, c) => catchOf(evDay!, c, 4).kind));
    expect(kinds.has('event')).toBe(true);
    expect(Array.from({ length: 80 }, (_, c) => catchOf(plain, c, 4).kind).includes('event')).toBe(false);
    expect(monsterFor(evDay!, 3).kind).toBe(12); expect(monsterFor(plain, 3).kind).not.toBe(12);
  });
  it('던전 테마는 날짜로 고정되고 세 가지가 모두 나온다', () => { const t = new Set(Array.from({ length: 120 }, (_, d) => themeOf(d))); expect(t.size).toBe(3); expect(themeOf(7)).toBe(themeOf(7)); });
});
