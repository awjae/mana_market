import { useState } from 'react';
import { CATCH_LABEL, CREATURES, FISH_NAMES, FISH_VALUE, FOUND_ITEMS, fishKey } from '../activity';
import { LOOT, MONSTER_IDS, MONSTER_NAMES, lootOf } from '../dungeon';
import { monsterSprite } from '../scene/pixelMonsters';
import { useGame } from '../store';
import { useActivity } from './activityStore';

/** 도감: 낚시(물고기·생물·물건), 몬스터, 모은 재료. 아직 못 만난 것은 "???"(몬스터는 그림자)로 둔다 */
function MonsterCard({ k, seen }: { k: number; seen: boolean }) {
  const [fail, setFail] = useState(false);
  const id = MONSTER_IDS[k], shade = seen ? undefined : { filter: 'brightness(0) opacity(.55)' };
  return (
    <div className="panel-flat flex flex-col items-center gap-1 bg-white p-2 text-center">
      <div className="flex h-[92px] w-full items-center justify-center">
        {!fail ? <img src={`/art/dungeon/${id}.webp`} alt={seen ? MONSTER_NAMES[k] : '아직 못 만난 몬스터'} onError={() => setFail(true)} className="max-h-full max-w-full object-contain" style={shade} />
          : <img src={monsterSprite(k).href} alt={seen ? MONSTER_NAMES[k] : '아직 못 만난 몬스터'} className="max-h-full w-auto" style={{ imageRendering: 'pixelated', ...shade }} />}
      </div>
      <div className="text-[12px] font-black">{seen ? MONSTER_NAMES[k] : '???'}</div>
      <div className="text-[10.5px] font-bold text-ink2">{seen ? `드롭: ${LOOT.find((l) => l.id === lootOf(k))?.name}` : '쓰러뜨리면 등록돼요'}</div>
    </div>
  );
}

export function Codex() {
  const close = useActivity((s) => s.close), { fishLog, dlog, mats } = useGame();
  const [tab, setTab] = useState<'fish' | 'mon' | 'mat'>('fish');
  const tabBtn = (id: typeof tab, label: string) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`panel-flat h-9 flex-1 text-[13px] font-black ${tab === id ? 'bg-[#ffd36b]' : 'bg-white'}`}>{label}</button>;
  const fishDone = Object.keys(fishLog).length, total = 16 + CREATURES.length + FOUND_ITEMS.length;
  return (
    <div className="conv absolute inset-0 z-[65] flex flex-col" role="dialog" aria-modal="true" aria-label="도감" style={{ background: 'linear-gradient(#fff6e8, #f3ecff)' }}>
      <div className="flex items-center justify-between px-4 pt-3"><h2 className="m-0 font-display text-[20px]">도감</h2><button onClick={close} className="panel-flat h-8 bg-white px-2.5 text-[12px] font-black">닫기</button></div>
      <div className="flex gap-2 px-4 pt-2" role="tablist">{tabBtn('fish', `낚시 ${fishDone}/${total}`)}{tabBtn('mon', `몬스터 ${dlog.seen.length}/${MONSTER_NAMES.length}`)}{tabBtn('mat', '재료')}</div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3">
        {tab === 'fish' && (
          <div className="space-y-3">
            {(['봄', '여름', '가을', '겨울'] as const).map((se) => (
              <div key={se}><p className="m-0 mb-1 text-[12px] font-black text-ink2">{se}에 낚이는 물고기</p>
                <div className="grid grid-cols-4 gap-1.5">{FISH_NAMES[se].map((n, i) => { const c = fishLog[fishKey(se, i + 1)] ?? 0; return <div key={n} className="panel-flat bg-white p-1.5 text-center"><div className="text-[12px] font-black">{c ? n : '???'}</div><div className="font-num text-[10.5px] text-ink2">{c ? `×${c}` : `${FISH_VALUE[i]} 마나`}</div></div>; })}</div></div>
            ))}
            <div><p className="m-0 mb-1 text-[12px] font-black text-ink2">생물</p>
              <div className="grid grid-cols-4 gap-1.5">{CREATURES.map((c) => { const n = fishLog[`c:${c.id}`] ?? 0; return <div key={c.id} className="panel-flat bg-white p-1.5 text-center"><div className="text-[12px] font-black">{n ? c.name : '???'}</div><div className="font-num text-[10.5px] text-ink2">{n ? `×${n}` : `낚싯대 ${c.rod}단계`}</div></div>; })}</div></div>
            <div><p className="m-0 mb-1 text-[12px] font-black text-ink2">건져 올린 물건</p>
              <div className="grid grid-cols-4 gap-1.5">{FOUND_ITEMS.map((c) => { const n = fishLog[`i:${c.id}`] ?? 0; return <div key={c.id} className="panel-flat bg-white p-1.5 text-center"><div className="text-[11.5px] font-black">{n ? c.name : '???'}</div><div className="font-num text-[10.5px] text-ink2">{n ? `×${n}` : `낚싯대 ${c.rod}단계`}</div></div>; })}</div></div>
          </div>
        )}
        {tab === 'mon' && <div className="grid grid-cols-3 gap-2">{MONSTER_NAMES.map((_, k) => <MonsterCard key={k} k={k} seen={dlog.seen.includes(k)} />)}</div>}
        {tab === 'mat' && (
          <div className="space-y-2 text-[12.5px] font-bold">
            <p className="m-0 text-ink2">채집, 낚시, 던전에서 모은 재료예요. 프로필의 수공품 만들기와 생활 탭의 작업대에서 써요(마나로는 바꿀 수 없어요).</p>
            {[...[['풀', 'plant'], ['열매', 'fruit'], ['돌', 'stone']].map(([n, k]) => ({ k, n })), ...Object.entries(CATCH_LABEL).map(([k, n]) => ({ k, n })), ...LOOT.map((l) => ({ k: l.id, n: l.name }))].map(({ k, n }) => (
              <div key={k} className="ruled flex items-center justify-between py-1"><span>{n}</span><span className="font-num">{mats[k] ?? dlog.mats[k] ?? 0}</span></div>))}
          </div>
        )}
      </div>
    </div>
  );
}
