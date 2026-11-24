import { dividendPerShare, isDividendDay } from './dividends';
import { SLOTS, quoteAt, slotIndexAt } from './intraday';
import type { MarketState } from './types';

/** 플레이어 포트폴리오 규칙(순수 함수): 웹 store와 2단계 서버가 같은 규칙을 쓴다 */
/** 서버가 내려 주는 첫 밑천(웹 스토리의 START_CASH와 같다) */
export const START_CASH_SERVER = 30000;
export const round2 = (x: number) => Math.round(x * 100) / 100;
/** 거래 수수료: 매수·매도 금액의 0.2%(마나 소각). 매수 수수료는 평단에 포함되고 매도 수수료는 받는 금액에서 빠진다 */
export const FEE_RATE = 0.002;
export const feeOf = (amount: number, rate = FEE_RATE) => round2(amount * rate);

export interface Holding { qty: number; cost: number } // cost = 총 매수 금액
/** 거래 기록: side=buy/sell/div(배당), pnl=매도 때의 실현 손익(평단 대비), div일 땐 price=한 주당 배당금 */
export interface Trade { day: number; id: string; side: 'buy' | 'sell' | 'div'; qty: number; price: number; pnl?: number; lim?: boolean; /** 거래 수수료(없으면 수수료 도입 전 기록) */ fee?: number }

/** 지정가 예약 주문: 날짜가 넘어가며 시세가 조건에 닿으면 그날 시세로 체결된다. 30일이 지나면 사라진다 */
export interface Order { uid: number; id: string; side: 'buy' | 'sell' | 'alert'; qty: number; limit: number; day: number; /** 주문한 15분 슬롯(없으면 예전 주문: 다음 날부터 본다) */ slot?: number; /** alert 전용: 이 가격 이상(true)/이하(false)가 되면 알린다 */ above?: boolean }
/** 알림이 울린 기록 */
export interface Fired { id: string; limit: number; day: number; above: boolean }
export const ORDER_DAYS = 30, MAX_ORDERS = 8;

/** from(제외)~to(포함)의 하루하루: 예약 주문 체결 → 그날이 배당일이면 지금 가진 주식에 배당. 자리를 비운 동안도 정확히 따라잡는다.
 *  `nowMs`를 주면 일중 규칙(m은 진짜 시장): 주문·알림은 15분 슬롯마다 검사해 처음 조건에 닿은 슬롯가로 체결하고,
 *  배당은 종가가 확정된(오늘 이전) 날만 지급한다. 안 주면 예전 규칙(하루 종가 기준, 서버용). */
