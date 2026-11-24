import { useState } from 'react';
import { fmt } from '../format';
import { ORDER_DAYS, useGame } from '../store';

/** 지정가 예약: 정한 가격에 시세가 닿는 날 자동으로 거래된다(하루에 한 번 시세가 바뀌니 자정에 확인). 위쪽 주문서의 수량·사기/팔기를 그대로 쓴다 */
export function OrderBox({ id, buyMode, qty, price, onToast }: { id: string; buyMode: boolean; qty: number; price: number; onToast: (m: string, ok?: boolean) => void }) {
  const { orders, placeOrder, cancelOrder } = useGame();
  const [open, setOpen] = useState(false), [lim, setLim] = useState(''), [alert, setAlert] = useState(false);
  const mine = orders.filter((o) => o.id === id);
  const submit = () => {
    const e = placeOrder(id, alert ? 'alert' : buyMode ? 'buy' : 'sell', qty, Number(lim), !buyMode);
    if (e) return onToast(e);
    setLim(''); onToast(alert ? `${id} 가격 알림을 걸었어요.` : `${id} ${qty}주 ${buyMode ? '매수' : '매도'} 예약을 걸었어요.`, true);
  };
  return (
    <div className="panel-flat bg-white px-3 py-2">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between border-0 bg-transparent p-0 text-[13px] font-black" aria-expanded={open}>
        <span>예약 주문{mine.length > 0 && <span className="ml-1.5 text-[11px] text-ink2">({mine.length}건 대기)</span>}</span><span className="text-ink2">{open ? '접기' : '펼치기'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="m-0 text-[11.5px] font-bold leading-snug text-ink2">정한 가격에 시세가 닿는 날 자동으로 거래돼요({ORDER_DAYS}일 동안). 시세는 하루에 한 번 바뀌어요. 수량은 위 주문서의 {qty || 0}주예요.</p>
          <label className="flex items-center gap-1.5 text-[12px] font-bold"><input type="checkbox" checked={alert} onChange={(e) => setAlert(e.target.checked)} />거래하지 않고 알림만 받기</label>
          <div className="flex gap-2">
            <input type="number" inputMode="decimal" value={lim} placeholder={buyMode ? `${fmt(price)}보다 낮게` : `${fmt(price)}보다 높게`} onChange={(e) => setLim(e.target.value)} onWheel={(e) => e.currentTarget.blur()}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); e.stopPropagation(); }} className="panel-flat h-10 min-w-0 flex-1 text-center font-num text-[16px] tabular-nums outline-none focus:!border-pink" />
            <button onClick={submit} className="btn3d h-10 w-[96px] shrink-0 text-[14px]" style={{ ['--c' as string]: '#ffc13b', color: '#35244a', textShadow: 'none' }}>예약 걸기</button>
          </div>
          {mine.map((o) => (
            <div key={o.uid} className="ruled flex items-center justify-between py-1.5 text-[12.5px] font-bold">
              <span>{o.side === 'alert' ? <><b className="text-[#7a52c8]">알림</b> {fmt(o.limit)} {o.above ? '이상' : '이하'}이면</> : <><b className={o.side === 'buy' ? 'text-up' : 'text-down'}>{o.side === 'buy' ? '매수' : '매도'}</b> {o.qty}주, {fmt(o.limit)} {o.side === 'buy' ? '이하' : '이상'}이면</>}</span>
              <button onClick={() => cancelOrder(o.uid)} className="border-0 bg-transparent text-[12px] font-black text-ink2 underline">취소</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
