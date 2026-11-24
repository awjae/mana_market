import { useState } from 'react';
import { fantasyDate } from '@mana/engine';
import { CATCH_LABEL, CREATURES, FOUND_ITEMS, ACTIVITY_CAP, DIVE_CAP, FISH_CAP, GEAR_PRICE, FISH_NAMES, FISH_VALUE, MAX_ROD, ROD_PRICE, SELL_CAP, SELL_PRICE, fishKey } from '../activity';
import { ITEMS, ITEM_LIMIT, LOOT, MONSTER_NAMES, maxFloorFor, playerStats, type ItemId } from '../dungeon';
import { MAT_KINDS, MAT_LABEL, matName } from '../gather';
import { fmt0 } from '../format';
import { useGame } from '../store';
import { Title } from './bits';

/** 마을 일과의 수입: 채집물 납품(고정가)과 낚시. 시세와 무관한 숫자만 보여 준다 */
export function DailyPanel({ bare }: { bare?: boolean } = {}) {
  const { mats, act, market, rod, gear, fishLog, earned, cash, server, sellMat, buyRod, buyGear, dlog, craftItem } = useGame();
  const [msg, setMsg] = useState<string | null>(null), [askRod, setAskRod] = useState(false), [askGear, setAskGear] = useState(false);
  const today = act.day === market.day ? act : { sold: 0, fished: 0, casts: 0, dove: 0, tries: 0 };
  const nextGear = GEAR_PRICE[gear + 1];
  const next = ROD_PRICE[rod + 1];
  const btn = 'panel-flat h-8 shrink-0 px-2 text-[12px] font-black disabled:opacity-50';
  return (
    <div className="space-y-2">
      {!bare && <Title ko="마을 일과" right={<span className="text-[11.5px] font-bold text-ink2">지금까지 번 마나 {fmt0(earned)}</span>} />}
      <div className="panel-flat space-y-3 bg-white p-3">
        <div>
          <p className="m-0 mb-1 text-[12.5px] font-black">재료 넘기기 <span className="font-num text-[11px] font-bold text-ink2">오늘 {fmt0(today.sold)}/{SELL_CAP} 마나</span></p>
          {MAT_KINDS.map((k) => (
            <div key={k} className="ruled flex items-center gap-2 py-1">
              <span className="min-w-0 flex-1 text-[12.5px] font-bold">{MAT_LABEL[k]}({matName(k, market.day)}) <span className="font-num text-ink2">{mats[k] ?? 0}개</span> <span className="text-[11px] text-ink2">1개 {SELL_PRICE[k]} 마나</span></span>
              <button disabled={!!server || !(mats[k] ?? 0)} onClick={() => setMsg(sellMat(k, 1))} className={btn}>1개</button>
              <button disabled={!!server || !(mats[k] ?? 0)} onClick={() => setMsg(sellMat(k, 99))} className={btn}>전부</button>
            </div>
          ))}
        </div>
        <div>
          <p className="m-0 mb-1 text-[12.5px] font-black">낚시 <span className="font-num text-[11px] font-bold text-ink2">오늘 {today.casts}번, {fmt0(today.fished)}/{FISH_CAP} 마나(넘으면 4분의 1)</span></p>
          <p className="m-0 mb-1 text-[11.5px] font-bold text-ink2">항구 부두 끝에서 E키(터치는 버튼)로 낚싯줄을 던져요. 물고기 말고도 게·가재·바다거북 같은 생물과 장화·병 속 편지·진주 같은 물건이 걸려요. 낚싯대 {rod}단계라 {rod}등급까지 낚여요{rod >= MAX_ROD ? '' : ''}. 4등급은 비 오는 날에만 나와요.</p>
          <div className="space-y-0.5">
            {(['봄', '여름', '가을', '겨울'] as const).map((se) => (
              <div key={se} className="text-[11.5px] font-bold">
                <span className="text-ink2">{se}</span> {FISH_NAMES[se].map((n, i) => { const c = fishLog[fishKey(se, i + 1)] ?? 0; return <span key={n} className={`mr-1.5 ${c ? '' : 'text-ink2/60'}`}>{c ? n : '???'}{c ? `×${c}` : ''}<span className="font-num text-[10.5px] text-ink2">({FISH_VALUE[i]})</span></span>; })}
              </div>
            ))}
          </div>
          <p className="m-0 mt-1 text-[11.5px] font-bold">생물 {CREATURES.map((c) => <span key={c.id} className={`mr-1.5 ${fishLog[`c:${c.id}`] ? '' : 'text-ink2/60'}`}>{fishLog[`c:${c.id}`] ? `${c.name}×${fishLog[`c:${c.id}`]}` : '???'}<span className="font-num text-[10.5px] text-ink2">({c.value})</span></span>)}</p>
          <p className="m-0 mt-0.5 text-[11.5px] font-bold">물건 {FOUND_ITEMS.map((c) => <span key={c.id} className={`mr-1.5 ${fishLog[`i:${c.id}`] ? '' : 'text-ink2/60'}`}>{fishLog[`i:${c.id}`] ? `${c.name}×${fishLog[`i:${c.id}`]}` : '???'}</span>)}</p>
          <p className="m-0 mt-0.5 text-[11px] font-bold text-ink2">모은 소품 재료: {Object.keys(CATCH_LABEL).map((k) => `${CATCH_LABEL[k]} ${mats[k] ?? 0}`).join(', ')}. 이 재료들은 프로필의 수공품 만들기에서 소품이 돼요(채집에서는 드물게 약초·황금 열매·수정도 나와요).</p>
          {next !== undefined && (
            <button disabled={!!server || cash < next} onClick={() => { if (!askRod) { setAskRod(true); setMsg(null); setTimeout(() => setAskRod(false), 4000); return; } setAskRod(false); setMsg(buyRod() ?? '낚싯대를 바꿨어요.'); }} className={`${btn} mt-1.5 min-w-[140px]`}>
              {askRod ? `${fmt0(next)} 마나 쓰기` : `낚싯대 ${rod + 1}단계 ${fmt0(next)} 마나`}
            </button>
          )}
        </div>
        <div>
          <p className="m-0 mb-1 text-[12.5px] font-black">던전 <span className="font-num text-[11px] font-bold text-ink2">오늘 {today.tries}번, {fmt0(today.dove)}/{DIVE_CAP} 마나</span></p>
          <p className="m-0 mb-1 text-[11.5px] font-bold text-ink2">광장 위쪽 동굴 입구에서 몇 번이고 들어갈 수 있어요. 몬스터가 다음 행동을 알려 주니 보고 [공격] [방어] [강타]를 골라요. 장비 {gear}단계라 {maxFloorFor(gear)}층까지 가요(5층마다 보스). 깬 층마다 4 마나, 보스를 쓰러뜨리면 8 마나를 더 받아요. 체력 {playerStats(gear).hp}, 공격 {playerStats(gear).atk}, 방어 {playerStats(gear).def}(장비 {gear}단계).</p>
          {nextGear !== undefined && (
            <button disabled={!!server || cash < nextGear} onClick={() => { if (!askGear) { setAskGear(true); setMsg(null); setTimeout(() => setAskGear(false), 4000); return; } setAskGear(false); setMsg(buyGear() ?? '장비를 바꿨어요.'); }} className={`${btn} min-w-[140px]`}>
              {askGear ? `${fmt0(nextGear)} 마나 쓰기` : `장비 ${gear + 1}단계 ${fmt0(nextGear)} 마나`}
            </button>
          )}
        </div>
        <div>
          <p className="m-0 mb-1 text-[12.5px] font-black">던전 작업대 <span className="font-num text-[11px] font-bold text-ink2">도감 {dlog.seen.length}/{MONSTER_NAMES.length}</span></p>
          <p className="m-0 mb-1 text-[11.5px] font-bold">{MONSTER_NAMES.map((n, i) => <span key={n} className={`mr-1.5 ${dlog.seen.includes(i) ? '' : 'text-ink2/60'}`}>{dlog.seen.includes(i) ? n : '???'}</span>)}</p>
          <p className="m-0 mb-1 text-[11.5px] font-bold text-ink2">가진 재료: {LOOT.filter((l) => (dlog.mats[l.id] ?? 0) > 0).map((l) => `${l.name} ${dlog.mats[l.id]}`).join(', ') || '없어요'}. 던전 재료는 마나로 바꿀 수 없고, 소모품이나 꾸미기 소품(프로필)을 만들어요.</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ITEMS) as ItemId[]).map((id) => (
              <button key={id} disabled={!!server} onClick={() => setMsg(craftItem(id) ?? `${ITEMS[id].name}을(를) 만들었어요`)} className="panel-flat min-h-8 bg-white px-2 py-1 text-left text-[11.5px] font-black disabled:opacity-50">
                {ITEMS[id].name} {dlog.items[id]}/{ITEM_LIMIT}<span className="block text-[10.5px] font-bold text-ink2">{Object.entries(ITEMS[id].cost).map(([k, n]) => `${LOOT.find((l) => l.id === k)?.name} ${n}`).join(' + ')}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="m-0 text-[11px] font-bold leading-snug text-ink2">하루에 얻을 수 있는 몫은 모두 합쳐 {ACTIVITY_CAP} 마나까지예요. 값은 시세와 상관없이 정해져 있고, 낚싯대에 쓴 마나는 돌아오지 않아요. 지금은 {fantasyDate(market.day).season}이에요.</p>
        {msg && <p className="m-0 text-[12px] font-black" role="status">{msg}</p>}
      </div>
    </div>
  );
}
