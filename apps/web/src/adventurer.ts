import { BOSS_KINDS } from './dungeon';

/** 모험가 등급: 저장하지 않고 기록(도감·장비·마을·인연·탈것·함께한 날)에서 계산한다. 마나 보상 없음, 자랑용 한 줄 */
export interface AdvState {
  fishLog: Record<string, number>; dlog: { seen: number[] }; rod: number; gear: number; daily: { n: number };
  shop: { lv: number } | null; love: { stage: number } | null; mounts: number[]; ownedProps: number[];
}
export const RANKS: [number, string][] = [[0, '견습 모험가'], [12, '모험가'], [30, '숙련 모험가'], [55, '베테랑 모험가'], [85, '영웅'], [120, '전설의 모험가']];
export function adventurerScore(g: AdvState): number {
  const bosses = g.dlog.seen.filter((k) => BOSS_KINDS.includes(k)).length;
  return Object.keys(g.fishLog).length + g.dlog.seen.length * 2 + bosses * 5 + (g.rod - 1) * 3 + (g.gear - 1) * 3 + g.daily.n
    + (g.shop ? 2 : 0) + (g.love ? (g.love.stage >= 6 ? 6 : 1) : 0) + g.mounts.length * 2 + g.ownedProps.filter((p) => p >= 17).length;
}
export function adventurerRank(score: number) {
  let i = 0; while (i + 1 < RANKS.length && score >= RANKS[i + 1][0]) i++;
  return { name: RANKS[i][1], next: RANKS[i + 1] ?? null, level: i };
}
