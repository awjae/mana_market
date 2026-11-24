import { DEFAULT_CONFIG as cfg } from '@mana/engine';
import { useState } from 'react';
import { change, fmt, pct } from '../format';
import { useGame } from '../store';
import { ChangeChip, Spark, TickerBadge, Title } from './bits';
import { TownMap } from './TownMap';

/** 시세: 괘선 행 목록 */
export function MarketPanel() {
  const { market, select, selected } = useGame();
  const [sort, setSort] = useState<'base' | 'up' | 'down'>('base');
  const rows = cfg.stocks.map((s) => ({ s, c: change(market.history[s.id]) }));
  if (sort !== 'base') rows.sort((a, b) => (sort === 'up' ? b.c - a.c : a.c - b.c));
  const idx = market.index, total = idx[idx.length - 1] / idx[0] - 1;

  return (
    <div className="space-y-4">
      <div className="panel flex items-center gap-3 p-3">
        <div className="leading-tight">
          <div className="text-[12px] font-bold text-ink2">왕국 종합지수</div>
          <div className="font-num text-[26px] tabular-nums">{fmt(idx[idx.length - 1])}</div>
          <div className="flex items-center gap-1.5"><ChangeChip r={change(idx)} /><span className="text-[11px] font-bold text-ink2">시작 대비 {pct(total)}</span></div>
        </div>
        <div className="ml-auto"><Spark data={idx.slice(-40)} w={140} h={52} /></div>
      </div>
      <Title ko="업종별 오늘" />
      <div className="grid grid-cols-5 gap-1.5">
        {cfg.sectors.map((sec) => {
          const ids = cfg.stocks.filter((x) => x.sectorId === sec.id).map((x) => x.id), avg = ids.reduce((a, id) => a + change(market.history[id]), 0) / ids.length;
          return <div key={sec.id} className="panel-flat px-1 py-1.5 text-center leading-tight"><div className="truncate text-[11px] font-black text-ink2">{sec.name}</div><div className={`font-num text-[13px] tabular-nums ${avg > 0 ? 'text-up' : avg < 0 ? 'text-down' : ''}`}>{avg > 0 ? '▲' : avg < 0 ? '▼' : ''}{Math.abs(avg * 100).toFixed(2)}%</div></div>;
        })}
      </div>
      <Title ko="마을 지도" right={<span className="text-[11px] font-bold text-ink2">길드 점을 누르면 그곳으로 가요</span>} />
      <TownMap />
      <Title ko="길드 시세" right={<div className="seg"><button className={sort === 'base' ? 'on' : ''} onClick={() => setSort('base')}>기본</button><button className={sort === 'up' ? 'on' : ''} onClick={() => setSort('up')}>오른 순</button><button className={sort === 'down' ? 'on' : ''} onClick={() => setSort('down')}>내린 순</button></div>} />
      <ul className="ruled m-0 list-none p-0">
        {rows.map(({ s, c }) => (
          <li key={s.id}>
            <button onClick={() => select(s.id)} className={`flex w-full items-center gap-2 border-0 px-0.5 py-2.5 text-left active:bg-[#ffe3ee] ${selected === s.id ? 'bg-[#ffe3ee]' : 'bg-transparent'}`}>
              <TickerBadge id={s.id} />
              <div className="min-w-0 flex-1 leading-tight"><div className="truncate text-[13.5px] font-black">{s.name}</div><div className="text-[11px] font-bold text-ink2">{cfg.sectors.find((x) => x.id === s.sectorId)!.name}</div></div>
              <Spark data={market.history[s.id].slice(-20)} />
              <div className="w-[70px] text-right leading-tight"><div className="font-num text-[15px] tabular-nums">{fmt(market.prices[s.id])}</div><ChangeChip r={c} /></div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
