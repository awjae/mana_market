import { drawdownFromHigh } from '../reasons';
import { DEFAULT_CONFIG as cfg, FEE_RATE, dividendYield, dayNodes, feeOf, marketAtDay, slotIndexAt } from '@mana/engine';
import { useEffect, useState, type CSSProperties } from 'react';
import { change, fmt, fmt0, pct } from '../format';
import { useGame } from '../store';
import { ChangeChip, SECTOR_COLOR, TickerBadge, moveWord } from './bits';
import { sfx } from '../audio';
import { HEROINES } from '../scene/heroines';
import { PixelAvatar } from '../scene/PixelHero';
import { OrderBox } from './OrderBox';
import { PriceChart } from './PriceChart';

type Mode = 'buy' | 'sell';

/** 거래: 시세 머리말 → 스크린톤 차트 → 도장 찍는 주문서 */
export function TradePanel({ onToast }: { onToast: (m: string, ok?: boolean) => void }) {
  const { market, cash, holdings, selected, buy, sell } = useGame();
  const [mode, setMode] = useState<Mode>('buy');
  const [qty, setQty] = useState(1);
  const [range, setRange] = useState(20);
  const [stamp, setStamp] = useState(0);
  const stock = cfg.stocks.find((s) => s.id === selected)!;
  const heroine = Object.values(HEROINES).find((h) => h.guild === selected);
  const bondPts = useGame((g) => (heroine ? g.bond[heroine.id]?.pts ?? 0 : 0));
  const sector = cfg.sectors.find((s) => s.id === stock.sectorId)!.name;
  const h = market.history[selected];
  const price = market.prices[selected];
  const dd = drawdownFromHigh(market.history[selected]);
  const asOf = () => { const k = slotIndexAt(Date.now()), t = k * 15; return `${Math.floor(t / 60)}시 ${String(t % 60).padStart(2, '0')}분`; };
  const c = change(h);
  const hold = holdings[selected];
  // 오늘 보기: 어제 마감가에서 시작해 지금 15분 슬롯까지(진짜 오늘 종가는 쓰지 않는다)
  const series = range === 1 ? [h[h.length - 2] ?? h[h.length - 1], ...dayNodes(marketAtDay(market.day), selected, market.day).slice(0, slotIndexAt(Date.now()) + 1)] : h.slice(-range - 1);
  const up = series[series.length - 1] >= series[0];
  const color = up ? '#f0455a' : '#2d6cff';
  const hh = h.slice(-21), rets = hh.slice(1).map((p, i) => p / hh[i] - 1);
  const vol = Math.sqrt(rets.reduce((a, b) => a + b * b, 0) / Math.max(1, rets.length));
  const word = moveWord(c);

  const maxBuy = Math.floor(cash / (price * (1 + FEE_RATE))), maxSell = hold?.qty ?? 0;
  const cap = mode === 'buy' ? maxBuy : maxSell;
  const gross = price * qty, fee = feeOf(gross), total = mode === 'buy' ? gross + fee : gross - fee; // 매수는 결제 금액에 수수료가 더해지고, 매도는 받을 금액에서 빠진다
  const err = qty < 1 ? '수량을 입력하세요' : mode === 'buy' && total > cash ? '마나가 부족해요' : mode === 'sell' && qty > maxSell ? (maxSell ? '보유 수량이 부족해요' : '보유한 주식이 없어요') : null;
  const set = (n: number) => setQty(Math.max(0, Math.floor(n) || 0));
  const pctSet = (p: number) => set(p === 1 ? cap : Math.max(cap > 0 ? 1 : 0, Math.floor(cap * p)));

  // 큰 거래(총자산의 절반 이상)는 한 번 더 눌러야 체결: 실수로 전부 사고파는 것을 막는다
  const [armed, setArmed] = useState(false);
  useEffect(() => { setArmed(false); }, [qty, mode, selected]);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3500); return () => clearTimeout(t); }, [armed]);
  const big = total >= (cash + Object.entries(holdings).reduce((a, [id, h]) => a + h.qty * market.prices[id], 0)) * 0.5;
  const confirm = () => {
    if (big && !armed) { setArmed(true); return; }
    setArmed(false);
    const e = (mode === 'buy' ? buy : sell)(selected, qty);
    if (e) { sfx.error(); return onToast(e); }
    (mode === 'buy' ? sfx.buy : sfx.sell)();
    navigator.vibrate?.(15);
    setStamp(Date.now());
    onToast(`${stock.name} ${qty}주 ${mode === 'buy' ? '매수' : '매도'} 체결!`, true);
  };

  const buyMode = mode === 'buy';
  const step = 'h-10 w-11 shrink-0 panel-flat font-num text-xl active:bg-[#ffe3ee]';
  return (
    <div className="space-y-3">
      {/* 길드 일러스트: 업종 색 하프톤 위에 건물이 선다 */}
      <div key={stock.id} className="panel-flat relative flex h-[104px] items-end justify-center overflow-hidden"
        style={{ background: `radial-gradient(circle, ${SECTOR_COLOR[stock.sectorId]}55 1.3px, transparent 1.7px) 0 0 / 6px 6px, ${SECTOR_COLOR[stock.sectorId]}1f` }}>
        {heroine && (
          <div className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-1.5 border-2 border-ink bg-white py-0.5 pl-0.5 pr-2 shadow-[2px_2px_0_#35244a]" title={`${heroine.name}: ${heroine.title}`}>
            <PixelAvatar look={heroine.look} size={26} />
            <span className="leading-none"><b className="block text-[11.5px]">{heroine.name}</b><span className="text-[10px] font-bold text-[#ff5f98]">{[0, 1, 2, 3].map((k) => (k < Math.min(4, bondPts) ? '♥' : '♡')).join('')}</span></span>
          </div>
        )}
        <img src={`/art/buildings/guild-${stock.id}.webp`} alt={`${stock.name} 건물`} className="pop-in h-[96px] w-auto max-w-full object-contain" draggable={false} />
      </div>
      <div className="flex items-end gap-2">
        <TickerBadge id={stock.id} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-display text-[17px]">{stock.name}</div>
          <div className="text-[11px] font-bold text-ink2">{sector} 업종</div>
        </div>
        <div className="text-right leading-none">
          {word && <div className="sfx mb-1 text-[30px]" style={{ color }}>{word}</div>}
          <div className="font-num text-[25px] tabular-nums">{fmt(price)}</div>
          <div className="mt-1"><ChangeChip r={c} big /></div>
          <div className="mt-1 text-[10.5px] font-bold text-ink2">{asOf()} 기준, 15분마다 바뀌어요</div>
          {dd !== null && <div className="mt-0.5 text-[10.5px] font-bold text-down">최근 30일 고점보다 {Math.round(Math.abs(dd) * 100)}% 낮아요</div>}
        </div>
      </div>

      <PriceChart series={series} lastDay={market.day} stockId={selected} avg={hold ? hold.cost / hold.qty : undefined} news={market.newsLog} range={range} setRange={setRange} />

      <div className="slip relative space-y-2.5 py-3 pr-3">
        {stamp > 0 && <span key={stamp} className="stamp" style={{ right: 12, top: -46 }}>체결</span>}
        <div className="flex items-center justify-between">
          <div className="seg">
            <button className={buyMode ? 'on' : ''} onClick={() => { setMode('buy'); setQty(1); }}>사기</button>
            <button className={!buyMode ? 'on' : ''} onClick={() => { setMode('sell'); setQty(hold ? 1 : 0); }}>팔기</button>
          </div>
          <div className="text-right text-[11.5px] font-bold leading-tight text-ink2">
            {buyMode ? <>최대 <b className="text-ink">{maxBuy}주</b> 살 수 있어요</> : hold ? <>{hold.qty}주 보유, 평단 {fmt(hold.cost / hold.qty)}</> : '보유한 주식이 없어요'}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => set(qty - 1)} className={step}>−</button>
          <input type="number" inputMode="numeric" value={qty || ''} placeholder="0" onChange={(e) => set(Number(e.target.value))} onWheel={(e) => e.currentTarget.blur()} onKeyDown={(e) => e.key === 'Enter' && !err && confirm()}
            className="panel-flat h-10 min-w-0 flex-1 text-center font-num text-xl tabular-nums outline-none focus:!border-pink" />
          <button onClick={() => set(qty + 1)} className={step}>+</button>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[0.25, 0.5, 0.75, 1].map((p) => <button key={p} onClick={() => pctSet(p)} className="panel-flat h-8 text-[12px] font-black text-ink2 active:bg-[#ffe3ee]">{p === 1 ? '최대' : `${p * 100}%`}</button>)}
        </div>

        <div className="flex items-baseline justify-between border-t-2 border-dashed border-ink/30 pt-2 text-[12px] font-bold text-ink2">
          <span>{buyMode ? '결제 금액' : '받을 금액'} <b className="font-num text-[16px] text-ink">{fmt(total)}</b> <span className="text-[11px]">({buyMode ? `수수료 ${fmt(fee)} 포함` : `수수료 ${fmt(fee)} 뺀 금액`})</span></span>
          <span>거래 후 마나 <b className="text-ink">{fmt0(buyMode ? cash - total : cash + total)}</b></span>
        </div>

        <button disabled={!!err} data-tut="buy" onClick={confirm} className="btn3d h-11 w-full text-[16px]"
          style={{ ['--c' as string]: buyMode ? '#f0455a' : '#2d6cff' } as CSSProperties}>
          {err ?? (armed ? `큰 거래예요. 한 번 더 누르면 ${buyMode ? '삽니다' : '팝니다'}` : `${stock.id} ${qty}주 ${buyMode ? '사기' : '팔기'}`)}
        </button>
      </div>

      <OrderBox id={selected} buyMode={buyMode} qty={qty} price={price} onToast={onToast} />

      <dl className="m-0 grid grid-cols-3 gap-2 text-center">
        {[['기간 최고', fmt(Math.max(...series))], ['기간 최저', fmt(Math.min(...series))], ['하루 변동폭', `${(vol * 100).toFixed(1)}%`]].map(([k, v]) => (
          <div key={k} className="panel-flat px-2 py-1.5"><dt className="text-[10.5px] font-bold text-ink2">{k}</dt><dd className="m-0 font-num text-[14px] tabular-nums">{v}</dd></div>
        ))}
      </dl>
      <p className="m-0 px-1 text-[11.5px] font-bold text-ink2">분기 배당 약 <b className="text-ink">{(dividendYield(selected) * 100).toFixed(2)}%</b> (3·6·9·12월 30일 아침에 가진 주식에 지급돼요)</p>
      {hold && (
        <div className="panel-flat flex items-center justify-between px-3 py-2 text-[12px] font-bold">
          <span className="text-ink2">내 평가손익</span>
          <b className={price * hold.qty - hold.cost >= 0 ? 'text-up' : 'text-down'}>{fmt(price * hold.qty - hold.cost)} ({pct((price * hold.qty) / hold.cost - 1)})</b>
        </div>
      )}
    </div>
  );
}
