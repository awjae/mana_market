import { useState } from 'react';
import { fmt0 } from '../format';
import { FACILITIES, MAX_TIER, nextUnlock, prosperity } from '../scene/townFx';
import { useGame } from '../store';
import { Title } from './bits';

/** 마을 가꾸기: 마나를 영구히 써서 마을 장식을 늘린다. 시세·거래에는 영향이 없고, 쓴 마나는 돌아오지 않는다 */
export function TownPanel({ bare }: { bare?: boolean } = {}) {
  const { town, cash, donate, server, spent } = useGame(), nu = nextUnlock(spent);
  const [ask, setAsk] = useState<string | null>(null), [msg, setMsg] = useState<string | null>(null);
  const go = (id: string) => {
    if (ask !== id) { setAsk(id); setMsg(null); setTimeout(() => setAsk((a) => (a === id ? null : a)), 4000); return; }
    setAsk(null); setMsg(donate(id) ?? '기부했어요. 마을이 한결 밝아졌어요.');
  };
  return (
    <div className="space-y-2">
      {!bare && <Title ko="마을 가꾸기" right={<span className="text-[11.5px] font-bold text-ink2">번영도 {prosperity(town)}%</span>} />}
      <div className="panel-flat space-y-2.5 bg-white p-3">
        {nu && <p className="m-0 text-[11.5px] font-bold text-ink2">지금까지 쓴 마나 {fmt0(spent)} 마나. {nu.name}은(는) {fmt0(nu.need - spent)} 마나를 더 쓰면 열려요.</p>}
        {FACILITIES.map((f) => {
          const tier = Math.min(MAX_TIER, town[f.id] ?? 0), price = f.tiers[tier], done = tier >= MAX_TIER, armed = ask === f.id, locked = !!f.need && spent < f.need;
          return (
            <div key={f.id} className="ruled flex items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[13px] font-black">{f.name} <span className="font-num text-[11px] text-ink2">{tier}/{MAX_TIER}단계</span></div>
                <div className="text-[11px] font-bold text-ink2">{locked ? `쓴 마나가 ${fmt0(f.need!)} 마나가 되면 열려요` : f.desc}</div>
              </div>
              <button disabled={done || locked || !!server} onClick={() => go(f.id)} className={`panel-flat h-9 min-w-[96px] shrink-0 px-2 text-[12px] font-black disabled:opacity-40 ${armed ? 'bg-[#fff0b8]' : 'bg-white'}`}>
                {done ? '완료' : locked ? '잠겨 있어요' : armed ? `${fmt0(price)} 마나 쓰기` : `${fmt0(price)} 마나`}
              </button>
            </div>
          );
        })}
        <p className="m-0 text-[11px] font-bold leading-snug text-ink2">{server ? '서버 모드에서는 기부할 수 없어요. ' : ''}쓴 마나는 돌아오지 않아요. 지금 현금은 {fmt0(cash)} 마나예요{ask ? `, 기부하면 ${fmt0(cash - (FACILITIES.find((x) => x.id === ask)?.tiers[Math.min(MAX_TIER - 1, town[ask] ?? 0)] ?? 0))} 마나가 남아요` : ''}.</p>
        {msg && <p className="m-0 text-[12px] font-black" role="status">{msg}</p>}
      </div>
    </div>
  );
}
