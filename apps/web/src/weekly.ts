import { hash } from './scene/hash';

/** 주간 도전(건국력 한 주 6일마다 바뀜, 마나 보상 없음): 하루 목표보다 큰 세 가지를 모두 채우면 도전을 한 번 마친 것으로 세고, 쌓이면 칭호를 준다. 안 해도 잃는 것은 없다 */
export const WEEK_DAYS = 6;
export const weekOf = (day: number) => Math.floor(day / WEEK_DAYS);
/** 이번 주 기록(주가 바뀌면 0부터): 낚시·채집·던전 입장 횟수, 던전 최고 층, 새로 만난 몬스터 수 */
export interface WeekStat { k: number; casts: number; gathers: number; tries: number; best: number; seen0: number }
export const freshWeek = (k: number, seen0: number): WeekStat => ({ k, casts: 0, gathers: 0, tries: 0, best: 0, seen0 });
export interface WeeklyGoal { id: string; group: string; text: string; target: number; have: (w: WeekStat, seen: number) => number }
const POOL: WeeklyGoal[] = [
  { id: 'fish20', group: 'fish', text: '낚시 20번 하기', target: 20, have: (w) => w.casts },
  { id: 'fish30', group: 'fish', text: '낚시 30번 하기', target: 30, have: (w) => w.casts },
  { id: 'gather15', group: 'gather', text: '채집 15번 하기', target: 15, have: (w) => w.gathers },
  { id: 'gather25', group: 'gather', text: '채집 25번 하기', target: 25, have: (w) => w.gathers },
  { id: 'dive5', group: 'dive', text: '던전에 5번 들어가기', target: 5, have: (w) => w.tries },
  { id: 'floor4', group: 'floor', text: '던전에서 4층 이상 깨기', target: 4, have: (w) => w.best },
  { id: 'floor6', group: 'floor', text: '던전에서 6층 이상 깨기', target: 6, have: (w) => w.best },
  { id: 'newmon', group: 'mon', text: '새 몬스터 2종 만나기', target: 2, have: (w, seen) => Math.max(0, seen - w.seen0) },
];
/** 이번 주 도전 3개(같은 종류는 하나만). 모든 몬스터를 만났으면 새 몬스터 도전은 빠진다 */
export function weeklyGoals(week: number, seenAll: boolean): WeeklyGoal[] {
  const pool = POOL.filter((x) => !(seenAll && x.group === 'mon'));
  const order = [...pool].sort((a, b) => hash(week, pool.indexOf(a), 57) - hash(week, pool.indexOf(b), 57)), seen = new Set<string>(), out: WeeklyGoal[] = [];
  for (const x of order) if (!seen.has(x.group)) { seen.add(x.group); out.push(x); if (out.length === 3) break; }
  return out;
}
export const WEEKLY_TITLES: [number, string][] = [[3, '주간의 도전자'], [8, '한결같은 모험가'], [20, '왕국의 개척자']];
export const nextWeeklyTitle = (n: number) => WEEKLY_TITLES.find(([need]) => need > n) ?? null;
