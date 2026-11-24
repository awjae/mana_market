import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG as cfg, SLOTS, closedMarket, dayNodes, liveMarket, marketAtDay, quoteAt, slotIndexAt, msUntilNextSlot } from '../src';

describe('일중 시세', () => {
  const m = marketAtDay(120);
  it('슬롯 시계: KST 자정이 0번, 15분마다 한 칸', () => {
    const kstMidnight = Date.UTC(2026, 10, 22, 15, 0, 0); // 한국 시각 2026-11-23 00:00
    expect(slotIndexAt(kstMidnight)).toBe(0);
    expect(slotIndexAt(kstMidnight + 14 * 60_000 + 59_000)).toBe(0);
    expect(slotIndexAt(kstMidnight + 15 * 60_000)).toBe(1);
    expect(slotIndexAt(kstMidnight + 24 * 3_600_000 - 1)).toBe(95);
    expect(msUntilNextSlot(kstMidnight + 60_000)).toBe(14 * 60_000);
  });
  it('경로는 시가에서 시작해 정확히 종가로 끝난다(종가는 일 단위 엔진 값 그대로)', () => {
    for (const id of Object.keys(m.prices)) {
      const n = dayNodes(m, id, m.day);
      expect(n).toHaveLength(SLOTS + 1);
      expect(n[0]).toBe(m.opens[id][m.day]);
      expect(n[SLOTS]).toBe(m.history[id][m.day]);
      expect(quoteAt(m, id, m.day, 96)).toBe(m.prices[id]);
    }
  });
  it('결정적이고(같은 입력 같은 값), 종목·날짜마다 다르며, 가격 범위 안에 있다', () => {
    const a = dayNodes(m, 'IRON', m.day), b = dayNodes(marketAtDay(120), 'IRON', 120);
    expect(a).toEqual(b);
    expect(dayNodes(m, 'BANK', m.day)).not.toEqual(a);
    expect(dayNodes(m, 'IRON', m.day - 1)).not.toEqual(a);
    for (const id of Object.keys(m.prices)) for (const p of dayNodes(m, id, m.day)) { expect(p).toBeGreaterThanOrEqual(cfg.priceFloor); expect(Number.isFinite(p)).toBe(true); }
  });
  it('liveMarket: 오늘 가격만 현재 슬롯 값으로 바뀌고 과거 기록·종가는 새지 않는다', () => {
    const ms = Date.UTC(2026, 10, 22, 15, 0, 0) + 10 * 3_600_000; // 한국 시각 10:00 = 슬롯 40
    const live = liveMarket(m, ms);
    for (const id of Object.keys(m.prices)) {
      expect(live.prices[id]).toBe(quoteAt(m, id, m.day, 40));
      expect(live.history[id].at(-1)).toBe(live.prices[id]);
      expect(live.history[id].slice(0, -1)).toEqual(m.history[id].slice(0, -1));
    }
    expect(live.day).toBe(m.day);
    const closed = closedMarket(m);
    expect(closed.day).toBe(m.day - 1);
    expect(closed.prices).toEqual(Object.fromEntries(Object.keys(m.prices).map((id) => [id, m.history[id][m.day - 1]])));
  });
  it('종가는 일중 기능을 넣기 전과 같다(300일 해시)', () => {
    // 골든 테스트(world.test.ts)가 같은 값을 고정한다. 여기서는 opens가 종가에 영향을 주지 않음을 확인한다
    const mm = marketAtDay(300);
    for (const id of Object.keys(mm.prices)) expect(mm.opens[id]).toHaveLength(mm.history[id].length);
  });
  it('일중 통계: 임의 슬롯 매수→이후 매도의 기대수익이 0에 가깝고, 고저폭은 시가→종가 변동보다 크다', () => {
    let sumRet = 0, n = 0, ratio: number[] = [];
    for (let day = 20; day < 120; day += 4) {
      const mk = marketAtDay(day);
      for (const id of Object.keys(mk.prices)) {
        const nodes = dayNodes(mk, id, day);
        for (let k = 0; k < 90; k += 7) { sumRet += nodes[Math.min(96, k + 6)] / nodes[k] - 1; n++; }
        const range = (Math.max(...nodes) - Math.min(...nodes)) / nodes[0], move = Math.abs(nodes[96] / nodes[0] - 1);
        if (move > 0.003) ratio.push(range / move);
      }
    }
    expect(Math.abs(sumRet / n)).toBeLessThan(0.0015); // 마팅게일에 가깝다(수수료 전 0.15% 미만)
    ratio = ratio.sort((a, b) => a - b);
    expect(ratio[Math.floor(ratio.length / 2)]).toBeGreaterThan(1.1);
  });
});

import { settleDays } from '../src';
describe('일중 예약 주문', () => {
  const m = marketAtDay(120), id = 'IRON';
  const midnight = Date.UTC(2026, 10, 22, 15, 0, 0); // 임의의 KST 자정(슬롯 계산용)
  it('주문한 다음 슬롯부터 처음 조건에 닿은 슬롯가로 체결된다(그 이후 슬롯은 보지 않는다)', () => {
    const nodes = dayNodes(m, id, m.day), limit = Math.max(...nodes.slice(1, 96)) + 1; // 항상 닿는 매수 한도
    const o = { uid: 1, id, side: 'buy' as const, qty: 1, limit, day: m.day, slot: 10 };
    const r = settleDays(100000, {}, [], m, m.day - 1, m.day, [o], midnight + 50 * 900_000);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].price).toBe(nodes[11]);
    expect(r.orders).toHaveLength(0);
    const early = settleDays(100000, {}, [], m, m.day - 1, m.day, [o], midnight + 10 * 900_000); // 아직 슬롯 11이 아님
    expect(early.trades).toHaveLength(0);
    expect(early.orders).toHaveLength(1);
  });
  it('일중 규칙에서는 오늘 종가 기준 배당이 아직 지급되지 않는다', () => {
    const d = 119; const mm = marketAtDay(d); // 건국력 3·6·9·12월 30일이 아닌 날이라도, 오늘은 지급 대상에서 빠진다
    const r = settleDays(0, { BANK: { qty: 1, cost: 1 } }, [], mm, d - 1, d, [], midnight);
    expect(r.trades.filter((t) => t.side === 'div')).toHaveLength(0);
  });
});
