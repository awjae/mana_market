import { useState } from 'react';
import { fmt0 } from '../format';
import { MAX_MOUNT, MOUNT_PRICE, MOUNT_SPEED } from '../mount';
import { MOUNT_NAMES } from '../scene/pixelMounts';
import { useGame } from '../store';
import { Title } from './bits';

/** 탈것: 걷는 속도와 외형만 바뀐다(활동 수입·시세와 무관). 산 것은 마음대로 바꿔 탄다 */
export function MountPanel({ bare }: { bare?: boolean } = {}) {
  const { mounts, mount, cash, server, buyMount, rideMount } = useGame();
  const [ask, setAsk] = useState<number | null>(null), [msg, setMsg] = useState<string | null>(null);
  const btn = 'panel-flat h-9 min-w-[110px] shrink-0 px-2 text-[12px] font-black disabled:opacity-40';
  return (
    <div className="space-y-2">
      {!bare && <Title ko="탈것" />}
      <div className="panel-flat space-y-2 bg-white p-3">
        {Array.from({ length: MAX_MOUNT }, (_, i) => i + 1).map((k) => {
          const own = mounts.includes(k), on = mount === k;
          return (
            <div key={k} className="ruled flex items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1 leading-tight"><div className="text-[13px] font-black">{MOUNT_NAMES[k]}</div><div className="text-[11px] font-bold text-ink2">걷는 속도 {MOUNT_SPEED[k]}배</div></div>
              {own
                ? <button onClick={() => rideMount(on ? 0 : k)} className={`${btn} ${on ? 'bg-[#ffd36b]' : 'bg-white'}`}>{on ? '내려요' : '타요'}</button>
                : <button disabled={!!server || cash < MOUNT_PRICE[k]} onClick={() => { if (ask !== k) { setAsk(k); setMsg(null); setTimeout(() => setAsk((a) => (a === k ? null : a)), 4000); return; } setAsk(null); setMsg(buyMount(k) ?? `${MOUNT_NAMES[k]}을(를) 샀어요. 바로 타 봐요.`); }} className={`${btn} ${ask === k ? 'bg-[#fff0b8]' : 'bg-white'}`}>{ask === k ? `${fmt0(MOUNT_PRICE[k])} 마나 쓰기` : `${fmt0(MOUNT_PRICE[k])} 마나`}</button>}
            </div>
          );
        })}
        <p className="m-0 text-[11px] font-bold leading-snug text-ink2">탈것은 걷는 속도와 모습만 바꿔요. 낚시·던전 같은 활동이나 시세와는 상관없고, 쓴 마나는 돌아오지 않아요.{server ? ' 서버 모드에서는 쓸 수 없어요.' : ''}</p>
        {msg && <p className="m-0 text-[12px] font-black" role="status">{msg}</p>}
      </div>
    </div>
  );
}
