/** 마나 은행 대출(가상 화폐, 순수 함수). 빌린 돈은 현금으로 들어오지만 현금이 원금 아래로 내려가는 매수는 막는다(빚으로 주식을 사지 않는다).
 *  이자는 하루 고정 단리이고 복리·가산·강제 청산이 없다. 수치는 초안이라 상수 한 곳씩만 고치면 된다 */
export const LOAN_MAX = 15000, LOAN_STEP = 1000, LOAN_RATE = 0.005, LOAN_FROM_DAY = 0, /* 날짜는 세계 전체 기준이라 신규 제한에 쓸 수 없다. 빌린 돈으로는 주식을 못 사므로 신규 보호도 필요 없다 */ LOAN_MIN_WORTH = 3000, LOAN_WORTH_SHARE = 0.5;
export interface Loan { principal: number; /** 빌린 원금(이자 상한 기준) */ cap: number; paidInterest: number; /** 이자를 낸 마지막 날 */ paidDay: number }
const round2 = (x: number) => Math.round(x * 100) / 100;

/** 빌릴 수 있는 최대 원금(총자산은 빚을 빼기 전 값). 못 빌리면 0 */
export function loanLimit(day: number, worthBeforeDebt: number, loan: Loan | null): number {
  if (loan || day < LOAN_FROM_DAY || worthBeforeDebt < LOAN_MIN_WORTH) return 0;
  return Math.min(LOAN_MAX, Math.floor((worthBeforeDebt * LOAN_WORTH_SHARE) / LOAN_STEP) * LOAN_STEP);
}
export function borrow(cash: number, loan: Loan | null, day: number, worthBeforeDebt: number, amount: number): { cash: number; loan: Loan } | string {
  if (loan) return '이미 빌린 돈이 있어요';
  if (day < LOAN_FROM_DAY) return '시작하고 며칠 뒤부터 쓸 수 있어요';
  const lim = loanLimit(day, worthBeforeDebt, loan);
  if (amount < LOAN_STEP || amount % LOAN_STEP !== 0) return `${LOAN_STEP.toLocaleString('ko-KR')} 마나 단위로 빌려요`;
  if (amount > lim) return `지금은 최대 ${lim.toLocaleString('ko-KR')} 마나까지예요`;
  return { cash: round2(cash + amount), loan: { principal: amount, cap: amount, paidInterest: 0, paidDay: day } };
}
export function repay(cash: number, loan: Loan, amount: number): { cash: number; loan: Loan | null } | string {
  const a = Math.min(amount, loan.principal);
  if (a <= 0) return '갚을 금액을 정해 주세요';
  if (cash < a) return '마나가 모자라요';
  const principal = round2(loan.principal - a);
  return { cash: round2(cash - a), loan: principal > 0 ? { ...loan, principal } : null };
}
/** 하루 이자 */
export const dailyInterest = (loan: Loan) => round2(loan.principal * LOAN_RATE);
/** loan.paidDay(제외)~to(포함)의 이자를 낸다. 현금이 모자란 날은 면제하고, 낸 이자는 원금(cap)을 넘지 않는다 */
export function accrue(cash: number, loan: Loan | null, to: number): { cash: number; loan: Loan | null; paid: number } {
  if (!loan || to <= loan.paidDay) return { cash, loan, paid: 0 };
  let c = cash, paid = 0, pi = loan.paidInterest;
  for (let d = loan.paidDay + 1; d <= to; d++) {
    const due = Math.min(dailyInterest(loan), round2(loan.cap - pi));
    if (due <= 0 || c < due) continue;
    c = round2(c - due); pi = round2(pi + due); paid = round2(paid + due);
  }
  return { cash: c, loan: { ...loan, paidInterest: pi, paidDay: to }, paid };
}
