import { useState } from 'react';
import { fmt0 } from '../format';
import { PROP_NAMES } from '../scene/pixelHeroData';
import { SHOP_MAX, SHOP_NEED, SHOP_PRICES } from '../scene/townFx';
import { visitorsOf } from '../shop';
import { useGame } from '../store';
import { Title } from './bits';

/** 내 상점: 마을에 내 가게를 열고 꾸민다. 수입은 없고(정산 없음), 단계마다 가게 앞이 꾸며지고 손님 이야기가 늘어난다 */
export function ShopPanel({ bare }: { bare?: boolean } = {}) {
  const { shop, spent, cash, market, ownedProps, server, openShop, upgradeShop } = useGame();
  const [name, setName] = useState(''), [ask, setAsk] = useState(false), [msg, setMsg] = useState<string | null>(null);
  const go = (run: () => string | null, done: string) => {
    if (!ask) { setAsk(true); setMsg(null); setTimeout(() => setAsk(false), 4000); return; }
    setAsk(false); setMsg(run() ?? done);
  };
  const price = shop ? SHOP_PRICES[shop.lv] : SHOP_PRICES[0], locked = !shop && spent < SHOP_NEED;
  const btn = 'panel-flat h-9 min-w-[120px] shrink-0 px-2 text-[12px] font-black disabled:opacity-40';
  const owned = ownedProps.map((i) => PROP_NAMES[i]).filter(Boolean);
  return (
    <div className="space-y-2">
      {!bare && <Title ko="내 상점" right={shop ? <span className="text-[11.5px] font-bold text-ink2">{shop.lv}/{SHOP_MAX}단계</span> : undefined} />}
      <div className="panel-flat space-y-2.5 bg-white p-3">
        {!shop ? (
          <>
            <p className="m-0 text-[12.5px] font-bold">{locked ? `쓴 마나가 ${fmt0(SHOP_NEED)} 마나가 되면 마을에 내 가게를 열 수 있어요. 지금까지 ${fmt0(spent)} 마나를 썼어요.` : '마을에 내 가게를 열어요. 가게는 꾸미는 재미만 있고 수입은 없어요.'}</p>
            <div className="flex items-center gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={10} placeholder="가게 이름 (2~10자)" aria-label="가게 이름" disabled={locked || !!server} className="min-w-0 flex-1 border-2 border-ink bg-[#fffdf5] px-2 py-1.5 text-[13px] font-bold disabled:opacity-50" />
              <button disabled={locked || !!server || name.trim().length < 2} onClick={() => go(() => openShop(name), '가게를 열었어요. 마을에 노점이 생겼어요.')} className={btn}>{ask ? `${fmt0(price)} 마나 쓰기` : `개업 ${fmt0(price)} 마나`}</button>
            </div>
          </>
        ) : (
          <>
            <p className="m-0 font-display text-[18px]">{shop.name}</p>
            <ul className="m-0 list-none space-y-0.5 p-0 text-[12px] font-bold text-ink2">{visitorsOf(market.day, shop.lv, owned).map((t, i) => <li key={i}>오늘 {t}.</li>)}</ul>
            {shop.lv < SHOP_MAX && <button disabled={!!server || cash < price} onClick={() => go(upgradeShop, '가게 앞이 한결 보기 좋아졌어요.')} className={btn}>{ask ? `${fmt0(price)} 마나 쓰기` : `확장 ${fmt0(price)} 마나`}</button>}
            {shop.lv >= SHOP_MAX && <p className="m-0 text-[12px] font-bold">가게가 마을의 명물이 됐어요.</p>}
          </>
        )}
        <p className="m-0 text-[11px] font-bold leading-snug text-ink2">쓴 마나는 돌아오지 않아요. 가게는 정산이 없고 시세와도 상관없어요.{server ? ' 서버 모드에서는 쓸 수 없어요.' : ''}</p>
        {msg && <p className="m-0 text-[12px] font-black" role="status">{msg}</p>}
      </div>
    </div>
  );
}