export function settleDays(cash: number, holdings: Record<string, Holding>, trades: Trade[], m: MarketState, from: number, to: number, orders: Order[] = [], nowMs?: number, reserve = 0) {
  let c = cash, hold = holdings, fired: Fired[] = []; const out = [...trades];
  const px = (id: string, day: number) => m.history[id][Math.min(day, m.history[id].length - 1)];
  const intra = nowMs !== undefined, nowSlot = intra ? slotIndexAt(nowMs) : SLOTS;
  type Hit = { day: number; slot: number; p: number };
  /** 주문이 (cur일 cs슬롯부터) 처음 조건에 닿는 순간 */
  const firstHit = (o: Order, curDay: number, curSlot: number): Hit | null => {
    const ok = (p: number) => (o.side === 'alert' ? (o.above ? p >= o.limit : p <= o.limit) : o.side === 'buy' ? p <= o.limit : p >= o.limit);
    for (let day = Math.max(o.day, curDay); day <= to; day++) {
      if (day > o.day + ORDER_DAYS) return null;
      if (!intra) { if (day > o.day && ok(px(o.id, day))) return { day, slot: SLOTS, p: px(o.id, day) }; continue; }
      const placed = day === o.day ? (o.slot === undefined ? SLOTS : o.slot) + 1 : 0; // 주문한 순간 다음 슬롯부터
      const s0 = Math.max(placed, day === curDay ? curSlot : 0), s1 = day === m.day ? nowSlot : SLOTS;
      for (let sl = s0; sl <= s1; sl++) { const p = quoteAt(m, o.id, day, sl); if (ok(p)) return { day, slot: sl, p }; }
    }
    return null;
  };
  const left: { o: Order; d: number; s: number }[] = orders.map((o) => ({ o, d: from + 1, s: 0 }));
  const payDay = (day: number) => {
    if (!isDividendDay(day)) return;
    for (const [id, h] of Object.entries(hold)) {
      const per = dividendPerShare(id, day, px(id, day));
      if (per > 0) { c = round2(c + per * h.qty); out.push({ day, id, side: 'div', qty: h.qty, price: per }); }
    }
  };
  const lastPay = intra ? Math.min(to, m.day - 1) : to; // 일중 규칙: 오늘 종가는 아직 정해지지 않았다
  for (let day = from + 1; day <= to; day++) {
    // 이 날까지 닿은 주문을 시간 순서로 하나씩 처리한다
    for (;;) {
      let best: { i: number; h: Hit } | null = null;
      left.forEach((x, i) => {
        const h = firstHit(x.o, x.d, x.s);
        if (h && h.day <= day && (!best || h.day < best.h.day || (h.day === best.h.day && h.slot < best.h.slot))) best = { i, h };
      });
      if (!best) break;
      const { i, h } = best as { i: number; h: Hit }, o = left[i].o, p = h.p;
      const drop = () => left.splice(i, 1), retry = () => { left[i].d = h.day; left[i].s = h.slot + 1; };
      if (day > o.day + ORDER_DAYS) { drop(); continue; }
      if (o.side === 'alert') { fired.push({ id: o.id, limit: o.limit, day: h.day, above: !!o.above }); drop(); continue; }
      if (o.side === 'buy') {
        const total = round2(p * o.qty), fee = feeOf(total);
        if (total + fee > c - reserve) { retry(); continue; } // 마나가 모자라면 다음 순간에 다시 본다
        const hd = hold[o.id] ?? { qty: 0, cost: 0 };
        c = round2(c - total - fee); hold = { ...hold, [o.id]: { qty: hd.qty + o.qty, cost: round2(hd.cost + total + fee) } };
        out.push({ day: h.day, id: o.id, side: 'buy', qty: o.qty, price: p, lim: true, fee });
      } else {
        const hd = hold[o.id];
        if (!hd || hd.qty < o.qty) { drop(); continue; } // 팔 주식이 없으면 취소
        const total = round2(p * o.qty), fee = feeOf(total), pnl = round2(total - fee - hd.cost * (o.qty / hd.qty)), rest = { ...hold };
        if (hd.qty === o.qty) delete rest[o.id]; else rest[o.id] = { qty: hd.qty - o.qty, cost: round2(hd.cost * (1 - o.qty / hd.qty)) };
        hold = rest; c = round2(c + total - fee);
        out.push({ day: h.day, id: o.id, side: 'sell', qty: o.qty, price: p, pnl, lim: true, fee });
      }
      drop();
    }
    // 만료
    for (let i = left.length - 1; i >= 0; i--) if (day > left[i].o.day + ORDER_DAYS) left.splice(i, 1);
    if (day <= lastPay) payDay(day);
  }
  const ord = left.map((x) => x.o);
  return { cash: c, holdings: hold, orders: ord, trades: out.slice(-200), fired };
}


export interface Wallet { cash: number; holdings: Record<string, Holding> }

/** 시장가 매수: 성공하면 새 지갑과 수수료, 실패하면 오류 문구. `rate`를 0으로 주면 수수료 도입 전 기록을 다시 계산할 수 있다 */
export function buyShares(w: Wallet, id: string, qty: number, price: number, rate = FEE_RATE): (Wallet & { fee: number }) | string {
  if (!Number.isInteger(qty) || qty <= 0) return '수량을 확인하세요';
  const total = round2(price * qty), fee = feeOf(total, rate);
  if (total + fee > w.cash) return '마나가 부족합니다';
  const h = w.holdings[id] ?? { qty: 0, cost: 0 };
  return { cash: round2(w.cash - total - fee), holdings: { ...w.holdings, [id]: { qty: h.qty + qty, cost: round2(h.cost + total + fee) } }, fee };
}

