import { START_CASH_SERVER, dayIndexAt } from '@mana/engine';
import { describe, expect, it } from 'vitest';
import { createApp, type Db } from '../src/app';

const T0 = Date.UTC(2026, 10, 23, 3); // 한국 시각 낮
const DAY = 86_400_000;
const mk = () => { let t = T0; const db: Db = { players: {} }; const h = createApp(db, () => t); return { db, h, tick: (d: number) => { t += d * DAY; } }; };
const reg = (h: ReturnType<typeof mk>['h'], nick: string) => (h({ method: 'POST', path: '/api/register', body: { nick } }).json as { token: string }).token;

describe('서버', () => {
  it('가입: 닉네임 규칙과 중복 거절', () => {
    const { h } = mk();
    expect(h({ method: 'POST', path: '/api/register', body: { nick: 'a' } }).status).toBe(400);
    expect(h({ method: 'POST', path: '/api/register', body: { nick: '아리아' } }).status).toBe(200);
    expect(h({ method: 'POST', path: '/api/register', body: { nick: '아리아' } }).status).toBe(409);
  });
  it('거래는 서버 시세로 체결되고, 클라이언트가 보낸 가격은 무시된다', () => {
    const { h } = mk(); const token = reg(h, '상인A');
    const world = h({ method: 'GET', path: '/api/world' }).json as { prices: Record<string, number> };
    const r = h({ method: 'POST', path: '/api/buy', token, body: { id: 'IRON', qty: 2, price: 0.01 } });
    expect(r.status).toBe(200);
    const me = r.json as { cash: number; trades: { price: number }[] };
    expect(me.trades[0].price).toBe(world.prices.IRON);
    expect(me.cash).toBeCloseTo(START_CASH_SERVER - world.prices.IRON * 2 * 1.002, 1); // 수수료 0.2% 포함
    expect(h({ method: 'POST', path: '/api/buy', token, body: { id: 'IRON', qty: 99999 } }).status).toBe(400);
    expect(h({ method: 'POST', path: '/api/buy', body: { id: 'IRON', qty: 1 } }).status).toBe(401);
  });
  it('날짜가 지나면 예약이 서버에서 정산되고 순위에 반영된다', () => {
    const { h, tick } = mk(); const a = reg(h, '가나'), b = reg(h, '다라');
    const px = (h({ method: 'GET', path: '/api/world' }).json as { prices: Record<string, number> }).prices.IRON;
    expect(h({ method: 'POST', path: '/api/orders', token: a, body: { id: 'IRON', side: 'buy', qty: 1, limit: px * 5 } }).status).toBe(400);
    expect(h({ method: 'POST', path: '/api/orders', token: a, body: { id: 'IRON', side: 'buy', qty: 1, limit: px * 0.999 } }).status).toBe(200);
    h({ method: 'POST', path: '/api/buy', token: b, body: { id: 'BANK', qty: 5 } });
    for (let i = 0; i < 30; i++) tick(1);
    const rank = h({ method: 'GET', path: '/api/ranking', token: a }).json as { top: { nick: string }[]; me: number; total: number; day: number };
    expect(rank.total).toBe(2);
    expect(rank.day).toBeGreaterThan(dayIndexAt(T0));
    expect(rank.top.map((x) => x.nick).sort()).toEqual(['가나', '다라']);
    expect(rank.me).toBeGreaterThanOrEqual(1);
  });
  it('지갑 가져오기: 정직한 기록만 한 번 받는다', async () => {
    const { buyShares, marketAtDay } = await import('@mana/engine');
    const { h } = mk(); const token = reg(h, '이사온사람');
    const day = dayIndexAt(T0), m = marketAtDay(day), p = m.prices.IRON;
    const w = buyShares({ cash: START_CASH_SERVER, holdings: {} }, 'IRON', 3, p) as { cash: number; fee: number; holdings: Record<string, { qty: number; cost: number }> };
    const save = { cash: w.cash, holdings: w.holdings, trades: [{ day, id: 'IRON', side: 'buy', qty: 3, price: p, fee: w.fee }] };
    expect(h({ method: 'POST', path: '/api/import', token, body: { ...save, cash: save.cash + 9999 } }).status).toBe(422);
    const ok = h({ method: 'POST', path: '/api/import', token, body: save });
    expect(ok.status).toBe(200);
    expect((ok.json as { cash: number }).cash).toBeCloseTo(w.cash, 2);
    expect(h({ method: 'POST', path: '/api/import', token, body: save }).status).toBe(409);
  });
});
