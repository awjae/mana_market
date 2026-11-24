import { describe, expect, it } from 'vitest';
import { LOAN_MAX, accrue, borrow, dailyInterest, loanLimit, repay } from '../src';

describe('마나 은행 대출', () => {
  it('한도: 총자산의 절반을 1,000 단위로, 최대 5,000, 총자산 1,000 미만·이미 빌렸으면 0', () => {
    expect(loanLimit(10, 10000, null)).toBe(5000);
    expect(loanLimit(10, 4500, null)).toBe(2000);
    expect(loanLimit(10, 30000, null)).toBe(LOAN_MAX);
    expect(loanLimit(10, 900, null)).toBe(0);
    expect(loanLimit(10, 10000, { principal: 1000, cap: 1000, paidInterest: 0, paidDay: 10 })).toBe(0);
  });
  it('빌리면 현금이 늘고, 한도 초과·단위 위반은 거절된다', () => {
    const r = borrow(2000, null, 10, 10000, 3000);
    expect(r).toMatchObject({ cash: 5000, loan: { principal: 3000, cap: 3000, paidDay: 10 } });
    expect(typeof borrow(2000, null, 10, 10000, 6000)).toBe('string');
    expect(typeof borrow(2000, null, 10, 10000, 1500)).toBe('string');
  });
  it('이자는 하루 0.5% 단리, 현금이 모자란 날은 면제, 총 이자는 원금을 넘지 않는다', () => {
    const loan = { principal: 1000, cap: 1000, paidInterest: 0, paidDay: 10 };
    expect(dailyInterest(loan)).toBe(5);
    const a = accrue(100, loan, 14);
    expect(a.paid).toBe(20); expect(a.cash).toBe(80); expect(a.loan?.paidDay).toBe(14);
    expect(accrue(3, loan, 14).paid).toBe(0); // 현금 부족: 면제
    expect(accrue(100000, loan, 10 + 400).paid).toBe(1000); // 상한 100%
  });
  it('갚기: 일부·전액, 현금 부족이면 거절', () => {
    const loan = { principal: 3000, cap: 3000, paidInterest: 0, paidDay: 10 };
    expect(repay(5000, loan, 1000)).toMatchObject({ cash: 4000, loan: { principal: 2000 } });
    expect(repay(5000, loan, 9999)).toMatchObject({ cash: 2000, loan: null });
    expect(repay(500, loan, 1000)).toBe('마나가 모자라요');
  });
});
