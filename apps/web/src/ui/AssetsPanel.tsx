import { DEFAULT_CONFIG as cfg } from '@mana/engine';
import { useState } from 'react';
import { dayLabel } from '../calendar';
import { fmt, fmt0, pct } from '../format';
import { START_CASH, netWorth, useGame } from '../store';
import { Empty, TickerBadge, Title } from './bits';

/** 자산: 괘선 장부 */
export function AssetsPanel() {
  const g = useGame();
  const { market, cash, holdings, select, reset, trades } = g;
  const [showAll, setShowAll] = useState(false);
  const sold = trades.filter((t) => t.side === 'sell');
  const realized = sold.reduce((a, t) => a + (t.pnl ?? 0), 0);
  const divTotal = trades.filter((t) => t.side === 'div').reduce((a, t) => a + t.price * t.qty, 0);
  const [only, setOnly] = useState<string | null>(null);
  const ids = [...new Set(trades.map((t) => t.id))];
  const log = [...trades].reverse().filter((t) => !only || t.id === only).slice(0, showAll ? 60 : 6);
  const [confirm, setConfirm] = useState(false);
  const worth = netWorth(g);
  const stocksVal = worth - cash;
  const pnl = worth + g.spent - g.earned - START_CASH; // 영구 소비분은 손익에서 제외
  const rows = Object.entries(holdings).map(([id, h]) => {
    const val = h.qty * market.prices[id];
    return { id, h, val, gain: val - h.cost, r: val / h.cost - 1 };
  }).sort((a, b) => b.val - a.val);

  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <div className="text-[12px] font-bold text-ink2">내 총자산</div>
        <div className="font-num text-[30px] leading-tight tabular-nums">{fmt0(worth)}</div>
        <div className={`text-[13px] font-black ${pnl >= 0 ? 'text-up' : 'text-down'}`}>시작 자금 {fmt0(START_CASH)} 대비 {pnl >= 0 ? '+' : '−'}{fmt0(Math.abs(pnl))} ({pct((worth + g.spent - g.earned) / START_CASH - 1)}){g.spent > 0 ? <span className="ml-1 text-[11px] text-ink2">마을·소품·선물에 쓴 {fmt0(g.spent)} 제외</span> : null}</div>
        {/* 현금은 색면, 주식은 스크린톤 */}
        <div className="mt-3 flex h-4 overflow-hidden border-2 border-ink">
          <div className="h-full bg-gold transition-all" style={{ width: `${(cash / worth) * 100}%` }} />
          <div className="h-full flex-1 transition-all" style={{ background: 'radial-gradient(circle, #ff5f98 1.3px, transparent 1.7px) 0 0 / 5px 5px, #ffe3ee' }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11.5px] font-bold text-ink2">
          <span>현금 <b className="text-ink">{fmt0(cash)}</b> ({((cash / worth) * 100).toFixed(0)}%)</span>
          <span>주식 <b className="text-ink">{fmt0(stocksVal)}</b></span>
        </div>
      </div>

      <Title ko={rows.length ? `가진 주식 ${rows.length}곳` : '가진 주식'} />
      {rows.length === 0 ? (
        <div className="panel-flat"><Empty title="아직 가진 주식이 없어요" sub="마을의 길드 건물을 눌러 첫 주문을 넣어 보세요." /></div>
      ) : (
        <ul className="ruled m-0 list-none p-0">
          {rows.map(({ id, h, val, gain, r }) => (
            <li key={id}>
              <button onClick={() => select(id)} className="flex w-full items-center gap-2 border-0 bg-transparent px-0.5 py-2.5 text-left active:bg-[#ffe3ee]">
                <TickerBadge id={id} />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[13.5px] font-black">{cfg.stocks.find((s) => s.id === id)!.name}</div>
                  <div className="text-[11px] font-bold text-ink2">{h.qty}주, 평단 {fmt(h.cost / h.qty)}, 지금 {fmt(market.prices[id])}</div>
                </div>
                <div className="text-right leading-tight">
                  <div className="font-num text-[15px] tabular-nums">{fmt0(val)}</div>
                  <div className={`text-[11.5px] font-black ${gain >= 0 ? 'text-up' : 'text-down'}`}>{gain >= 0 ? '+' : '−'}{fmt0(Math.abs(gain))} ({pct(r)})</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Title ko="거래 내역" right={sold.length || divTotal ? <span className="text-[11.5px] font-black">{sold.length > 0 && <span className={realized >= 0 ? 'text-up' : 'text-down'}>실현 {realized >= 0 ? '+' : '−'}{fmt0(Math.abs(realized))}</span>}{sold.length > 0 && divTotal > 0 && ' '}{divTotal > 0 && <span className="text-[#b8860b]">배당 +{fmt0(divTotal)}</span>}</span> : undefined} />
      {ids.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="길드별 보기">
          {[null, ...ids].map((id) => <button key={id ?? 'all'} onClick={() => setOnly(id)} className={`panel-flat h-7 px-2.5 text-[12px] font-black ${only === id ? 'bg-ink text-white' : 'bg-white text-ink2'}`}>{id ?? '전체'}</button>)}
        </div>
      )}
      {log.length === 0 ? (
        <div className="panel-flat"><Empty title="아직 거래가 없어요" sub="길드에서 사고팔면 여기에 기록돼요." /></div>
      ) : (
        <ul className="ruled m-0 list-none p-0">
          {log.map((t, i) => (
            <li key={`${t.day}-${t.id}-${i}`} className="flex items-center gap-2 px-0.5 py-2">
              <span className={`w-[56px] shrink-0 whitespace-nowrap border-2 border-ink px-1 text-center text-[11px] font-black ${t.side === 'buy' ? 'bg-[#ffe3e6] text-up' : t.side === 'sell' ? 'bg-[#dfeaff] text-down' : 'bg-[#fff2c4] text-[#8a6500]'}`}>{t.side === 'buy' ? '샀어요' : t.side === 'sell' ? '팔았어요' : '배당금'}</span>
              <div className="min-w-0 flex-1 leading-tight"><div className="text-[13px] font-black">{t.id} {t.qty}주</div><div className="text-[11px] font-bold text-ink2">{dayLabel(t.day)}, 주당 {fmt(t.price)}{t.side === 'div' ? ' 배당' : ''}{t.lim ? ', 예약 체결' : ''}</div></div>
              <div className="text-right leading-tight"><div className="font-num text-[14px] tabular-nums">{fmt0(t.price * t.qty)}</div>{t.pnl !== undefined && <div className={`text-[11px] font-black ${t.pnl >= 0 ? 'text-up' : 'text-down'}`}>{t.pnl >= 0 ? '+' : '−'}{fmt0(Math.abs(t.pnl))}</div>}</div>
            </li>
          ))}
        </ul>
      )}
      {trades.length > 6 && <button onClick={() => setShowAll((v) => !v)} className="w-full border-0 bg-transparent py-1 text-[12px] font-black text-ink2 underline">{showAll ? '접기' : `더 보기 (${Math.min(60, trades.length) - 6}건)`}</button>}
      <button onClick={() => (confirm ? (reset(), setConfirm(false)) : (setConfirm(true), setTimeout(() => setConfirm(false), 3000)))}
        className="w-full border-2 border-dashed border-ink/35 bg-transparent py-2 text-[12px] font-bold text-ink2 active:bg-white/60">
        {confirm ? '한 번 더 누르면 처음부터 다시 시작해요' : '처음부터 다시 시작'}
      </button>
    </div>
  );
}
