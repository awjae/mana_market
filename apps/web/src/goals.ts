import { fantasyDate, type Trade } from '@mana/engine';

/** 분기 목표: 건국력의 3개월(봄·여름·가을·겨울)마다 자기 기록 3개. 마나 보상 없이 칭호만 준다. 수익률·자산 목표는 두지 않는다(압박·조언으로 읽히지 않게) */
export const SEASONS = ['봄', '여름', '가을', '겨울'] as const;
export const quarterOf = (day: number) => { const d = fantasyDate(day); const m = d.festival ? 12 : d.month; return d.year * 4 + Math.floor((m - 1) / 3); };
export const quarterLabel = (q: number) => `건국력 ${Math.floor(q / 4)}년 ${SEASONS[q % 4]}`;

export interface Goal { id: 'dividend' | 'guilds' | 'talks'; text: string; have: number; need: number; done: boolean; title: string }
export const GOAL_NEED = { dividend: 10, guilds: 3, talks: 5 };

export function goalsFor(g: { trades: Trade[]; qtalk: { key: number; n: number } }, q: number): Goal[] {
  const season = SEASONS[q % 4];
  const t = g.trades.filter((x) => quarterOf(x.day) === q);
  const div = Math.floor(t.filter((x) => x.side === 'div').reduce((a, x) => a + x.price * x.qty, 0));
  const guilds = new Set(t.filter((x) => x.side !== 'div').map((x) => x.id)).size;
  const talks = g.qtalk.key === q ? g.qtalk.n : 0;
  const mk = (id: Goal['id'], text: string, have: number, suffix: string): Goal => ({ id, text, have, need: GOAL_NEED[id], done: have >= GOAL_NEED[id], title: `${season}의 ${suffix}` });
  return [
    mk('dividend', `배당금 ${GOAL_NEED.dividend} 마나 받기`, div, '수확자'),
    mk('guilds', `서로 다른 길드 ${GOAL_NEED.guilds}곳에서 거래하기`, guilds, '장터 나그네'),
    mk('talks', `히로인과 이야기 ${GOAL_NEED.talks}번 나누기`, talks, '이야기 친구'),
  ];
}
/** 세 목표를 모두 채웠을 때의 칭호 */
export const allTitle = (q: number) => `${SEASONS[q % 4]}의 상인`;
