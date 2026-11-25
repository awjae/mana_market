import { useMemo, useState } from 'react';
import { sfx } from '../audio';
import { OATHS, type Oath, STANCE_NAME, stanceFor, INTENT_TEXT, ITEMS, NODE_INFO, SUPPORT, THEME_NAME, ELEMENT_NAME, MONSTER_IDS, applyNode, applySupport, canUse, elementMult, healBetween, intentAt, isBossFloor, lootName, lootOf, monsterFor, nodesFor, skillCost, startFloor, statsOf, themeOf, turn, weakness, xpForKill, type Act, type Battle, type Build, type NodeKind } from '../dungeon';
import { eventOf } from '../events';
import { josa } from '../josa';
import { dungeonTile, tierOf } from '../scene/dungeonBg';
import { HEROINES } from '../scene/heroines';
import { UNLOCK_PTS } from '../scene/pixelHeroData';
import { monsterSprite } from '../scene/pixelMonsters';
import { CLASSES, CLS_LIST, CLS_RES, CROSS_SLOTS, ENERGY_MAX, MAX_RANK, RELIC_BY_ID, RELIC_EVERY, SKILL_BY_ID, SLOT_COUNT, freePoints, levelOf, rankOf, relicChoices, skillsOf, validSlots, type Cls } from '../skills';
import { useGame } from '../store';
import { TEMPLE_SPOT } from '../gather';
import { gotoTile } from '../places';
import { useActivity } from './activityStore';

const Bar = ({ v, max, color, label }: { v: number; max: number; color: string; label: string }) => (
  <div className="flex items-center gap-1.5"><span className="w-10 shrink-0 text-[11.5px] font-black">{label}</span>
    <div className="h-3.5 flex-1 border-2 border-ink bg-white" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(v)}><div className="h-full transition-[width] duration-200" style={{ width: `${Math.max(0, (v / max) * 100)}%`, background: color }} /></div>
    <span className="w-14 shrink-0 text-right font-num text-[11.5px]">{Math.round(v)}/{Math.round(max)}</span></div>
);

