import { isDividendDay, fantasyDate } from '@mana/engine';
import { HEROINES } from './scene/heroines';
import type { Order } from '@mana/engine';
import { nextUnlock } from './scene/townFx';
import { josa } from './josa';

/** "다음에 들를 이유": 일정만 사실로 알려 준다(압박·불이익·전망 문구 없음). 해당하는 것 중 하나만 돌려준다 */
export function nextReason(g: { market: { day: number }; holdings: Record<string, unknown>; orders: Order[]; bond: Record<string, { pts: number; day: number }>; spent?: number }): string | null {
  const day = g.market.day;
  const open = Object.values(HEROINES).find((h) => (g.bond[h.id]?.pts ?? 0) > 0 && (g.bond[h.id]?.pts ?? 0) < h.story.length && g.bond[h.id]?.day !== day);
  if (open) return `${open.name}의 다음 이야기가 기다리고 있어.`;
  const waiting = g.orders.filter((o) => o.side !== 'alert').length;
  if (waiting) return `예약 주문 ${waiting}건이 시세를 기다리고 있어.`;
  if (Object.keys(g.holdings).length) {
    for (let k = 1; k <= 120; k++) if (isDividendDay(day + k) && !fantasyDate(day + k).festival) return k === 1 ? '내일이 배당일이야.' : `다음 배당일까지 ${k}일 남았어.`;
  }
  const nu = g.spent !== undefined ? nextUnlock(g.spent) : null;
  if (nu) return `쓴 마나가 ${(nu.need - g.spent!).toLocaleString('ko-KR')} 마나 더 쌓이면 ${josa(nu.name, '이가')} 열려.`;
  return null;
}

/** 보유 종목이 어제보다 ±10% 넘게 움직였을 때의 사실 한 줄(과거 사실만, 전망·권유 없음). 그날 그 종목의 소식이 있었는지도 알려 준다 */
export function bigMoveLine(g: { holdings: Record<string, unknown>; market: { history: Record<string, number[]>; news: { targetStockIds: string[] }[] } }): string | null {
  for (const id of Object.keys(g.holdings)) {
    const h = g.market.history[id];
    if (!h || h.length < 2) continue;
    const c = h[h.length - 1] / h[h.length - 2] - 1;
    if (Math.abs(c) < 0.1) continue;
    const why = g.market.news.some((n) => n.targetStockIds.includes(id)) ? '소식 탭에 관련 소식이 있어.' : '특별한 소식은 없었어.';
    return `오늘 ${id}가 ${Math.round(Math.abs(c) * 100)}% 크게 ${c > 0 ? '올랐어' : '내렸어'}. ${why}`;
  }
  return null;
}

/** 최근 30일 고점 대비 지금 가격의 낙폭(사실 표시용). 10% 미만이면 null */
export function drawdownFromHigh(history: number[]): number | null {
  const w = history.slice(-31), hi = Math.max(...w), d = w[w.length - 1] / hi - 1;
  return d <= -0.1 ? d : null;
}

/** 첫 거래 뒤 2주 안에 총자산이 시작 자금보다 적을 때의 사실 한 줄(권유·전망 없음) */
export function belowStartLine(g: { trades: { day: number }[]; market: { day: number }; worth: number; spent: number; start: number }): string | null {
  const first = g.trades[0]?.day;
  if (first === undefined || g.market.day - first > 14) return null;
  const gap = g.start - g.spent - g.worth;
  return gap >= 1 ? `총자산이 시작 자금보다 ${Math.round(gap).toLocaleString('ko-KR')} 마나 적어. 시세는 오르내리고, 가진 주식은 팔기 전까지는 손익이 확정되지 않아.` : null;
}
