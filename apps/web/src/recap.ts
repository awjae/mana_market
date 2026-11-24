import { MONTHS, fantasyDate, type NewsItem, type Trade } from '@mana/engine';

/** 월간 결산(사실만): 건국력의 달이 바뀔 때의 총자산을 기록해 두었다가 지난달의 변화를 숫자로 보여 준다. 평가·전망 문구는 두지 않는다 */
export const monthKey = (day: number) => { const d = fantasyDate(day); return d.year * 13 + (d.festival ? 0 : d.month); };
export const monthLabel = (key: number) => { const m = key % 13; return `건국력 ${Math.floor(key / 13)}년 ${m === 0 ? '연말 축제' : MONTHS[m - 1].name}`; };

export interface MonthSummary { key: number; start: number; end: number; trades: number; dividends: number; achievements: number; headline?: string }

export function monthSummary(g: { worthLog: Record<string, number>; trades: Trade[]; achv: Record<string, number>; newsLog: NewsItem[] }, key: number): MonthSummary | null {
  const keys = Object.keys(g.worthLog).map(Number).sort((a, b) => a - b);
  const next = keys.find((k) => k > key);
  if (!(key in g.worthLog) || next === undefined) return null;
  const inMonth = (day: number) => monthKey(day) === key;
  const t = g.trades.filter((x) => inMonth(x.day));
  return {
    key, start: g.worthLog[key], end: g.worthLog[next],
    trades: t.filter((x) => x.side !== 'div').length,
    dividends: t.filter((x) => x.side === 'div').reduce((a, x) => a + x.price * x.qty, 0),
    achievements: Object.values(g.achv).filter(inMonth).length,
    headline: g.newsLog.find((n) => n.kind === 'disclosure' && inMonth(n.day))?.text,
  };
}