/** 스킬 관리: 어느 계열의 스킬이든 포인트로 배우고 강화하고, 전투에 가져갈 5칸(주 계열 밖은 2칸까지)을 고른다 */
function SkillManager() {
  const g = useGame(), { dun, learnSkill, toggleSlot } = g, lvl = levelOf(dun.xp).lvl, [msg, setMsg] = useState(''), [tab, setTab] = useState<Cls>(dun.cls ?? 'warrior');
  if (!dun.cls) return null;
  const pts = freePoints(lvl, dun.ranks), slots = validSlots(dun.cls, dun.ranks, dun.slots, dun.sub), cross = slots.filter((id) => SKILL_BY_ID[id].cls !== dun.cls).length;
  const open = CLS_LIST.filter((c) => c === dun.cls || c === dun.sub);
  return (
    <div className="space-y-1.5">
      <p className="m-0 text-[12px] font-black">스킬 포인트 {pts}점 <span className="font-bold text-ink2">· 장착 {slots.length}/{SLOT_COUNT}칸(부 직업은 {cross}/{CROSS_SLOTS}칸)</span></p>
      <div className="flex flex-wrap gap-1" aria-label="장착한 스킬">{slots.map((id) => <span key={id} className={`border-2 border-ink px-1.5 py-0.5 text-[11px] font-black ${SKILL_BY_ID[id].cls === dun.cls ? 'bg-[#ffd36b]' : 'bg-[#e8f8ff]'}`}>{SKILL_BY_ID[id].name}{SKILL_BY_ID[id].cls === dun.cls ? '' : ' (교차)'}</span>)}</div>
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="계열">{open.map((c) => <button key={c} role="tab" aria-selected={tab === c} onClick={() => setTab(c)} className={`panel-flat h-8 px-2 text-[11.5px] font-black ${tab === c ? 'bg-[#ffd36b]' : 'bg-white'}`}>{CLASSES[c].name}{c === dun.cls ? ' ★' : ''}</button>)}</div>
      {tab !== dun.cls && <p className="m-0 text-[11px] font-bold text-ink2">부 직업의 스킬은 계열 고유 자원(기세·콤보·시약·자세·덫)을 모으거나 쓰지 못해요. 대신 효과와 시너지는 그대로예요.</p>}
      {skillsOf(tab).map((s) => { const r = rankOf(dun.ranks, s.id), on = slots.includes(s.id); return (
        <div key={s.id} className="panel-flat flex items-center gap-2 bg-white px-2 py-1.5">
          <div className="min-w-0 flex-1 leading-tight"><div className="text-[12.5px] font-black">{s.name} <span className="font-num text-[11px] text-ink2">{r > 0 ? `${r}랭크` : '아직 몰라요'} · 기력 {s.cost}{s.cd ? ` · 쿨 ${s.cd}` : ''}</span></div><div className="text-[11px] font-bold text-ink2">{s.desc}</div></div>
          <div className="flex shrink-0 flex-col gap-1">
            <button onClick={() => setMsg(learnSkill(s.id) ?? '')} disabled={r >= MAX_RANK || pts <= 0} className="panel-flat h-7 min-w-[62px] bg-[#e8f8ff] px-1.5 text-[11px] font-black disabled:opacity-40">{r === 0 ? '배우기' : r >= MAX_RANK ? '최대' : '강화'}</button>
            {r > 0 && <button onClick={() => { const before = dun.slots.length; toggleSlot(s.id); if (!on && useGame.getState().dun.slots.length === before) setMsg('더 장착할 수 없어요(5칸, 부 직업 스킬은 2칸까지)'); else setMsg(''); }} aria-pressed={on} className={`panel-flat h-7 min-w-[62px] px-1.5 text-[11px] font-black ${on ? 'bg-[#ffd36b]' : 'bg-white'}`}>{on ? '장착 중' : '장착'}</button>}
          </div>
        </div>); })}
      {msg && <p className="m-0 text-[11.5px] font-black text-[#b3261e]" role="status">{msg}</p>}
    </div>
  );
}

