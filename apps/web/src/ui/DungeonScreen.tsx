import { useMemo, useState } from 'react';
import { sfx } from '../audio';
import { HEROINES } from '../scene/heroines';
import { UNLOCK_PTS } from '../scene/pixelHeroData';
import { THEME_NAME, themeOf, MONSTER_IDS, SUPPORT, applySupport, ELEMENTS, ELEMENT_NAME, INTENT_TEXT, ITEMS, ROOM_INFO, SKILL_CD, applyRoom, elementMult, lootName, lootOf, roomsFor, healBetween, intentAt, isBossFloor, maxFloorFor, monsterFor, playerStats, startFloor, turn, weakness, type Action, type Battle, type Element } from '../dungeon';
import { eventOf } from '../events';
import { josa } from '../josa';
import { dungeonTile, tierOf } from '../scene/dungeonBg';
import { monsterSprite } from '../scene/pixelMonsters';
import { useGame } from '../store';
import { useActivity } from './activityStore';

const ELEM_COLOR: Record<Element, string> = { fire: '#ff7a45', ice: '#58b8ff', bolt: '#ffd23c' };
const Bar = ({ v, max, color, label }: { v: number; max: number; color: string; label: string }) => (
  <div className="flex items-center gap-1.5"><span className="w-12 shrink-0 text-[11.5px] font-black">{label}</span>
    <div className="h-3.5 flex-1 border-2 border-ink bg-white" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(v)}><div className="h-full transition-[width] duration-200" style={{ width: `${Math.max(0, (v / max) * 100)}%`, background: color }} /></div>
    <span className="w-14 shrink-0 text-right font-num text-[11.5px]">{Math.round(v)}/{Math.round(max)}</span></div>
);

