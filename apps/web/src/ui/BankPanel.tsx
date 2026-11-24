import { useState } from 'react';
import { LOAN_RATE, LOAN_STEP, dailyInterest, loanLimit } from '@mana/engine';
import { fmt0 } from '../format';
import { netWorth, useGame } from '../store';
import { Title } from './bits';

/** 마나 은행: 가상 화폐 대출. 숫자만 보여 준다(권유·압박 없음). 빌린 돈으로는 주식을 살 수 없다(현금이 원금 아래로 내려가는 매수 거절) */
export function BankPanel() {
  const g = useGame();
  const { loan, cash, market, server, borrowLoan, repayLoan } = g;
  const [amt, setAmt] = useState(LOAN_STEP), [ask, setAsk] = useState<string | null>(null), [msg, setMsg] = useState<string | null>(null);
  const lim = loanLimit(market.day, netWorth(g) + (loan?.principal ?? 0), loan);
  const arm = (k: string, run: () => string | null, done: string) => {
    if (ask !== k) { setAsk(k); setMsg(null); setTimeout(() => setAsk((a) => (a === k ? null : a)), 4000); return; }
    setAsk(null); setMsg(run() ?? done);
  };
  const btn = 'panel-flat h-9 min-w-[96px] shrink-0 px-2 text-[12px] font-black disabled:opacity-50';
  return (
    <div className="space-y-2">
      <Title ko="마나 은행" />
      <div className="panel-flat space-y-2.5 bg-white p-3">
        {loan ? (
          <>
            <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px] font-bold">
              <dt className="text-ink2">빌린 원금</dt><dd className="m-0 text-right font-num">{fmt0(loan.principal)} 마나</dd>
              <dt className="text-ink2">하루 이자</dt><dd className="m-0 text-right font-num">{fmt0(dailyInterest(loan))} 마나 ({(LOAN_RATE * 100).toFixed(1)}%)</dd>
              <dt className="text-ink2">지금까지 낸 이자</dt><dd className="m-0 text-right font-num">{fmt0(loan.paidInterest)} 마나</dd>
            </dl>
            <div className="flex gap-2">
              <button disabled={cash < LOAN_STEP && cash < loan.principal || !!server} onClick={() => arm('part', () => repayLoan(Math.min(LOAN_STEP, loan.principal)), '조금 갚았어요.')} className={btn}>{ask === 'part' ? `${fmt0(Math.min(LOAN_STEP, loan.principal))} 마나 갚기` : `${fmt0(Math.min(LOAN_STEP, loan.principal))} 갚기`}</button>
              <button disabled={cash < loan.principal || !!server} onClick={() => arm('all', () => repayLoan(loan.principal), '모두 갚았어요.')} className={btn}>{ask === 'all' ? `${fmt0(loan.principal)} 마나 갚기` : '전부 갚기'}</button>
            </div>
          </>
        ) : (
          <>
            <p className="m-0 text-[12.5px] font-bold">지금 빌릴 수 있는 한도는 <b className="font-num">{fmt0(lim)}</b> 마나예요. 하루 이자는 원금의 {(LOAN_RATE * 100).toFixed(1)}%예요.</p>
            <div className="flex items-center gap-2">
              <button aria-label="빌릴 금액 줄이기" disabled={amt <= LOAN_STEP} onClick={() => setAmt((a) => a - LOAN_STEP)} className="panel-flat h-9 w-9 font-num text-lg">−</button>
              <span className="min-w-[88px] text-center font-num text-[15px]">{fmt0(Math.min(amt, Math.max(lim, LOAN_STEP)))} 마나</span>
              <button aria-label="빌릴 금액 늘리기" disabled={amt + LOAN_STEP > lim} onClick={() => setAmt((a) => a + LOAN_STEP)} className="panel-flat h-9 w-9 font-num text-lg">＋</button>
              <button disabled={lim < LOAN_STEP || !!server} onClick={() => arm('borrow', () => borrowLoan(Math.min(amt, lim)), '빌렸어요.')} className={btn}>{ask === 'borrow' ? '한 번 더 누르면 빌려요' : '빌리기'}</button>
            </div>
          </>
        )}
        <p className="m-0 text-[11px] font-bold leading-snug text-ink2">{server ? '서버 모드에서는 쓸 수 없어요. ' : ''}빌린 돈은 현금으로 들어오지만, 현금이 원금 아래로 내려가는 주식 매수는 할 수 없어요. 이자는 돌아오지 않고, 총자산에서는 빚을 뺀 값이 보여요. 가상의 은행이고 실제 돈과 무관해요.</p>
        {msg && <p className="m-0 text-[12px] font-black" role="status">{msg}</p>}
      </div>
    </div>
  );
}
