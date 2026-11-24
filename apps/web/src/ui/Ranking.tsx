import { useEffect, useMemo, useState } from 'react';
import { call, type ServerRanking } from '../serverClient';
import { fmt0 } from '../format';
import { STYLE_LINE, ranking } from '../social';
import { START_CASH, netWorth, useGame } from '../store';
import { PixelAvatar } from '../scene/PixelHero';
import { Title } from './bits';

/** 상인 순위: 왕국의 라이벌 상인 20명과 총자산을 겨룬다. 라이벌은 왕국이 만든 가상의 상인이고, 모든 플레이어에게 같다 */
export function Ranking() {
  const g = useGame();
  const [all, setAll] = useState(false), [open, setOpen] = useState<string | null>(null);
  const worth = netWorth(g);
  const rows = useMemo(() => ranking(g.market, { nick: g.nick, worth, title: g.activeTitle }), [g.market, g.nick, worth, g.activeTitle]);
  const myRank = rows.findIndex((r) => r.me) + 1;
  const [online, setOnline] = useState<ServerRanking | null>(null);
  useEffect(() => {
    if (!g.server) { setOnline(null); return; }
    const c = g.server; let alive = true;
    const load = () => call<ServerRanking>(c, 'GET', '/api/ranking').then((r) => alive && setOnline(r)).catch(() => {});
    load(); const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [g.server]);
  if (g.server && online) return (
    <div className="space-y-2">
      <Title ko="온라인 상인 순위" />
      <div className="panel p-3.5"><div className="text-[12px] font-bold text-ink2">{online.total}명의 상인 중</div><div className="font-display text-[28px] leading-tight">{online.me ?? '-'}위</div></div>
      <div>{online.top.map((r) => <div key={r.rank} className={`ruled flex items-center gap-2.5 py-2 ${r.nick === g.nick ? 'bg-[#fff0b8]' : ''}`}><span className="w-7 text-center font-num text-[15px] tabular-nums">{r.rank}</span><span className="min-w-0 flex-1 truncate text-[14px] font-black">{r.nick}</span><span className="font-num text-[14px] tabular-nums">{fmt0(r.worth)}</span></div>)}</div>
    </div>
  );
  const shown = all ? rows : rows.filter((r, i) => i < 5 || r.me || Math.abs(i + 1 - myRank) <= 1);
  return (
    <div className="space-y-2">
      <Title ko="상인 순위" />
      <div className="panel p-3.5">
        <div className="text-[12px] font-bold text-ink2">{rows.length}명의 상인 중</div>
        <div className="font-display text-[28px] leading-tight">{myRank}위</div>
        {!g.nick && <p className="m-0 mt-1 text-[12px] font-bold text-ink2">프로필에서 닉네임을 지으면 이름으로 올라가요.</p>}
      </div>
      <div>
        {shown.map((r) => {
          const i = rows.indexOf(r), gain = r.worth / START_CASH - 1;
          return (
            <div key={r.id}>
            <div onClick={() => r.style && setOpen(open === r.id ? null : r.id)} className={`ruled flex items-center gap-2.5 py-2 ${r.me ? 'bg-[#fff0b8]' : 'cursor-pointer'}`}>
              <span className="w-7 text-center font-num text-[15px] tabular-nums">{i + 1}</span>
              {r.me ? <PixelAvatar look={g.look} size={28} /> : <span className="h-7 w-7 shrink-0 rounded-full border-2 border-ink/30 bg-[#e4dcff] text-center text-[13px] font-black leading-[24px] text-ink2">{r.name[0]}</span>}
              <span className="min-w-0 flex-1 leading-tight"><span className="block truncate text-[14px] font-black">{r.name}</span><span className="block truncate text-[11px] font-bold text-ink2">{r.title}</span></span>
              <span className="text-right leading-tight"><span className="block font-num text-[14px] tabular-nums">{fmt0(r.worth)}</span><span className={`block text-[11px] font-black tabular-nums ${gain >= 0 ? 'text-up' : 'text-down'}`}>{gain >= 0 ? '+' : ''}{(gain * 100).toFixed(1)}%</span></span>
            </div>
            {open === r.id && r.style && <p className="whisper m-0 my-1.5 ml-10 text-[13px]">“{STYLE_LINE[r.style][i % STYLE_LINE[r.style].length]}”{r.week !== undefined && <span className="ml-1.5 font-sans text-[11px] font-black text-ink2">최근 7일 {r.week >= 0 ? '+' : ''}{(r.week * 100).toFixed(1)}%</span>}</p>}
            </div>
          );
        })}
        {rows.length > shown.length && <button onClick={() => setAll(true)} className="mt-2 w-full text-[12px] font-black text-ink2 underline">전체 보기</button>}
      </div>
      <p className="m-0 text-[11px] font-bold leading-snug text-ink2">라이벌은 왕국이 만든 가상의 상인이에요. 모두에게 같은 순위표가 보여요. 다른 플레이어와의 순위는 서버가 생기면 열려요.</p>
    </div>
  );
}