/** 시장가 매도: 새 지갑·실현 손익·수수료, 또는 오류 문구. 실현 손익 = (받는 금액 − 수수료) − 판 몫의 취득 원가 */
export function sellShares(w: Wallet, id: string, qty: number, price: number, rate = FEE_RATE): (Wallet & { pnl: number; fee: number }) | string {
  const h = w.holdings[id];
  if (!Number.isInteger(qty) || qty <= 0) return '수량을 확인하세요';
  if (!h || h.qty < qty) return '보유 수량이 부족합니다';
  const rest = { ...w.holdings };
  if (h.qty === qty) delete rest[id];
  else rest[id] = { qty: h.qty - qty, cost: round2(h.cost * (1 - qty / h.qty)) };
  const total = round2(price * qty), fee = feeOf(total, rate);
  return { cash: round2(w.cash + total - fee), holdings: rest, pnl: round2(total - fee - h.cost * (qty / h.qty)), fee };
}

/** 저장 코드 가져오기 검증: 거래 기록을 처음부터 다시 돌려 현금·보유가 맞는지 본다. 기록이 잘렸거나(200건 이상) 한 번이라도 어긋나면 거절한다 */
export interface WalletSave { cash: number; holdings: Record<string, Holding>; trades: Trade[]; questCorrect?: number }
export const TRADE_LOG_CAP = 200, QUEST_REWARD_SERVER = 30;
export function verifyWallet(save: WalletSave, m: MarketState, startCash = START_CASH_SERVER): { ok: true } | { ok: false; reason: string } {
  const bad = (reason: string) => ({ ok: false as const, reason });
  if (!Array.isArray(save.trades) || save.trades.length >= TRADE_LOG_CAP) return bad('거래 기록이 너무 길어서 처음부터 확인할 수 없어요');
  const px = (id: string, day: number) => m.history[id]?.[day];
  let cash = startCash, hold: Record<string, Holding> = {}, last = -1;
  for (const t of save.trades) {
    if (!(t.day >= last) || t.day > m.day || !Number.isInteger(t.qty) || t.qty <= 0 || !(t.id in m.prices)) return bad('거래 기록이 올바르지 않아요');
    last = t.day;
    const p = px(t.id, t.day);
    if (t.side === 'buy') {
      if (p === undefined || Math.abs(t.price - p) > 0.011) return bad('체결 가격이 그날 시세와 달라요');
      const r = buyShares({ cash, holdings: hold }, t.id, t.qty, p, t.fee === undefined ? 0 : FEE_RATE);
      if (typeof r === 'string') return bad(r);
      if (t.fee !== undefined && Math.abs(t.fee - r.fee) > 0.011) return bad('수수료 기록이 규칙과 달라요');
      cash = r.cash; hold = r.holdings;
    } else if (t.side === 'sell') {
      if (p === undefined || Math.abs(t.price - p) > 0.011) return bad('체결 가격이 그날 시세와 달라요');
      const r = sellShares({ cash, holdings: hold }, t.id, t.qty, p, t.fee === undefined ? 0 : FEE_RATE);
      if (typeof r === 'string') return bad(r);
      if (t.fee !== undefined && Math.abs(t.fee - r.fee) > 0.011) return bad('수수료 기록이 규칙과 달라요');
      cash = r.cash; hold = r.holdings;
    } else {
      const per = p === undefined ? 0 : dividendPerShare(t.id, t.day, p);
      if (!isDividendDay(t.day) || Math.abs(t.price - per) > 0.011 || (hold[t.id]?.qty ?? 0) !== t.qty) return bad('배당 기록이 규칙과 달라요');
      cash = round2(cash + t.price * t.qty);
    }
  }
  const bonus = Math.max(0, Math.floor(save.questCorrect ?? 0)) * QUEST_REWARD_SERVER; // 일일 의뢰 보상은 기록이 없어 정답 수만큼만 허용한다
  if (save.cash < cash - 0.05 || save.cash > cash + bonus + 0.05) return bad('현금이 거래 기록과 맞지 않아요');
  const ids = new Set([...Object.keys(hold), ...Object.keys(save.holdings)]);
  for (const id of ids) { const a = hold[id], b = save.holdings[id]; if ((a?.qty ?? 0) !== (b?.qty ?? 0) || Math.abs((a?.cost ?? 0) - (b?.cost ?? 0)) > 0.1) return bad('보유 주식이 거래 기록과 맞지 않아요'); }
  return { ok: true };
}
