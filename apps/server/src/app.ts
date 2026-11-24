import { START_CASH_SERVER, buyShares, verifyWallet, dayIndexAt, marketAtDay, nextDay, sellShares, settleDays, WORLD_VERSION, MAX_ORDERS, type Fired, type Holding, type MarketState, type Order, type Trade } from '@mana/engine';
import { randomBytes } from 'node:crypto';
import { createLimiter, hashToken } from './security';

/** 2단계 서버의 핵심: 소켓과 무관한 순수 요청 처리기. 가격·체결·정산·순위는 전부 여기서 계산한다(클라이언트가 보낸 가격은 쓰지 않는다) */
export interface Player { nick: string; cash: number; holdings: Record<string, Holding>; trades: Trade[]; orders: Order[]; fired: Fired[]; paidDay: number; joinDay: number; imported?: boolean; /** 복구 코드의 해시(평문은 가입 때 한 번만 보여 준다) */ recovery?: string }
/** 키는 토큰의 sha256 해시(평문 토큰은 저장하지 않는다) */
export interface Db { players: Record<string, Player> }
export const MAX_PLAYERS = 5000;
export interface Req { method: string; path: string; body?: unknown; token?: string; ip?: string }
export interface Res { status: number; json: unknown }

const ok = (json: unknown): Res => ({ status: 200, json });
const err = (status: number, error: string): Res => ({ status, json: { error } });
/** 복구 코드: 헷갈리는 글자(0 O 1 I)를 뺀 24자, 4자씩 끊어 보여 준다 */
const makeCode = () => Array.from(randomBytes(24), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('').replace(/(.{4})/g, '$1-').slice(0, -1);
const normCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');
const NICK = /^[0-9A-Za-z가-힣 ]{2,8}$/;

export function createApp(db: Db, now: () => number = Date.now, onChange: () => void = () => {}) {
  let cache: MarketState | null = null;
  const recLimit = createLimiter(3_600_000, 10, now), regLimit = createLimiter(3_600_000, 5, now), ipLimit = createLimiter(60_000, 240, now), actLimit = createLimiter(60_000, 60, now), authFail = createLimiter(600_000, 20, now);
  const today = () => dayIndexAt(now());
  const market = (): MarketState => {
    const d = today();
    if (!cache || cache.day > d) cache = marketAtDay(d);
    while (cache.day < d) cache = nextDay(cache);
    return cache;
  };
  const worth = (p: Player, m: MarketState) => p.cash + Object.entries(p.holdings).reduce((a, [id, h]) => a + h.qty * m.prices[id], 0);
  /** 접속·요청 때마다 자정을 지난 만큼 배당·예약을 정산한다 */
  const settle = (p: Player, m: MarketState) => {
    if (m.day <= p.paidDay) return;
    const r = settleDays(p.cash, p.holdings, p.trades, m, p.paidDay, m.day, p.orders);
    p.cash = r.cash; p.holdings = r.holdings; p.trades = r.trades; p.orders = r.orders; p.fired = [...p.fired, ...r.fired].slice(-20); p.paidDay = m.day;
  };
  const auth = (r: Req): Player | null => (r.token && r.token.length >= 16 ? db.players[hashToken(r.token)] ?? null : null);
  const publicPlayer = (p: Player, m: MarketState) => ({ nick: p.nick, cash: p.cash, holdings: p.holdings, trades: p.trades.slice(-50), orders: p.orders, fired: p.fired, worth: worth(p, m), day: m.day });

  const ranking = (m: MarketState) => Object.values(db.players).map((p) => (settle(p, m), { nick: p.nick, worth: worth(p, m) })).sort((a, b) => b.worth - a.worth);

  return function handle(r: Req): Res {
    if (!ipLimit(r.ip ?? '?')) return err(429, '요청이 너무 많아요. 잠시 뒤에 다시 해 주세요');
    const m = market();
    const body = (r.body ?? {}) as Record<string, unknown>;
    if (r.method === 'GET' && r.path === '/api/world') return ok({ version: WORLD_VERSION, day: m.day, prices: m.prices, index: m.index[m.index.length - 1] });
    if (r.method === 'POST' && r.path === '/api/register') {
      if (!regLimit(r.ip ?? '?')) return err(429, '가입 시도가 너무 많아요. 한 시간 뒤에 다시 해 주세요');
      if (Object.keys(db.players).length >= MAX_PLAYERS) return err(503, '지금은 새 계정을 받지 않아요');
      const nick = String(body.nick ?? '').trim();
      if (!NICK.test(nick)) return err(400, '닉네임은 2~8자(한글·영문·숫자)여야 해요');
      if (Object.values(db.players).some((p) => p.nick.toLowerCase() === nick.toLowerCase())) return err(409, '이미 쓰는 닉네임이에요');
      const token = randomBytes(16).toString('hex'), code = makeCode();
      const p: Player = { recovery: hashToken(normCode(code)), nick, cash: START_CASH_SERVER, holdings: {}, trades: [], orders: [], fired: [], paidDay: m.day, joinDay: m.day };
      db.players[hashToken(token)] = p; onChange();
      return ok({ token, recoveryCode: code, player: publicPlayer(p, m) });
    }
    if (r.method === 'POST' && r.path === '/api/recover') {
      // 기기를 바꾸거나 토큰을 잃었을 때: 닉네임+복구 코드로 새 토큰을 받는다(옛 토큰은 쓸 수 없게 된다)
      if (!recLimit(r.ip ?? '?')) return err(429, '복구 시도가 너무 많아요. 한 시간 뒤에 다시 해 주세요');
      const nick = String(body.nick ?? '').trim().toLowerCase(), want = hashToken(normCode(String(body.code ?? '')));
      const entry = Object.entries(db.players).find(([, pl]) => pl.nick.toLowerCase() === nick && pl.recovery === want);
      if (!entry) return err(401, '닉네임이나 복구 코드가 맞지 않아요');
      const token = randomBytes(16).toString('hex'), pl = entry[1];
      delete db.players[entry[0]]; db.players[hashToken(token)] = pl; onChange();
      settle(pl, m);
      return ok({ token, player: publicPlayer(pl, m) });
    }
    if (r.method === 'GET' && r.path === '/api/ranking') {
      const rows = ranking(m), me = auth(r);
      return ok({ day: m.day, top: rows.slice(0, 20).map((x, i) => ({ rank: i + 1, ...x })), me: me ? rows.findIndex((x) => x.nick === me.nick) + 1 : null, total: rows.length });
    }
    const p = auth(r);
    if (!p) return authFail(r.ip ?? '?') ? err(401, '로그인이 필요해요') : err(429, '인증 실패가 너무 많아요. 잠시 뒤에 다시 해 주세요');
    if (r.method !== 'GET' && !actLimit(hashToken(r.token!))) return err(429, '거래가 너무 빨라요. 잠시 뒤에 다시 해 주세요');
    settle(p, m);
    if (r.method === 'GET' && r.path === '/api/me') { onChange(); return ok(publicPlayer(p, m)); }
    if (r.method === 'POST' && (r.path === '/api/buy' || r.path === '/api/sell')) {
      const id = String(body.id ?? ''), qty = Number(body.qty), price = m.prices[id];
      if (!(id in m.prices)) return err(400, '없는 종목이에요');
      if (r.path === '/api/buy') {
        const w = buyShares(p, id, qty, price);
        if (typeof w === 'string') return err(400, w);
        p.cash = w.cash; p.holdings = w.holdings; p.trades = [...p.trades, { day: m.day, id, side: 'buy' as const, qty, price, fee: w.fee }].slice(-200);
      } else {
        const w = sellShares(p, id, qty, price);
        if (typeof w === 'string') return err(400, w);
        p.cash = w.cash; p.holdings = w.holdings; p.trades = [...p.trades, { day: m.day, id, side: 'sell' as const, qty, price, pnl: w.pnl, fee: w.fee }].slice(-200);
      }
      onChange(); return ok(publicPlayer(p, m));
    }
    if (r.method === 'POST' && r.path === '/api/import') {
      // 로컬 지갑 가져오기: 새 계정(거래·주문·가져오기 이력 없음)에서 한 번만, 거래 기록을 처음부터 다시 돌려 맞을 때만 받는다
      if (p.imported || p.trades.length || p.cash !== START_CASH_SERVER || Object.keys(p.holdings).length) return err(409, '새 계정에서만 가져올 수 있어요');
      const save = { cash: Number(body.cash), holdings: (body.holdings ?? {}) as Record<string, Holding>, trades: Array.isArray(body.trades) ? (body.trades as Trade[]) : [], questCorrect: Number(body.questCorrect ?? 0) };
      if (!Number.isFinite(save.cash) || typeof save.holdings !== 'object' || Array.isArray(save.holdings)) return err(400, '가져올 내용이 올바르지 않아요');
      const v = verifyWallet(save, m);
      if (!v.ok) return err(422, v.reason);
      p.cash = Math.round(save.cash * 100) / 100; p.holdings = save.holdings; p.trades = save.trades.slice(-200); p.imported = true; p.paidDay = m.day;
      onChange(); return ok(publicPlayer(p, m));
    }
    if (r.method === 'POST' && r.path === '/api/orders') {
      const side = body.side, id = String(body.id ?? ''), qty = Number(body.qty), limit = Number(body.limit), px = m.prices[id];
      if (!(id in m.prices) || (side !== 'buy' && side !== 'sell' && side !== 'alert') || !(limit > 0)) return err(400, '주문 내용을 확인하세요');
      if (side !== 'alert' && (!Number.isInteger(qty) || qty <= 0)) return err(400, '수량을 확인하세요');
      if (side === 'buy' && limit >= px) return err(400, '지금 시세보다 낮은 가격이어야 해요');
      if (side === 'sell' && limit <= px) return err(400, '지금 시세보다 높은 가격이어야 해요');
      if (side === 'sell' && (p.holdings[id]?.qty ?? 0) < qty) return err(400, '보유 수량이 부족해요');
      if (p.orders.length >= MAX_ORDERS) return err(400, `예약은 ${MAX_ORDERS}건까지예요`);
      p.orders = [...p.orders, { uid: Date.now() + p.orders.length, id, side, qty: side === 'alert' ? 0 : qty, limit: Math.round(limit * 100) / 100, day: m.day, ...(side === 'alert' ? { above: !!body.above } : {}) }];
      onChange(); return ok(publicPlayer(p, m));
    }
    if (r.method === 'DELETE' && r.path === '/api/orders') {
      p.orders = p.orders.filter((o) => o.uid !== Number(body.uid)); onChange(); return ok(publicPlayer(p, m));
    }
    return err(404, '없는 주소예요');
  };
}