/** 던전: 클래스·스킬·유물·지도로 공략하는 결정적 턴제 RPG(전체 화면 오버레이) */
export function DungeonScreen() {
  const close = useActivity((s) => s.close);
  const { market, gear, startDive, finishDive, dungeonCollect, useItem, dlog, bond, dun, addXp } = useGame();
  const day = market.day, lv = levelOf(dun.xp);
  const [stage, setStage] = useState<'intro' | 'battle' | 'relic' | 'nodes' | 'end'>('intro');
  const [b, setB] = useState<Battle | null>(null), [cleared, setCleared] = useState(0), [bosses, setBosses] = useState(0), [res, setRes] = useState('');
  const [relics, setRelics] = useState<string[]>([]), [runXp, setRunXp] = useState(0), [drop, setDrop] = useState(''), [, setElite] = useState(false);
  const [ally, setAlly] = useState<string | null>(null), [allyUsed, setAllyUsed] = useState(false), [artFail, setArtFail] = useState<Record<string, boolean>>({}), [open, setOpen] = useState(false);
  const [oath, setOath] = useState<Oath | null>(null);
  const [fx, setFx] = useState<{ n: number; mon: number; me: number; weak: boolean } | null>(null);
  const allies = Object.values(HEROINES).filter((h) => (bond[h.id]?.pts ?? 0) >= UNLOCK_PTS);
  const build: Build = useMemo(() => ({ gear, lvl: lv.lvl, cls: dun.cls ?? 'warrior', ranks: dun.ranks, slots: validSlots(dun.cls ?? 'warrior', dun.ranks, dun.slots, dun.sub), relics, oath }), [gear, lv.lvl, dun, relics, oath]);
  const st = statsOf(build), bg = useMemo(() => dungeonTile(tierOf(b?.floor ?? 1)), [b?.floor]);
  const begin = () => { const e = startDive(); if (e) { setRes(e); setStage('end'); return; } setRelics([]); setB(startFloor(day, 1, st.hp, st.hp)); setCleared(0); setBosses(0); setRunXp(0); setElite(false); setFx(null); setAllyUsed(false); setStage('battle'); };
  const end = (c: number, bs: number, xp0 = runXp) => { const xp = Math.floor(xp0 * (oath ? OATHS[oath].xp : 1)); if (xp > 0) addXp(xp); setRes(`${finishDive(c, bs)}${xp > 0 ? `. 경험치 ${xp}를 얻었어요` : ''}`); setStage('end'); };
  const act = (a: Act) => {
    if (!b || b.over) return;
    const wk = weakness(day, b.floor, b.turn), sk = a.kind === 'skill' ? SKILL_BY_ID[a.id] : null;
    const nb = turn(b, a, day, build); setB(nb);
    const dmg = b.mhp - nb.mhp, weak = !!sk?.fx.elem && sk.fx.elem !== 'weak' && elementMult(sk.fx.elem, wk, b.last) > 1 || sk?.fx.elem === 'weak';
    setFx({ n: (fx?.n ?? 0) + 1, mon: dmg, me: b.php - nb.php, weak });
    if (a.kind === 'defend' || (sk && !sk.fx.dmg)) sfx.guard(); else if (weak) sfx.weak(); else sfx.hit();
    if (nb.php < b.php) setTimeout(() => sfx.hurt(), 120);
    if (nb.over === 'win') {
      sfx.win(); const f = nb.floor, mon = monsterFor(day, f, nb.elite), boss = isBossFloor(f), gain = xpForKill(f, boss, nb.elite);
      dungeonCollect({ kind: mon.kind, mats: nb.elite ? { [lootOf(mon.kind)]: 1 } : undefined });
      setDrop(`${lootName(lootOf(mon.kind))}을(를) 얻었어요${nb.elite ? '(정예라 두 배)' : ''}`); setCleared(f); setRunXp((x) => x + gain);
      const bs = bosses + (boss ? 1 : 0); setBosses(bs);
      if (f >= 20) end(f, bs, runXp + gain); else if (f % RELIC_EVERY === 0 && relicChoices(day, f, relics, build.cls).length) setStage('relic'); else setStage('nodes');
    } else if (nb.over === 'lose') end(cleared, bosses);
  };
  const pickRelic = (id: string) => { const nr = [...relics, id]; setRelics(nr); const nst = statsOf({ ...build, relics: nr }); if (b) setB({ ...b, php: b.php + (nst.hp - st.hp), pmax: nst.hp }); setStage('nodes'); };
  const goNode = (kind: NodeKind) => {
    if (!b) return;
    const pmax = statsOf(build).hp, r = applyNode(kind, healBetween(b.php, pmax), pmax, day, b.floor);
    dungeonCollect({ mats: r.mats, potion: r.potion }); setDrop(''); setElite(r.elite);
    setB(startFloor(day, b.floor + 1, r.php, pmax, r.elite)); setFx(null); setStage('battle');
  };
  const callAlly = () => { if (b && ally && !allyUsed) { setB(applySupport(b, ally)); setAllyUsed(true); sfx.weak(); } };
  const useCharm = () => { if (b && !b.charm && useItem('charm')) setB({ ...b, charm: true }); };
  const usePotion = () => { if (b && b.php < b.pmax && useItem('potion')) act({ kind: 'potion' }); };
  const m = b ? monsterFor(day, b.floor, b.elite) : null, it = b && m ? intentAt(m, b.turn) : null, wk = b ? weakness(day, b.floor, b.turn) : null;
  const btn = 'panel-flat min-h-[52px] text-[13px] font-black disabled:opacity-45';
  const inBattle = stage === 'battle';
  return (
    <div className="conv absolute inset-0 z-[65] flex flex-col overflow-y-auto" role="dialog" aria-modal="true" aria-label="던전" style={{ backgroundColor: '#241838', backgroundImage: bg ? `url(${bg})` : undefined, backgroundSize: '128px 128px', imageRendering: 'pixelated' }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 12% 18%, rgba(255,160,70,.32), transparent 22%), radial-gradient(circle at 88% 18%, rgba(255,160,70,.32), transparent 22%), radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(10,4,20,.78))' }} />
      {fx && fx.me > 0 && <div key={`f${fx.n}`} className="dg-flash pointer-events-none absolute inset-0 bg-[#e8432e]" />}
      <div className="relative flex items-center justify-between px-4 pt-3 text-white">
        <h2 className="m-0 font-display text-[20px]">동굴 {b && stage !== 'intro' ? `${b.floor}층` : ''}{m?.boss && inBattle ? ' (보스)' : ''}{b?.elite && inBattle ? ' (정예)' : ''}</h2>
        <button onClick={() => (inBattle || stage === 'nodes' || stage === 'relic' ? end(cleared, bosses) : close())} className="panel-flat h-8 bg-white px-2.5 text-[12px] font-black text-ink">{inBattle || stage === 'nodes' || stage === 'relic' ? '돌아가기' : '닫기'}</button>
      </div>
      {stage === 'intro' && (
        <div className="relative m-3 panel-flat space-y-2 bg-paper p-3.5">
          <div className="flex items-center justify-between"><b className="font-display text-[16px]">{dun.cls ? `${CLASSES[dun.cls].name} 레벨 ${lv.lvl}` : '클래스를 골라요'}</b>{dun.cls && lv.need > 0 && <span className="font-num text-[11.5px] font-bold text-ink2">경험치 {lv.into}/{lv.need}</span>}</div>
          {dun.cls && lv.need > 0 && <div className="h-2 border-2 border-ink bg-white"><div className="h-full bg-[#58b8ff]" style={{ width: `${(lv.into / lv.need) * 100}%` }} /></div>}
          {dun.cls ? <p className="m-0 text-[12px] font-bold text-ink2">{CLASSES[dun.cls].desc} <b>{CLS_RES[dun.cls].name}</b>: {CLS_RES[dun.cls].rule} 체력 {st.hp}, 공격 {st.atk}, 방어 {st.def}(장비 {gear}단계 + 레벨).</p> : <div className="space-y-1.5"><p className="m-0 text-[12px] font-bold text-ink2">아직 직업이 없어요. 마을의 성당에서 직업을 받을 수 있어요(마나를 쓴 만큼 문이 열려요).</p><button onClick={() => { close(); gotoTile(TEMPLE_SPOT.tile); }} className="panel-flat h-10 w-full bg-[#ffe3ee] text-[13px] font-black">성당으로 걸어가기</button></div>}
          {dun.cls && <button onClick={() => { close(); gotoTile(TEMPLE_SPOT.tile); }} className="panel-flat h-8 w-full bg-white text-[12px] font-black">직업을 바꾸려면 성당으로 걸어가기</button>}
          {dun.cls && (
            <>
              <p className="m-0 text-[12.5px] font-bold">스킬로 싸우고 3층마다 유물을, 층 사이에는 길을 골라요. 몬스터가 다음 행동과 약점 속성을 알려 줘요. 몇 번이고 들어갈 수 있고 마나는 그날 가장 좋은 기록만큼만 받아요. 오늘은 <b>{THEME_NAME[themeOf(day)]}</b>{eventOf(day) ? `, ${eventOf(day)!.name}이라 3층에 축제 도깨비가 나와요` : ''}.</p>
              {allies.length > 0 && (
                <div className="space-y-1"><p className="m-0 text-[12px] font-black">함께 갈 친구 (들어갈 때 한 번만 도와줘요)</p>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="함께 갈 친구">
                    <button role="radio" aria-checked={ally === null} onClick={() => setAlly(null)} className={`panel-flat h-8 px-2 text-[12px] font-black ${ally === null ? 'bg-[#ffd36b]' : 'bg-white'}`}>혼자 갈래요</button>
                    {allies.map((h) => <button key={h.id} role="radio" aria-checked={ally === h.id} onClick={() => setAlly(h.id)} className={`panel-flat h-8 px-2 text-[12px] font-black ${ally === h.id ? 'bg-[#ffd36b]' : 'bg-white'}`}>{h.name}</button>)}
                  </div>{ally && <p className="m-0 text-[11.5px] font-bold text-ink2">{HEROINES[ally].name}: {SUPPORT[ally].text}</p>}</div>
              )}
              <div className="flex gap-1.5" role="radiogroup" aria-label="서약">{(Object.keys(OATHS) as Oath[]).map((o) => <button key={o} role="radio" aria-checked={oath === o} onClick={() => setOath(oath === o ? null : o)} className={`panel-flat flex-1 px-1.5 py-1 text-left text-[11.5px] font-black ${oath === o ? 'bg-[#ffd36b]' : 'bg-white'}`}>{OATHS[o].name}<span className="block text-[10.5px] font-bold text-ink2">{OATHS[o].desc}</span></button>)}</div>
              <button onClick={begin} className="panel-flat h-12 w-full bg-[#ffe3ee] text-[15px] font-black">들어가기</button>
              <button onClick={() => setOpen(!open)} aria-expanded={open} className="panel-flat h-9 w-full bg-white text-[12.5px] font-black">스킬 관리 {open ? '접기' : '펼치기'} (포인트 {freePoints(lv.lvl, dun.ranks)}점)</button>
              {open && <SkillManager />}
            </>
          )}
        </div>
      )}
      {(inBattle || stage === 'nodes' || stage === 'relic') && b && m && wk && (
        <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-3">
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="relative">
              <div key={`m${fx?.n ?? 0}`} className={fx && fx.mon > 0 ? 'dg-hit' : ''}>
                {!artFail[MONSTER_IDS[m.kind]]
                  ? <img src={`/art/dungeon/${MONSTER_IDS[m.kind]}.webp`} alt={m.name} draggable={false} onError={() => setArtFail((x) => ({ ...x, [MONSTER_IDS[m.kind]]: true }))} className={`dg-breathe h-[190px] w-auto max-w-full object-contain ${stage !== 'battle' ? 'opacity-25' : ''}`} />
                  : <img src={monsterSprite(m.kind).href} alt={m.name} draggable={false} className={`dg-breathe h-[170px] w-auto ${stage !== 'battle' ? 'opacity-25' : ''}`} style={{ imageRendering: 'pixelated' }} />}
              </div>
              {fx && fx.mon > 0 && <span key={`d${fx.n}`} className="dg-float pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 font-display text-[34px]" style={{ color: fx.weak ? '#ffd23c' : '#fff', textShadow: '2px 2px 0 #35244a, -2px -2px 0 #35244a, 2px -2px 0 #35244a, -2px 2px 0 #35244a' }}>{fx.weak ? '약점! ' : ''}{fx.mon}</span>}
            </div>
            <p className="m-0 mt-1 font-display text-[17px] text-white">{m.name}</p>
            {inBattle && <p className="m-0 text-[11.5px] font-black text-white">약점 <b>{ELEMENT_NAME[wk.weak]}</b>{b.mpoison > 0 ? ` · 중독 ${b.mpoison}` : ''}{b.burn > 0 ? ` · 화상 ${b.burn}` : ''}{b.mark > 0 ? ` · 표식 ${b.mark}` : ''}{b.slow > 0 ? ' · 약해짐' : ''}</p>}
          </div>
          <div className="space-y-1.5 panel-flat bg-paper p-2.5">
            <Bar v={b.mhp} max={Math.max(b.mhp, m.hp)} color="#e8432e" label="적" />
            <Bar v={b.php} max={b.pmax} color="#35c07a" label="나" />
            <Bar v={b.en} max={ENERGY_MAX} color="#58b8ff" label="기력" />
            {build.cls !== 'mage' && <p className="m-0 text-[11.5px] font-black" aria-label="계열 자원">{CLS_RES[build.cls].name}: {build.cls === 'warrior' || build.cls === 'rogue' || build.cls === 'smith' || build.cls === 'necro' ? `${b.res}/5${build.cls === 'necro' && b.minion > 0 ? ` · 하수인 ${b.minion}턴` : ''}` : build.cls === 'clockwork' ? '●'.repeat(b.res) + '○'.repeat(4 - b.res) : build.cls === 'priest' ? '●'.repeat(b.res) + '○'.repeat(4 - b.res) : build.cls === 'bard' ? (b.notes.map((n) => ({ A: '도', B: '레', C: '미' }[n])).join('-') || '없음') : build.cls === 'navigator' ? (Math.floor(b.turn / 2) % 2 === 0 ? '밀물' : '썰물') : build.cls === 'alchemist' ? '●'.repeat(b.res) + '○'.repeat(3 - b.res) : build.cls === 'swordsman' ? `${STANCE_NAME[b.stance]}${it && stanceFor(it) === b.stance ? ' (예고와 맞아요!)' : it && stanceFor(it) >= 0 ? ` (예고는 ${STANCE_NAME[stanceFor(it)]})` : ''}` : b.trap ? (b.trap === 'snare' ? '올가미 설치됨' : '독 덫 설치됨') : '없음'}</p>}
            {(b.poison > 0 || b.shield > 0 || b.buffTurns > 0 || relics.length > 0) && <p className="m-0 text-[11px] font-black text-ink2">{b.poison > 0 ? `중독 ${b.poison}턴 · ` : ''}{b.shield > 0 ? `방벽 ${b.shield} · ` : ''}{b.buffTurns > 0 ? `강화 ${b.buffTurns}턴 · ` : ''}{relics.length > 0 ? `유물 ${relics.map((r) => RELIC_BY_ID[r].name).join(', ')}` : ''}</p>}
            {inBattle && it && <p className="m-0 border-2 border-dashed border-ink bg-[#fff6d8] px-2 py-1 text-[12.5px] font-black" role="status">{josa(m.name, '이가')} {INTENT_TEXT[it]}.</p>}
            {b.log && <p className="m-0 text-[11.5px] font-bold text-ink2" role="status">{b.log}</p>}
            {inBattle && (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {build.slots.map((id) => { const s = SKILL_BY_ID[id], ok = canUse(b, build, id); return <button key={id} disabled={!ok} onClick={() => act({ kind: 'skill', id })} className={`${btn} bg-white px-1.5 py-1 text-left`}>{s.name}<span className="block text-[10.5px] font-bold text-ink2">{b.cds[id] ? `쿨다운 ${b.cds[id]}` : b.free > 0 ? '공짜' : `기력 ${skillCost(build, id)}`}{rankOf(dun.ranks, id) > 1 ? ` · ${rankOf(dun.ranks, id)}랭크` : ''}{s.cls !== build.cls ? ' · 교차' : ''}</span></button>; })}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => act({ kind: 'attack' })} className={`${btn} flex-1 bg-white`}>공격<span className="block text-[10.5px] font-bold text-ink2">기력 +1</span></button>
                  <button onClick={() => act({ kind: 'defend' })} className={`${btn} flex-1 bg-white`}>방어<span className="block text-[10.5px] font-bold text-ink2">기력 +1</span></button>
                  {oath !== 'frugal' && dlog.items.potion > 0 && <button onClick={usePotion} disabled={b.php >= b.pmax} className={`${btn} flex-1 bg-white`}>체력약<span className="block text-[10.5px] font-bold text-ink2">{dlog.items.potion}개</span></button>}
                  {oath !== 'frugal' && dlog.items.charm > 0 && <button onClick={useCharm} disabled={b.charm} className={`${btn} flex-1 bg-white`}>{b.charm ? '부적 중' : ITEMS.charm.name}<span className="block text-[10.5px] font-bold text-ink2">{dlog.items.charm}개</span></button>}
                  {ally && <button onClick={callAlly} disabled={allyUsed} className={`${btn} flex-1 bg-white`}>{HEROINES[ally].name}<span className="block text-[10.5px] font-bold text-ink2">{allyUsed ? '썼어요' : '도움 청하기'}</span></button>}
                </div>
                <p className="m-0 text-[10.5px] font-bold text-ink2">기력은 매 턴 {2 + (relics.includes('flow') ? 1 : 0)}씩 차요. 스킬이 안 되면 [공격]이나 [방어]로 모아요. 독+불은 폭발, 화상+얼음은 증기, 표식+여러 번 타격은 처형이에요. 지면 마나를 잃지 않고 깬 층까지만 받아요.</p>
              </>
            )}
            {stage === 'relic' && (
              <div className="space-y-1.5"><p className="m-0 text-[12.5px] font-black">{b.floor}층을 깼어! {drop}. 유물을 하나 골라요(이번 탐험 동안만 유효해요).</p>
                {relicChoices(day, b.floor, relics, build.cls).map((r) => <button key={r.id} onClick={() => pickRelic(r.id)} className="panel-flat min-h-12 w-full bg-[#fff6d8] px-2 py-1 text-left text-[13px] font-black">{r.name}<span className="block text-[11.5px] font-bold text-ink2">{r.desc}</span></button>)}</div>
            )}
            {stage === 'nodes' && (
              <div className="space-y-1.5"><p className="m-0 text-[12.5px] font-black">{b.floor}층을 깼어! {drop}. 숨을 고르고(체력 30%) 다음 길을 골라요.</p>
                <div className="flex gap-1.5">{nodesFor(day, b.floor).map((k) => <button key={k} onClick={() => goNode(k)} className="panel-flat min-h-[76px] flex-1 bg-[#ffe3ee] px-1.5 py-1 text-center text-[12px] font-black"><span className="mx-auto mb-0.5 flex h-7 w-7 items-center justify-center border-2 border-ink bg-white font-display text-[13px]">{NODE_INFO[k].icon}</span>{NODE_INFO[k].name}<span className="block text-[10.5px] font-bold text-ink2">{NODE_INFO[k].desc}</span></button>)}</div>
                <p className="m-0 text-[10.5px] font-bold text-ink2">깬 층 {cleared}층까지 경험치 {runXp}를 모았어요.</p></div>
            )}
          </div>
        </div>
      )}
      {stage === 'end' && (
        <div className="relative m-3 panel-flat space-y-2 bg-paper p-4"><p className="m-0 text-[14px] font-black" role="status">{res}</p>
          <p className="m-0 text-[12px] font-bold text-ink2">레벨 {levelOf(useGame.getState().dun.xp).lvl}{freePoints(levelOf(useGame.getState().dun.xp).lvl, useGame.getState().dun.ranks) > 0 ? `, 스킬 포인트 ${freePoints(levelOf(useGame.getState().dun.xp).lvl, useGame.getState().dun.ranks)}점이 남았어요(스킬 관리에서 써요)` : ''}</p>
          <div className="flex gap-2"><button onClick={() => { setStage('intro'); setB(null); }} className="panel-flat h-10 flex-1 text-[13px] font-black">한 번 더 들어가기</button><button onClick={close} className="panel-flat h-10 flex-1 text-[13px] font-black">마을로 돌아가기</button></div></div>
      )}
    </div>
  );
}