/** 던전: 몬스터가 매 턴 예고하는 행동과 약점 속성을 읽고 고르는 결정적 턴제 전투 화면(전체 화면 오버레이) */
export function DungeonScreen() {
  const close = useActivity((s) => s.close);
  const { market, gear, startDive, finishDive, dungeonCollect, useItem, dlog, bond } = useGame();
  const day = market.day, p = playerStats(gear), top = maxFloorFor(gear);
  const [stage, setStage] = useState<'intro' | 'battle' | 'between' | 'end'>('intro');
  const [b, setB] = useState<Battle | null>(null), [cleared, setCleared] = useState(0), [bosses, setBosses] = useState(0), [res, setRes] = useState('');
  const [elem, setElem] = useState<Element>('fire'), [drop, setDrop] = useState(''), [ally, setAlly] = useState<string | null>(null), [allyUsed, setAllyUsed] = useState(false), [artFail, setArtFail] = useState<Record<string, boolean>>({});
  const allies = Object.values(HEROINES).filter((h) => (bond[h.id]?.pts ?? 0) >= UNLOCK_PTS);
  const [fx, setFx] = useState<{ n: number; mon: number; me: number; weak: boolean } | null>(null);
  const bg = useMemo(() => dungeonTile(tierOf(b?.floor ?? 1)), [b?.floor]);
  const begin = () => { const e = startDive(); if (e) { setRes(e); setStage('end'); return; } setB(startFloor(day, 1, p.hp, p.hp)); setCleared(0); setBosses(0); setFx(null); setAllyUsed(false); setStage('battle'); };
  const end = (c: number, bs: number) => { setRes(finishDive(c, bs)); setStage('end'); };
  const act = (a: Action) => {
    if (!b || b.over) return;
    const wk = weakness(day, b.floor, b.turn), hits = a === 'attack' || a === 'skill', mult = hits ? Math.max(elementMult(elem, wk, b.last), b.charm ? 1.5 : 0) : 1;
    const nb = turn(b, a, day, gear, elem); setB(nb);
    setFx({ n: (fx?.n ?? 0) + 1, mon: b.mhp - nb.mhp, me: b.php - nb.php, weak: hits && mult > 1 });
    if (!hits) sfx.guard(); else if (mult > 1) sfx.weak(); else sfx.hit();
    if (nb.php < b.php) setTimeout(() => sfx.hurt(), 120);
    if (nb.over === 'win') { sfx.win(); dungeonCollect({ kind: monsterFor(day, b.floor).kind }); setDrop(`${lootName(lootOf(monsterFor(day, b.floor).kind))}을(를) 얻었어요`); const c = nb.floor, bs = bosses + (isBossFloor(c) ? 1 : 0); setCleared(c); setBosses(bs); if (c >= top) end(c, bs); else setStage('between'); }
    else if (nb.over === 'lose') end(cleared, bosses);
  };
  const choose = (room: ReturnType<typeof roomsFor>[number]) => {
    if (!b) return;
    const r = applyRoom(room, healBetween(b.php, p.hp), p.hp, day, b.floor);
    dungeonCollect({ mats: r.mats, potion: r.potion }); setDrop('');
    setB(startFloor(day, b.floor + 1, r.php, p.hp)); setFx(null); setStage('battle');
  };
  const callAlly = () => { if (b && ally && !allyUsed) { setB(applySupport(b, ally)); setAllyUsed(true); sfx.weak(); } };
  const useCharm = () => { if (b && !b.charm && useItem('charm')) setB({ ...b, charm: true }); };
  const usePotion = () => { if (b && b.php < b.pmax && useItem('potion')) act('potion'); };
  const m = b ? monsterFor(day, b.floor) : null, it = b && m ? intentAt(m, b.turn) : null, wk = b ? weakness(day, b.floor, b.turn) : null;
  const btn = 'panel-flat h-14 flex-1 text-[14px] font-black disabled:opacity-45';
  return (
    <div className="conv absolute inset-0 z-[65] flex flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label="던전" style={{ backgroundColor: '#241838', backgroundImage: bg ? `url(${bg})` : undefined, backgroundSize: '128px 128px', imageRendering: 'pixelated' }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 12% 18%, rgba(255,160,70,.32), transparent 22%), radial-gradient(circle at 88% 18%, rgba(255,160,70,.32), transparent 22%), radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(10,4,20,.78))' }} />
      {fx && fx.me > 0 && <div key={`f${fx.n}`} className="dg-flash pointer-events-none absolute inset-0 bg-[#e8432e]" />}
      <div className="relative flex items-center justify-between px-4 pt-3 text-white">
        <h2 className="m-0 font-display text-[20px]">동굴 {b && stage !== 'intro' ? `${b.floor}층` : ''}{m?.boss && stage === 'battle' ? ' (보스)' : ''}</h2>
        <button onClick={() => (stage === 'battle' || stage === 'between' ? end(cleared, bosses) : close())} className="panel-flat h-8 bg-white px-2.5 text-[12px] font-black text-ink">{stage === 'battle' || stage === 'between' ? '돌아가기' : '닫기'}</button>
      </div>
      {stage === 'intro' && (
        <div className="relative m-4 panel-flat space-y-2 bg-paper p-4">
          <p className="m-0 text-[14px] font-bold">어두운 동굴이 입을 벌리고 있어요. 장비 {gear}단계라 {top}층까지 내려갈 수 있어요(5층마다 보스가 있어요). 오늘은 <b>{THEME_NAME[themeOf(day)]}</b>이에요{themeOf(day) === 'poison' ? '(숨 고르는 몬스터도 독을 뿜어요)' : themeOf(day) === 'counter' ? '(숨 고르는 몬스터도 반격 자세를 잡아요)' : ''}{eventOf(day) ? `. ${eventOf(day)!.name}이라 3층에 축제 도깨비가 나와요` : ''}. 몇 번이고 다시 들어갈 수 있어요. 마나는 그날 가장 좋은 기록만큼만 받지만, 재료와 도감은 들어갈 때마다 쌓여요.</p>
          <p className="m-0 text-[12.5px] font-bold text-ink2">체력 {p.hp}, 공격 {p.atk}, 방어 {p.def} (장비 {gear}단계). 몬스터는 매 턴 다음 행동과 약점 속성을 보여 줘요. 약점 속성으로 때리면 1.5배, 약하게 통하는 속성은 절반, 같은 속성을 연달아 쓰면 무뎌져요. 강한 일격과 독 앞에서는 [방어]가 좋고, 반격 자세의 몬스터를 때리면 내가 다쳐요.</p>
          {allies.length > 0 && (
            <div className="space-y-1"><p className="m-0 text-[12px] font-black">함께 갈 친구 (들어갈 때 한 번만 도와줘요)</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="함께 갈 친구">
                <button role="radio" aria-checked={ally === null} onClick={() => setAlly(null)} className={`panel-flat h-8 px-2 text-[12px] font-black ${ally === null ? 'bg-[#ffd36b]' : 'bg-white'}`}>혼자 갈래요</button>
                {allies.map((h) => <button key={h.id} role="radio" aria-checked={ally === h.id} onClick={() => setAlly(h.id)} className={`panel-flat h-8 px-2 text-[12px] font-black ${ally === h.id ? 'bg-[#ffd36b]' : 'bg-white'}`}>{h.name}</button>)}
              </div>
              {ally && <p className="m-0 text-[11.5px] font-bold text-ink2">{HEROINES[ally].name}: {SUPPORT[ally].text}</p>}
            </div>
          )}
          <button onClick={begin} className="panel-flat h-12 w-full bg-[#ffe3ee] text-[15px] font-black">들어가기</button>
        </div>
      )}
      {(stage === 'battle' || stage === 'between') && b && m && wk && (
        <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-4">
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="relative">
              <div key={`m${fx?.n ?? 0}`} className={fx && fx.mon > 0 ? 'dg-hit' : ''}>
                {!artFail[MONSTER_IDS[m.kind]]
                  ? <img src={`/art/dungeon/${MONSTER_IDS[m.kind]}.webp`} alt={m.name} draggable={false} onError={() => setArtFail((x) => ({ ...x, [MONSTER_IDS[m.kind]]: true }))} className={`dg-breathe h-[230px] w-auto max-w-full object-contain ${stage === 'between' ? 'opacity-30' : ''}`} />
                  : <img src={monsterSprite(m.kind).href} alt={m.name} draggable={false} className={`dg-breathe h-[210px] w-auto ${stage === 'between' ? 'opacity-30' : ''}`} style={{ imageRendering: 'pixelated' }} />}
              </div>
              {fx && fx.mon > 0 && <span key={`d${fx.n}`} className="dg-float pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 font-display text-[34px]" style={{ color: fx.weak ? '#ffd23c' : '#fff', textShadow: '2px 2px 0 #35244a, -2px -2px 0 #35244a, 2px -2px 0 #35244a, -2px 2px 0 #35244a' }}>{fx.weak ? '약점! ' : ''}{fx.mon}</span>}
            </div>
            <p className="m-0 mt-1 font-display text-[18px] text-white">{m.name}</p>
            {stage === 'battle' && <p className="m-0 mt-0.5 text-[12px] font-black text-white">약점 <span style={{ color: ELEM_COLOR[wk.weak] }}>{ELEMENT_NAME[wk.weak]}</span>, <span className="opacity-80">{josa(ELEMENT_NAME[wk.resist], '은는')} 약하게 통해요</span></p>}
          </div>
          <div className="space-y-1.5 panel-flat bg-paper p-3">
            <Bar v={b.mhp} max={m.hp} color="#e8432e" label={m.name.length > 4 ? '적' : m.name} />
            <Bar v={b.php} max={b.pmax} color="#35c07a" label="나" />
            {b.poison > 0 && <p className="m-0 text-[12px] font-black text-[#7a2ab8]" role="status">중독 중이야 (앞으로 {b.poison}턴, 매 턴 체력이 줄어)</p>}
            {stage === 'battle' && it && <p className="m-0 border-2 border-dashed border-ink bg-[#fff6d8] px-2 py-1 text-[13px] font-black" role="status">{josa(m.name, '이가')} {INTENT_TEXT[it]}.</p>}
            {b.log && <p className="m-0 text-[12px] font-bold text-ink2" role="status">{b.log}</p>}
            {stage === 'battle' ? (
              <>
                <div className="flex gap-2" role="radiogroup" aria-label="공격 속성">
                  {ELEMENTS.map((e) => (
                    <button key={e} role="radio" aria-checked={elem === e} onClick={() => setElem(e)} className={`panel-flat h-9 flex-1 text-[13px] font-black ${elem === e ? 'ring-2 ring-ink' : ''}`} style={{ background: elem === e ? ELEM_COLOR[e] : '#fff' }}>
                      {ELEMENT_NAME[e]}{b.last === e ? ' (무뎌짐)' : ''}
                    </button>
                  ))}
                </div>
                {(dlog.items.potion > 0 || dlog.items.charm > 0 || ally) && (
                  <div className="flex gap-2">
                    {ally && <button onClick={callAlly} disabled={allyUsed} className="panel-flat h-9 flex-1 text-[12.5px] font-black disabled:opacity-45">{allyUsed ? `${HEROINES[ally].name}의 도움은 썼어요` : `${HEROINES[ally].name}에게 도움 청하기`}</button>}
                    {dlog.items.potion > 0 && <button onClick={usePotion} disabled={b.php >= b.pmax} className="panel-flat h-9 flex-1 text-[12.5px] font-black disabled:opacity-45">{ITEMS.potion.name} {dlog.items.potion}개</button>}
                    {dlog.items.charm > 0 && <button onClick={useCharm} disabled={b.charm} className="panel-flat h-9 flex-1 text-[12.5px] font-black disabled:opacity-45">{b.charm ? '부적이 빛나고 있어' : `${ITEMS.charm.name} ${dlog.items.charm}개`}</button>}
                  </div>
                )}
                <div className="flex gap-2 pt-0.5">
                  <button onClick={() => act('attack')} className={btn}>{ELEMENT_NAME[elem]} 공격</button>
                  <button onClick={() => act('defend')} className={btn}>방어</button>
                  <button onClick={() => act('skill')} disabled={b.cd > 0} className={btn}>{ELEMENT_NAME[elem]} 강타{b.cd > 0 ? ` (${b.cd})` : ''}</button>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <p className="m-0 text-[12.5px] font-black">{b.floor}층을 깼어! {drop}. 숨을 고르며(체력 30%) 다음에 들를 방을 골라요.</p>
                <div className="flex gap-2">{roomsFor(day, b.floor).map((r) => <button key={r} onClick={() => choose(r)} className="panel-flat min-h-14 flex-1 bg-[#ffe3ee] px-1.5 py-1 text-left text-[12.5px] font-black">{ROOM_INFO[r].name}<span className="block text-[11px] font-bold text-ink2">{ROOM_INFO[r].desc}</span></button>)}</div>
              </div>
            )}
            <p className="m-0 text-[10.5px] font-bold text-ink2">[강타]는 한 번 쓰면 {SKILL_CD}턴 뒤에 다시 쓸 수 있어요. 보스는 3턴마다 약점이 바뀌어요. 지면 마나를 잃지 않고, 깬 층까지만 받아요.</p>
          </div>
        </div>
      )}
      {stage === 'end' && (
        <div className="relative m-4 panel-flat space-y-2 bg-paper p-4"><p className="m-0 text-[14px] font-black" role="status">{res}</p>
          <div className="flex gap-2">{<button onClick={() => { setStage('intro'); setB(null); }} className="panel-flat h-10 flex-1 text-[13px] font-black">한 번 더 들어가기</button>}<button onClick={close} className="panel-flat h-10 flex-1 text-[13px] font-black">마을로 돌아가기</button></div></div>
      )}
    </div>
  );
}
