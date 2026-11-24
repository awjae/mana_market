import { describe, expect, it } from 'vitest';
import { RANKS, adventurerRank, adventurerScore, type AdvState } from './adventurer';

const base: AdvState = { fishLog: {}, dlog: { seen: [] }, rod: 1, gear: 1, daily: { n: 0 }, shop: null, love: null, mounts: [], ownedProps: [] };
describe('모험가 등급', () => {
  it('기록이 없으면 견습, 기록이 쌓일수록 점수가 오른다', () => {
    expect(adventurerScore(base)).toBe(0); expect(adventurerRank(0).name).toBe('견습 모험가');
    const more = { ...base, fishLog: { a: 1, b: 1 }, dlog: { seen: [1, 10] }, rod: 2, gear: 3, shop: { lv: 1 }, love: { stage: 6 }, mounts: [1], ownedProps: [3, 17] };
    expect(adventurerScore(more)).toBe(2 + 4 + 5 + 3 + 6 + 2 + 6 + 2 + 1);
    expect(adventurerScore({ ...base, dlog: { seen: [13, 14] } })).toBe(4 + 10); // 심층 보스도 보스로 센다
  });
  it('문턱을 넘으면 다음 등급, 마지막 등급은 다음이 없다', () => {
    expect(adventurerRank(11).name).toBe('견습 모험가'); expect(adventurerRank(12).name).toBe('모험가'); expect(adventurerRank(12).next?.[1]).toBe('숙련 모험가');
    expect(adventurerRank(999).name).toBe(RANKS[RANKS.length - 1][1]); expect(adventurerRank(999).next).toBeNull();
  });
});
