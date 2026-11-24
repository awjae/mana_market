import { DEFAULT_CONFIG as cfg } from '@mana/engine';
import { change } from '../format';
import { useGame } from '../store';
import { ChangeChip, TickerBadge } from './bits';
import { useDragScroll } from './hooks';
import { CHIP_H } from './layout';

/** 관심종목 칩: 탭하면 그 길드로 걸어간다 */
export function Watchlist({ top }: { top: number }) {
  const { market, selected, select } = useGame();
  const marked = new Set(market.news.flatMap((n) => n.targetStockIds));
  const { ref, bind } = useDragScroll<HTMLDivElement>();
  return (
    <div ref={ref} {...bind} className="no-scrollbar grab absolute inset-x-0 flex gap-1.5 overflow-x-auto px-2.5 pb-1" style={{ top, height: CHIP_H }}>
      {cfg.stocks.map((s) => {
        const on = selected === s.id;
        return (
          <button key={s.id} onClick={() => select(s.id)} title={s.name}
            className={`panel-flat relative flex shrink-0 items-center gap-1.5 py-1 pl-1 pr-1.5 ${on ? '!bg-[#ffe3ee] shadow-[3px_3px_0_#35244a]' : 'bg-white/95'}`}>
            <TickerBadge id={s.id} size="sm" />
            <ChangeChip r={change(market.history[s.id])} />
            {marked.has(s.id) && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-ink bg-gold" />}
          </button>
        );
      })}
    </div>
  );
}
