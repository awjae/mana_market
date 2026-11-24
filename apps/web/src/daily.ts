import { hash } from './scene/hash';

/** 오늘의 모험 목표(마나 보상 없음): 날짜로 정해진 세 가지를 모두 채우면 "함께한 날"이 하루 늘고, 날수가 쌓이면 칭호를 준다. 안 해도 잃는 것은 없다 */
export interface DailyState { act: { casts: number; tries: number; sold: number; day: number }; gather: { day: number; n?: number }; bond: Record<string, { day: number }>; market: { day: number } }
export interface DailyGoal { id: string; group: string; text: string; target: number; have: (g: DailyState) => number }
const today = (g: DailyState) => (g.act.day === g.market.day ? g.act : { casts: 0, tries: 0, sold: 0 });
const POOL: DailyGoal[] = [
  { id: 'fish4', group: 'fish', text: '낚시 4번 하기', target: 4, have: (g) => today(g).casts },
  { id: 'fish8', group: 'fish', text: '낚시 8번 하기', target: 8, have: (g) => today(g).casts },
  { id: 'gather3', group: 'gather', text: '채집 3번 하기', target: 3, have: (g) => (g.gather.day === g.market.day ? g.gather.n ?? 0 : 0) },
  { id: 'gather6', group: 'gather', text: '채집 6번 하기', target: 6, have: (g) => (g.gather.day === g.market.day ? g.gather.n ?? 0 : 0) },
  { id: 'dive1', group: 'dive', text: '던전에 1번 들어가기', target: 1, have: (g) => today(g).tries },
  { id: 'dive2', group: 'dive', text: '던전에 2번 들어가기', target: 2, have: (g) => today(g).tries },
  { id: 'sell10', group: 'sell', text: '재료를 넘겨 10 마나 받기', target: 10, have: (g) => today(g).sold },
  { id: 'story', group: 'story', text: '히로인과 이야기 나누기', target: 1, have: (g) => Object.values(g.bond).filter((b) => b.day === g.market.day).length },
];
/** 오늘의 목표 3개(같은 종류는 하나만) */
export function dailyGoals(day: number): DailyGoal[] {
  const order = [...POOL].sort((a, b) => hash(day, POOL.indexOf(a), 55) - hash(day, POOL.indexOf(b), 55)), seen = new Set<string>(), out: DailyGoal[] = [];
  for (const x of order) if (!seen.has(x.group)) { seen.add(x.group); out.push(x); if (out.length === 3) break; }
  return out;
}
export const allDailyDone = (g: DailyState) => dailyGoals(g.market.day).every((x) => x.have(g) >= x.target);
/** 함께한 날 수 → 칭호 */
export const DAILY_TITLES: [number, string][] = [[5, '부지런한 모험가'], [15, '마을의 단골 모험가'], [30, '이름난 모험가'], [60, '왕국의 전설']];
export const nextDailyTitle = (n: number) => DAILY_TITLES.find(([need]) => need > n) ?? null;
