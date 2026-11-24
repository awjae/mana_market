import { useEffect, useRef, useState } from 'react';
import { change, fmt, fmt0, pct } from '../format';
import { flagParts } from '../calendar';
import { PixelAvatar } from '../scene/PixelHero';
import { START_CASH, netWorth, useGame } from '../store';
import { ChangeChip, Icon } from './bits';

/** 숫자가 바뀌면 부드럽게 세어 올린다 (지원금을 받는 순간의 쾌감) */
function useTween(value: number, ms = 800) {
  const [v, setV] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now(), a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms), e = 1 - (1 - k) ** 3;
      from.current = a + (value - a) * e;
      setV(from.current);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return v;
}

/** 상단: 내 마나 · 날짜(세로로 걸린 깃발) · 왕국 지수 */
export function Hud({ onFlag, onProfile }: { onFlag: () => void; onProfile: () => void }) {
  const g = useGame();
  const { market, cash } = g;
  const worth = netWorth(g);
  const pnl = g.granted ? (worth + g.spent - g.earned) / START_CASH - 1 : 0; // 마을·소품·선물에 쓴 마나는 손익에서 뺀다
  const shownCash = useTween(cash);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 px-2.5 pt-2.5 [&>*]:pointer-events-auto">
      <div className="panel-flat flex min-w-0 flex-1 items-center gap-2 bg-white/95 py-1.5 pl-1.5 pr-2.5">
        <button onClick={onProfile} title="프로필 (모습 바꾸기)" aria-label="프로필 열기" data-tut="profile" className="hit shrink-0 border-0 bg-transparent p-0"><PixelAvatar look={g.look} size={40} /></button>
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1"><span className="text-gold" style={{ filter: 'drop-shadow(0 1px 0 #35244a)' }}><Icon name="coin" size={16} /></span><span className="font-num text-[17px] tabular-nums">{fmt0(shownCash)}</span></div>
          <div className="whitespace-nowrap text-[10.5px] font-bold text-ink2">총자산 {fmt0(worth)} <span className={pnl >= 0 ? 'text-up' : 'text-down'}>{pct(pnl)}</span></div>
        </div>
      </div>

      {/* 날짜: 위에서 늘어뜨린 깃발 (판타지 달력). 누르면 달력 */}
      <button onClick={onFlag} title="달력 (C)" aria-label={`${flagParts(market.day).join("")} 달력 열기`} className="relative -mt-2.5 flex h-[70px] w-[44px] shrink-0 flex-col items-center border-0 pt-[13px] leading-none text-white" style={{ background: 'var(--color-ink)', clipPath: 'polygon(0 0,100% 0,100% 100%,50% 90%,0 100%)' }}>
        <span className="absolute inset-x-[3px] top-0 h-[5px] bg-pink" />
        <span className="text-[9.5px] font-black text-[#ffd6e4]">{flagParts(market.day)[0]}</span>
        <span className={`mt-0.5 whitespace-nowrap font-num tabular-nums ${flagParts(market.day)[1].length > 2 ? "text-[13px]" : "text-[21px]"}`}>{flagParts(market.day)[1]}</span>
      </button>

      <div className="panel-flat flex min-w-0 flex-1 items-center justify-between gap-1 bg-white/95 px-2.5 py-1.5">
        <div className="leading-tight">
          <div className="text-[10.5px] font-bold text-ink2">왕국 종합지수</div>
          <div className="flex items-center gap-1 whitespace-nowrap"><span className="font-num text-[15px] tabular-nums">{fmt(market.index[market.index.length - 1])}</span><ChangeChip r={change(market.index)} /></div>
        </div>
      </div>
    </div>
  );
}
