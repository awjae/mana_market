import { describe, expect, it } from 'vitest';
import { START_CASH_SERVER, buyShares, sellShares, settleDays, verifyWallet } from '../src/portfolio';
import { marketAtDay } from '../src/world';

describe('포트폴리오 규칙', () => {
  it('매수 → 매도: 평단과 실현 손익', () => {
    const b = buyShares({ cash: 1000, holdings: {} }, 'IRON', 4, 100);
    expect(typeof b).not.toBe('string');
    const w = b as Exclude<typeof b, string>;
    expect(w.cash).toBe(599.2); // 400 + 수수료 0.8
    expect(w.fee).toBe(0.8);
    const s = sellShares(w, 'IRON', 2, 120);
    expect(typeof s).not.toBe('string');
    const r = s as Exclude<typeof s, string>;
    expect(r.fee).toBe(0.48);
    expect(r.pnl).toBe(39.12); // (240 − 0.48) − 취득 원가 200.4
    expect(r.cash).toBe(838.72);
    expect(r.holdings.IRON).toEqual({ qty: 2, cost: 200.4 });
    expect(buyShares({ cash: 1000, holdings: {} }, 'IRON', 4, 100, 0)).toMatchObject({ cash: 600 }); // 수수료 0이면 예전 계산
  });
  it('잘못된 주문은 문구로 거절한다', () => {
    expect(buyShares({ cash: 10, holdings: {} }, 'IRON', 1, 100)).toMatch(/부족/);
    expect(buyShares({ cash: 10, holdings: {} }, 'IRON', 0.5, 1)).toMatch(/수량/);
    expect(sellShares({ cash: 0, holdings: {} }, 'IRON', 1, 1)).toMatch(/부족/);
  });
  it('날짜 따라잡기는 결정적이다(같은 입력 → 같은 결과)', () => {
    const m = marketAtDay(150);
    const run = () => settleDays(1000, { BANK: { qty: 5, cost: 1000 } }, [], marketAtDay(200), 150, 200, [{ uid: 1, id: 'BANK', side: 'alert', qty: 0, limit: 1, day: 150, above: false }]);
    expect(run()).toEqual(run());
    expect(m.day).toBe(150);
  });
  it('지갑 가져오기 검증: 정직한 기록은 통과하고 조작은 거절한다', () => {
    const m = marketAtDay(120), p = m.history.IRON[100], q = m.history.IRON[110];
    const w1 = buyShares({ cash: START_CASH_SERVER, holdings: {} }, 'IRON', 4, p) as Exclude<ReturnType<typeof buyShares>, string>;
    const w2 = sellShares(w1, 'IRON', 1, q) as Exclude<ReturnType<typeof sellShares>, string>;
    const buy = { day: 100, id: 'IRON', side: 'buy' as const, qty: 4, price: p, fee: w1.fee };
    const sell = { day: 110, id: 'IRON', side: 'sell' as const, qty: 1, price: q, pnl: 0, fee: w2.fee };
    const honest = { cash: w2.cash, holdings: w2.holdings, trades: [buy, sell] };
    expect(verifyWallet(honest, m)).toEqual({ ok: true });
    expect(verifyWallet({ ...honest, cash: honest.cash + 5000 }, m).ok).toBe(false);          // 현금 부풀리기
    expect(verifyWallet({ ...honest, holdings: { IRON: { qty: 9, cost: 1 } } }, m).ok).toBe(false); // 보유 부풀리기
    expect(verifyWallet({ ...honest, trades: [{ ...buy, price: 1 }, sell] }, m).ok).toBe(false);   // 가짜 체결가
    expect(verifyWallet({ ...honest, trades: [{ ...buy, fee: 0.01 }, sell] }, m).ok).toBe(false);  // 가짜 수수료
    const old1 = buyShares({ cash: START_CASH_SERVER, holdings: {} }, 'IRON', 4, p, 0) as Exclude<ReturnType<typeof buyShares>, string>; // 수수료 도입 전 저장(fee 필드 없음)
    expect(verifyWallet({ cash: old1.cash, holdings: old1.holdings, trades: [{ day: 100, id: 'IRON', side: 'buy', qty: 4, price: p }] }, m)).toEqual({ ok: true });
    expect(verifyWallet({ ...honest, cash: honest.cash + 30 }, m).ok).toBe(false);                // 의뢰 보상 없이는 불가
    expect(verifyWallet({ ...honest, cash: honest.cash + 30, questCorrect: 1 }, m)).toEqual({ ok: true }); // 의뢰 정답 수만큼은 허용
    expect(verifyWallet({ ...honest, trades: Array.from({ length: 200 }, () => buy) }, m).ok).toBe(false); // 기록이 잘렸으면 확인 불가
  });
});
