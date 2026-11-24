import { describe, expect, it } from 'vitest';
import { bigMoveLine, nextReason } from './reasons';

const base = { market: { day: 100 }, holdings: {}, orders: [], bond: {} };
describe('다음에 들를 이유', () => {
  it('아무것도 없으면 말하지 않는다', () => expect(nextReason(base)).toBeNull());
  it('히로인의 다음 이야기가 열려 있으면 알린다(오늘 이미 들었으면 말하지 않는다)', () => {
    expect(nextReason({ ...base, bond: { lisel: { pts: 2, day: 99 } } })).toContain('리젤');
    expect(nextReason({ ...base, bond: { lisel: { pts: 2, day: 100 } } })).toBeNull();
  });
  it('예약 주문이 있으면 건수만 알린다', () => {
    expect(nextReason({ ...base, orders: [{ uid: 1, id: 'IRON', side: 'buy', qty: 1, limit: 1, day: 90 }] })).toContain('1건');
  });
  it('주식을 들고 있으면 다음 배당일까지 남은 날을 알린다', () => {
    expect(nextReason({ ...base, holdings: { IRON: {} } })).toMatch(/배당일/);
  });
  it('보유 종목이 ±10% 넘게 움직인 날만 사실로 알린다(소식 유무도 함께)', () => {
    const mk = (a: number, b: number, news: string[]) => ({ holdings: { IRON: {} }, market: { history: { IRON: [a, b] }, news: news.map((id) => ({ targetStockIds: [id] })) } });
    expect(bigMoveLine(mk(100, 105, []))).toBeNull();
    expect(bigMoveLine(mk(100, 85, []))).toBe('오늘 IRON가 15% 크게 내렸어. 특별한 소식은 없었어.');
    expect(bigMoveLine(mk(100, 112, ['IRON']))).toBe('오늘 IRON가 12% 크게 올랐어. 소식 탭에 관련 소식이 있어.');
    expect(bigMoveLine({ ...mk(100, 150, []), holdings: {} })).toBeNull(); // 안 가진 종목은 말하지 않는다
  });
});

import { belowStartLine, drawdownFromHigh } from './reasons';
describe('신규 보호 사실 표시', () => {
  it('고점 대비 낙폭은 10% 이상일 때만', () => {
    expect(drawdownFromHigh([100, 120, 100])).toBeCloseTo(-1 / 6);
    expect(drawdownFromHigh([100, 105, 100])).toBeNull();
  });
  it('시작 자금보다 적을 때만 첫 거래 뒤 2주 안에 한 줄', () => {
    const g = { trades: [{ day: 10 }], market: { day: 12 }, worth: 9000, spent: 0, start: 10000 };
    expect(belowStartLine(g)).toContain('1,000 마나 적어');
    expect(belowStartLine({ ...g, market: { day: 30 } })).toBeNull();
    expect(belowStartLine({ ...g, worth: 10500 })).toBeNull();
  });
});
