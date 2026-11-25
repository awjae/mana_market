import { eventOf } from './events';
import { specialOf } from './special';
import { josa } from './josa';
import { hash } from './scene/hash';
import { ENERGY_MAX, ENERGY_REGEN, ENERGY_START, RELIC_EVERY, SKILL_BY_ID, defaultSlots, levelBonus, rankOf, relicChoices, skillsOf, type Cls } from './skills';

/** 던전(결정적 턴제): 주사위 없이, 몬스터가 매 턴 예고하는 행동을 읽고 [공격][방어][강타]를 고른다.
 *  같은 날은 모든 플레이어에게 같은 몬스터·같은 행동 순서다. 패배해도 잃는 것은 없고 도달한 층만큼 보상을 받는다. 난수 없음 */
export type Intent = 'attack' | 'heavy' | 'guard' | 'rest' | 'poison' | 'counter';
export type Action = 'attack' | 'defend' | 'skill' | 'potion';
/** 속성: 불·얼음·번개. 몬스터는 날마다(보스는 3턴마다) 약점 속성이 바뀌고, 약점이 아닌 속성 중 하나는 약하게 통한다. 같은 속성을 연달아 쓰면 무뎌진다 */
export type Element = 'fire' | 'ice' | 'bolt';
export const ELEMENTS: Element[] = ['fire', 'ice', 'bolt'];
export const ELEMENT_NAME: Record<Element, string> = { fire: '불', ice: '얼음', bolt: '번개' };
export const WEAK_MULT = 1.5, RESIST_MULT = 0.5, REPEAT_MULT = 0.6;
export const FLOORS = 20, SKILL_CD = 3, DIVE_PER_FLOOR_MANA = 4, BOSS_BONUS = 8;
export const maxFloorFor = (_gear?: number) => FLOORS; // 층 제한은 장비가 아니라 레벨·스킬·유물로 넘는다
export const isBossFloor = (f: number) => f % 5 === 0;
export const INTENT_TEXT: Record<Intent, string> = { attack: '공격하려고 해', heavy: '강한 일격을 준비하고 있어', guard: '몸을 웅크려 막고 있어', rest: '숨을 고르고 있어', poison: '독을 뿜으려고 해', counter: '반격 자세를 잡고 있어' };

export interface Stats { hp: number; atk: number; def: number }
/** 장비 단계 → 스탯(레벨 없음, 장비 구매가 곧 성장) */
export const playerStats = (gear: number): Stats => ({ hp: 30 + gear * 10, atk: 6 + Math.round(gear * 2.5), def: Math.round(gear * 1.3) });

/** 특수 행동: 독을 뿜는 몬스터(독버섯·거미), 반격하는 몬스터(돌 골렘·동굴의 왕·심연의 군주). 숨 고르기 자리가 이 행동으로 바뀐다 */
const POISONERS = [6, 8], COUNTERERS = [5, 10, 11];
export const POISON_TURNS = 3, POISON_DMG = 3, COUNTER_SHARE = 0.3;
const NAMES = ['슬라임', '동굴 박쥐', '고블린', '해골 병사', '굶주린 늑대', '돌 골렘', '독버섯 몬스터', '유령', '거대 거미', '불도마뱀'];
/** 몬스터 종류 → 일러스트 파일 id(`public/art/dungeon/{id}.webp`, 시트 순서와 같다) */
export const MONSTER_IDS = ['slime', 'bat', 'goblin', 'skeleton', 'wolf', 'golem', 'mushroom', 'ghost', 'spider', 'lizard', 'cavelord', 'abyss', 'festival', 'frostgiant', 'dragon'];
export const BOSS_KINDS = [10, 11, 13, 14];
export const MONSTER_NAMES = [...NAMES, '동굴의 왕', '심연의 군주', '축제 도깨비', '서리 거인', '종말의 용'];
export interface Monster extends Stats { name: string; kind: number; boss: boolean; pattern: Intent[]; /** 정예: 더 세고 재료·경험치가 두 배 */ elite?: boolean }
const PATTERNS: Intent[][] = [
  ['attack', 'attack', 'heavy', 'rest'], ['attack', 'guard', 'attack', 'heavy'], ['heavy', 'rest', 'attack', 'attack'],
  ['guard', 'attack', 'heavy', 'attack'], ['attack', 'heavy', 'guard', 'rest'], ['rest', 'attack', 'attack', 'heavy'],
];
/** 오늘의 던전 테마(날짜로 고정): 평범한 날·독안개의 날(숨 고르기 자리가 모두 독이 된다)·반격의 날(모두 반격 자세가 된다) */
export type Theme = 'plain' | 'poison' | 'counter';
export const THEME_NAME: Record<Theme, string> = { plain: '평범한 날', poison: '독안개의 날', counter: '반격의 날' };
export const themeOf = (day: number): Theme => (['plain', 'plain', 'poison', 'counter'] as Theme[])[Math.floor(hash(day, 0, 68) * 4)];
export const FESTIVAL_KIND = 12;
/** 오늘 floor층(1~FLOORS)의 몬스터. 5·10·15·20층은 보스(동굴의 왕·심연의 군주·서리 거인·종말의 용), 축제일 3층은 축제 도깨비 */
export function monsterFor(day: number, floor: number, elite = false): Monster {
  const m = baseMonster(day, floor);
  return elite && !m.boss ? { ...m, name: `정예 ${m.name}`, hp: Math.round(m.hp * 1.35), atk: Math.round(m.atk * 1.25 * 10) / 10, elite: true } : m;
}
function baseMonster(day: number, floor: number): Monster {
  const boss = isBossFloor(floor), fest = !boss && floor === 3 && !!eventOf(day);
  const kind = boss ? BOSS_KINDS[floor / 5 - 1] : fest ? FESTIVAL_KIND : Math.floor(hash(day, floor, 61) * 10);
  const pat = PATTERNS[Math.floor(hash(day, floor, 62) * PATTERNS.length)];
  const off = Math.floor(hash(day, floor, 63) * 4); // 같은 패턴도 시작 위치가 날마다 달라 매번 다시 읽어야 한다
  const BOSS: Intent[] = ['attack', 'heavy', 'guard', 'attack', 'heavy', 'rest'], boff = Math.floor(hash(day, floor, 64) * 6);
  const pattern = boss ? BOSS.map((_, i) => BOSS[(i + boff) % 6]) : pat.map((_, i) => pat[(i + off) % 4]);
  const th = themeOf(day);
  const special = POISONERS.includes(kind) ? 'poison' : COUNTERERS.includes(kind) ? 'counter' : th === 'poison' ? 'poison' : th === 'counter' ? 'counter' : null;
  const fixed = (p: Intent[]): Intent[] => p.map((x) => (x === 'rest' && special ? (special as Intent) : x));
  if (boss) {
    const B = [{ name: '동굴의 왕', hp: 72, atk: 10, def: 3 }, { name: '심연의 군주', hp: 125, atk: 15, def: 6 }, { name: '서리 거인', hp: 210, atk: 21, def: 8 }, { name: '종말의 용', hp: 280, atk: 26, def: 10 }][floor / 5 - 1];
    return { ...B, kind, boss, pattern: fixed(pattern) };
  }
  // 10층 아래는 층마다 한 단계씩, 그 아래(11층~)는 완만하게 강해진다
  const deep = Math.max(0, floor - 10), f = Math.min(floor, 10);
  return { name: fest ? MONSTER_NAMES[FESTIVAL_KIND] : NAMES[kind], kind, boss, hp: Math.round((15 + f * 5.5) * 1.3 + deep * 10), atk: 5 + f * 1.6 + deep * 0.8, def: Math.floor(f / 2) + Math.floor(deep / 2), pattern: fixed(pattern) };
}
/** 오늘 floor층 몬스터의 약점(보스는 3턴마다 한 칸씩 바뀐다)과 약하게 통하는 속성 */
export function weakness(day: number, floor: number, turn: number): { weak: Element; resist: Element } {
  const base = Math.floor(hash(day, floor, 65) * 3), w = (base + (isBossFloor(floor) ? Math.floor(turn / 3) : 0)) % 3;
  return { weak: ELEMENTS[w], resist: ELEMENTS[(w + 1) % 3] };
}
/** 속성 배율(약점 ×1.5, 약하게 통함 ×0.5, 같은 속성 연속 ×0.6) */
export function elementMult(e: Element, wk: { weak: Element; resist: Element }, last: Element | null, weakMult = WEAK_MULT) {
  return (e === wk.weak ? weakMult : e === wk.resist ? RESIST_MULT : 1) * (last === e ? REPEAT_MULT : 1);
}
export const intentAt = (m: Monster, turn: number): Intent => m.pattern[turn % m.pattern.length];

/** 플레이어 빌드: 장비 단계(마나로 사는 기본 스탯 바닥) + 레벨 + 클래스·스킬 랭크·장착 + 이번 탐험의 유물 */
/** 서약: 이번 탐험 한 번 동안만 지키는 제약. 대신 경험치를 더 받는다(마나 보상은 그대로) */
export type Oath = 'glass' | 'frugal';
export const OATHS: Record<Oath, { name: string; desc: string; xp: number }> = {
  glass: { name: '유리 검의 서약', desc: '주는 피해와 받는 피해가 모두 25% 늘어요. 경험치 +25%', xp: 1.25 },
  frugal: { name: '맨손의 서약', desc: '체력약과 약점 부적을 쓰지 않아요. 경험치 +30%', xp: 1.3 },
};
export interface Build { gear: number; lvl: number; cls: Cls; ranks: Record<string, number>; slots: string[]; relics: string[]; oath?: Oath | null }
/** 숙련: 주 계열 스킬 랭크 합 6·12·18마다 체력 +10·공격 +2·방어 +1(최대 3단계) */
export const masteryOf = (b: Build) => Math.min(3, Math.floor(skillsOf(b.cls).reduce((a, s) => a + (s.starter ? Math.max(1, b.ranks[s.id] ?? 0) : (b.ranks[s.id] ?? 0)), 0) / 6));
export const defaultBuild = (gear = 1, cls: Cls = 'warrior', lvl = 1): Build => ({ gear, lvl, cls, ranks: {}, slots: defaultSlots(cls), relics: [] });
export function statsOf(b: Build): Stats {
  const g = playerStats(b.gear), lv = levelBonus(b.lvl), r = b.relics;
  const m = masteryOf(b);
  return { hp: g.hp + lv.hp + m * 10 + (r.includes('heart') ? 20 : 0), atk: g.atk + lv.atk + m * 2 + (r.includes('blade') ? 3 : 0), def: g.def + lv.def + m + (r.includes('plate') ? 3 : 0) };
}
export type Act = { kind: 'attack' } | { kind: 'defend' } | { kind: 'potion' } | { kind: 'skill'; id: string };

export interface Battle {
  floor: number; elite: boolean; php: number; pmax: number; mhp: number; turn: number; log: string; over: null | 'win' | 'lose';
  /** 독: 내가 중독된 남은 턴(매 턴 체력 -3) */ poison: number; /** 약점 부적: 다음 공격이 약점으로 통한다 */ charm: boolean;
  /** 계열 자원(전사 기세·도적 콤보·연금술사 시약) */ res: number; lastSkill: string | null; /** 검객 자세(0~2) */ stance: number; /** 사냥꾼 덫 */ trap: 'snare' | 'poison' | null; /** 음유시인 음표·사령술사 하수인 남은 턴·시계공 되감기용 직전 공격 스킬 */ notes: string[]; minion: number; lastAtk: string | null; /** 몬스터 표식·화상 남은 턴 */ mark: number; burn: number; last: Element | null;
  /** 기력 */ en: number; /** 스킬별 남은 쿨다운 */ cds: Record<string, number>; /** 방벽 */ shield: number;
  /** 자기 강화(공격 배율, 남은 턴) */ buffMult: number; buffTurns: number; /** 몬스터가 약해진 남은 턴 */ slow: number; /** 몬스터가 중독된 남은 턴 */ mpoison: number; /** 기력 없이 쓸 수 있는 남은 스킬 수 */ free: number;
}
export const startFloor = (day: number, floor: number, php: number, pmax: number, elite = false, en = ENERGY_START): Battle => ({
  floor, elite, php, pmax, mhp: monsterFor(day, floor, elite).hp, turn: 0, log: '', over: null, poison: 0, charm: false, last: null,
  en, cds: {}, shield: 0, buffMult: 1, buffTurns: 0, slow: 0, mpoison: 0, free: 0, res: 0, lastSkill: null, stance: 0, trap: null, notes: [], minion: 0, lastAtk: null, mark: 0, burn: 0,
});
export const skillCost = (b: Build, id: string) => Math.max(1, (SKILL_BY_ID[id]?.cost ?? 0) - (b.relics.includes('scroll') ? 1 : 0));
export const canUse = (bt: Battle, b: Build, id: string) => rankOf(b.ranks, id) >= 1 && (bt.cds[id] ?? 0) === 0 && (bt.free > 0 || bt.en >= skillCost(b, id));
const rankMult = (b: Build, id: string) => 1 + 0.2 * (rankOf(b.ranks, id) - 1);

/** 몬스터 예고가 요구하는 자세(검객): 강한 일격=상단(0), 공격=중단(1), 독·반격=하단(2), 나머지는 없음 */
export const STANCE_NAME = ['상단', '중단', '하단'];
export const stanceFor = (it: Intent): number => (it === 'heavy' ? 0 : it === 'attack' ? 1 : it === 'poison' || it === 'counter' ? 2 : -1);

/** 한 턴: 플레이어 행동 → 몬스터(예고한 행동). 순수 함수 */
export function turn(bt: Battle, act: Act, day: number, build: Build): Battle {
  if (bt.over) return bt;
  const st = statsOf(build), m = monsterFor(day, bt.floor, bt.elite), it = intentAt(m, bt.turn), wk = weakness(day, bt.floor, bt.turn), R = (id: string) => build.relics.includes(id);
  let { mhp, php, poison, charm, last, en, shield, slow, mpoison, free, buffMult, buffTurns, res, stance, trap, mark, burn, notes, minion, lastAtk } = bt;
  const flood = Math.floor(bt.turn / 2) % 2 === 0, SPENDERS: Cls[] = ['alchemist', 'clockwork', 'necro', 'smith', 'priest'];
  let lastSkill: string | null = bt.lastSkill;
  const cds: Record<string, number> = {}; for (const [k, v] of Object.entries(bt.cds)) if (v > 1) cds[k] = v - 1;
  const logs: string[] = [];
  const passive = it === 'rest' || it === 'guard' || it === 'poison' || it === 'counter';
  const stanceMatch = stance === stanceFor(it) && stanceFor(it) >= 0;
  let guardMult = 1, reflect = R('thorn') ? 0.3 : 0, dodge = false, dealtTotal = 0, drain = 0, defended = false, reacted = '';
  let a: Act = act;
  if (a.kind === 'skill' && !canUse(bt, build, a.id)) { logs.push('스킬을 쓸 수 없어 기본 공격으로'); a = { kind: 'attack' }; }
  const skillOf = a.kind === 'skill' ? SKILL_BY_ID[a.id] : null, isMain = !!skillOf && skillOf.cls === build.cls;
  const hit = (mult: number, elem: Element | 'weak' | null, pierce: boolean, hits: number, vital: number) => {
    const e: Element | null = elem === 'weak' ? wk.weak : elem;
    // 시너지(상태 반응): 최대 ×1.4
    let react = 1;
    if (e === 'fire' && mpoison > 0) { const x = mpoison * 5 + build.lvl; mhp = Math.max(0, mhp - x); dealtTotal += x; mpoison = 0; reacted = `독 폭발 ${x}!`; }
    if (e === 'ice' && burn > 0) { burn = 0; slow = Math.max(slow, 2); react = 1.2; reacted = '증기!'; }
    if (e === 'bolt' && mpoison > 0) { mpoison += 2; reacted = '감전 독!'; }
    if (hits > 1 && mark > 0) { react = Math.max(react, 1.4); mark = 0; reacted = '처형!'; }
    for (let i = 0; i < hits && mhp > 0; i++) {
      const weakMult = (R('lens') ? 1.8 : WEAK_MULT) + (isMain && build.cls === 'mage' ? (R('prism') ? 0.3 : 0.1) : 0);
      let em = e ? elementMult(e, wk, isMain && build.cls === 'mage' ? null : last, weakMult) : 1;
      if (e) { em *= (e === 'fire' && R('flame')) || (e === 'ice' && R('frost')) || (e === 'bolt' && R('spark')) ? 1.3 : 1; last = e; }
      if (charm && e) em = Math.max(em, R('lens') ? 1.8 : WEAK_MULT);
      let main = 1;
      if (isMain && build.cls === 'warrior') main = 1 + 0.12 * res;
      if (isMain && build.cls === 'rogue') main = 1 + (R('shadow') ? 0.12 : 0.08) * res;
      if (isMain && build.cls === 'hunter') main = R('quiver') ? 1.35 : 1.2; // 사냥꾼: 주 계열 사격은 늘 정확하다
      if (isMain && build.cls === 'swordsman' && stanceMatch) main = 1.35;
      if (isMain && SPENDERS.includes(build.cls) && skillOf?.fx.spend) main = (1 + (skillOf.fx.perReagent ?? 0) * res) * (R('sage') ? 1.3 : 1);
      if (isMain && build.cls === 'priest') main *= 1 + 0.16 * res;
      if (isMain && build.cls === 'navigator' && skillOf?.fx.tide === 'flood' && flood) main = skillOf.id === 'v_tsunami' ? 2.5 : 1.3;
      if (skillOf?.id === 'n_bonestorm' && minion > 0) main *= 1.25;
      let d = Math.floor(Math.max(1, st.atk * (buffTurns > 0 ? buffMult : 1) * mult * main * (build.oath === 'glass' ? 1.25 : 1) - (pierce ? 0 : m.def)) * em * react);
      if (mark > 0 && hits === 1) d = Math.floor(d * 1.25);
      if (R('edge') && bt.turn === 0 && i === 0) d = Math.floor(d * 1.5);
      if (vital > 1 && passive) d = Math.floor(d * vital);
      if (it === 'guard') d = Math.floor(d / 2);
      d = Math.max(1, d); mhp = Math.max(0, mhp - d); dealtTotal += d;
    }
    charm = false;
  };
  if (a.kind === 'attack') {
    hit(1, null, false, 1, 1); en = Math.min(ENERGY_MAX, en + 1); logs.push(`공격! ${m.name}에게 ${dealtTotal}`);
  } else if (a.kind === 'defend') {
    guardMult = 1 / 3; defended = true; en = Math.min(ENERGY_MAX, en + 1); logs.push('자세를 낮춰 막았어');
  } else if (a.kind === 'potion') {
    php = Math.min(bt.pmax, php + Math.ceil(bt.pmax * POTION_HEAL)); logs.push(`체력약을 마셨어 (+${php - bt.php})`);
  } else {
    const sk = SKILL_BY_ID[a.id], fx = sk.fx, rm = rankMult(build, sk.id);
    if (free > 0) free--; else en -= skillCost(build, sk.id);
    if (sk.cd > 0) cds[sk.id] = sk.cd;
    if (fx.dmg) { hit(fx.dmg * rm, fx.elem ?? null, !!fx.pierce, fx.hits ?? 1, fx.vital ?? 1); logs.push(`${sk.name}! ${m.name}에게 ${dealtTotal}${fx.elem && fx.elem !== 'weak' && elementMult(fx.elem, wk, bt.last) > 1 ? ' (약점!)' : ''}${reacted ? ` ${reacted}` : ''}`); }
    if (fx.rewind) { const ls = lastAtk ? SKILL_BY_ID[lastAtk] : null; if (ls?.fx.dmg) { hit(ls.fx.dmg * rankMult(build, ls.id), ls.fx.elem ?? null, !!ls.fx.pierce, ls.fx.hits ?? 1, ls.fx.vital ?? 1); logs.push(`되감기! ${ls.name}을(를) 한 번 더, ${dealtTotal}`); } else logs.push('되감을 공격이 없어'); }
    if (fx.dmg && !fx.rewind) lastAtk = sk.id;
    if (fx.energy) { en = Math.min(ENERGY_MAX, en + fx.energy + (sk.id === 'v_route' && isMain && !flood ? 1 : 0)); logs.push('기력이 돌아왔어'); }
    if (sk.id === 'p_cleanse') { poison = 0; logs.push('독을 씻어 냈어'); }
    if (fx.minion) { if (isMain && build.cls === 'necro' && res >= 2) { minion = fx.minion + (R('lich') ? 2 : 0); res -= 2; logs.push('해골 하수인을 불렀어'); } else { minion = 3; logs.push('해골이 잠깐 나타났어'); } }
    if (fx.note && isMain) {
      notes = [...notes, fx.note].slice(-3); const song = notes.join('');
      if (song === 'ABC') { const x = Math.floor(st.atk * 0.4); mhp = Math.max(0, mhp - x); dealtTotal += x; php = Math.min(bt.pmax, php + Math.ceil(bt.pmax * 0.1)); notes = []; logs.push(`행진곡! 추가 ${x}`); }
      else if (song === 'CBA') { slow = 2; shield += Math.ceil(bt.pmax * 0.15); notes = []; logs.push('자장가! 몬스터가 약해지고 방벽이 생겨'); }
    } else if (isMain && build.cls === 'bard' && sk.id === 'b_discord') notes = [];
    if (fx.drain) drain = fx.drain;
    if (fx.mpoison) { mpoison = fx.mpoison; logs.push(`${m.name}이(가) 중독됐어`); }
    if (fx.burn) { burn = fx.burn; logs.push(`${m.name}이(가) 불타고 있어`); }
    if (fx.mark) { mark = fx.mark; logs.push(`${m.name}에게 표식을 남겼어`); }
    if (fx.trap) { trap = fx.trap; logs.push(fx.trap === 'snare' ? '올가미를 깔았어' : '독 덫을 깔았어'); }
    if (fx.stance && isMain) { const need = stanceFor(it); if (need >= 0) { stance = need; logs.push(`자세를 ${STANCE_NAME[need]}으로 맞췄어`); } else logs.push('맞출 자세가 없어'); }
    if (fx.slow) { slow = fx.slow; logs.push(`${m.name}의 공격이 약해졌어`); }
    if (fx.guard) { const g0 = sk.id === 'v_anchor' && isMain && !flood ? 0.35 : fx.guard; guardMult = Math.min(guardMult, g0 / (1 + 0.1 * (rankOf(build.ranks, sk.id) - 1))); logs.push(`${sk.name}`); }
    if (fx.reflect) reflect += fx.reflect;
    if (fx.heal) { const per = fx.spend && isMain && build.cls === 'alchemist' ? (fx.perReagent ?? 0) * res : 0; php = Math.min(bt.pmax, php + Math.ceil(bt.pmax * (fx.heal + per) * rm)); logs.push(`체력 회복 (+${php - bt.php})`); }
    if (fx.shield) { shield += Math.ceil(bt.pmax * fx.shield * rm); logs.push(`방벽 ${shield}`); }
    if (fx.buff) { buffMult = fx.buff.atk; buffTurns = fx.buff.turns + 1; logs.push('힘이 솟아올라'); }
    if (fx.dodge) dodge = true;
    if (fx.free) { free = fx.free; logs.push('다음 스킬 둘이 공짜야'); }
    // 계열 자원(주 계열 스킬만)
    if (isMain && build.cls === 'alchemist') res = fx.spend ? 0 : Math.min(3, res + (fx.reagent ?? 1));
    if (isMain && build.cls === 'clockwork') res = fx.spend ? 0 : Math.min(4, res + (fx.reagent ?? 1));
    if (isMain && build.cls === 'necro' && sk.id !== 'n_skeleton') res = fx.spend ? 0 : Math.min(5, res + 1);
    if (isMain && build.cls === 'priest') res = fx.spend ? 0 : Math.min(4, res + 1);
    if (isMain && build.cls === 'smith') res = fx.spend ? 0 : Math.min(5, res + (fx.heat ?? 0));
    if (isMain && build.cls === 'warrior' && (sk.id === 'w_bash' || sk.id === 'w_cleave')) res = 0;
    if (isMain && build.cls === 'rogue') res = lastSkill && lastSkill !== sk.id ? Math.min(5, res + 1) : 1;
    lastSkill = sk.id;
  }
  if (a.kind === 'defend') { if (build.cls === 'rogue') res = 0; lastSkill = null; }
  if (a.kind === 'attack' && build.cls === 'rogue') res = 0;
  if (minion > 0 && mhp > 0) { const x = Math.max(1, Math.floor(st.atk * 0.8)); mhp = Math.max(0, mhp - x); logs.push(`하수인이 ${x}`); minion--; }
  if (drain > 0 && dealtTotal > 0) { const h = Math.ceil(dealtTotal * drain); php = Math.min(bt.pmax, php + h); logs.push(`체력 +${h}`); }
  if (R('vamp') && dealtTotal > 0) php = Math.min(bt.pmax, php + Math.ceil(dealtTotal * 0.15));
  let hurtBy = 0, newPoison = false, tookHit = false;
  if (mhp > 0 && it === 'counter' && dealtTotal > 0) hurtBy = Math.max(1, Math.floor(dealtTotal * COUNTER_SHARE));
  if (mhp > 0 && (it === 'attack' || it === 'heavy')) {
    let dmg = Math.max(1, Math.round((it === 'heavy' ? m.atk * 2 : m.atk) * (slow > 0 ? 0.7 : 1) - st.def));
    if (trap === 'snare') { dmg = Math.max(1, Math.floor(dmg / 2)); trap = null; logs.push('올가미가 발동했어'); }
    else if (trap === 'poison') { mpoison = 3; trap = null; logs.push('독 덫이 발동했어'); }
    if (build.cls === 'swordsman' && stanceMatch) { dmg = Math.max(1, Math.floor(dmg * (R('oath_blade') ? 0.5 : 0.7))); logs.push('자세가 맞아 덜 맞았어'); }
    dmg = Math.max(1, Math.floor(dmg * guardMult * (build.oath === 'glass' ? 1.25 : 1)));
    if (dodge) { dmg = 0; logs.push(`${m.name}의 공격을 피했어`); }
    else {
      const raw = dmg, absorbed = Math.min(shield, dmg); shield -= absorbed; dmg -= absorbed; tookHit = dmg > 0;
      php = Math.max(0, php - dmg); logs.push(`${m.name}의 ${it === 'heavy' ? '강한 일격' : '공격'}으로 ${dmg}${absorbed ? ` (방벽 ${absorbed})` : ''}`);
      if (reflect > 0) { const r = Math.max(1, Math.floor(raw * reflect)); mhp = Math.max(0, mhp - r); logs.push(`돌려주기 ${r}`); }
    }
  } else if (mhp > 0 && it === 'poison') { if (defended || dodge || guardMult <= 0.4) logs.push('독을 막아 냈어'); else { poison = POISON_TURNS; newPoison = true; logs.push(`${m.name}의 독에 중독됐어`); } }
  else if (mhp > 0) logs.push(`${josa(m.name, '은는')} ${INTENT_TEXT[it]}`);
  if (hurtBy > 0 && mhp > 0) { php = Math.max(0, php - hurtBy); logs.push(`반격으로 ${hurtBy}`); tookHit = true; }
  if (bt.poison > 0) { php = Math.max(0, php - POISON_DMG); logs.push(`독으로 ${POISON_DMG}`); if (!newPoison) poison = bt.poison - 1; }
  if (mhp > 0 && bt.mpoison > 0) { const d = 4 + Math.floor(build.lvl / 3); mhp = Math.max(0, mhp - d); logs.push(`${m.name}이(가) 독으로 ${d}`); mpoison = Math.max(mpoison, 0); if (mpoison === bt.mpoison) mpoison = bt.mpoison - 1; }
  if (mhp > 0 && bt.burn > 0) { const d = 3 + Math.floor(build.lvl / 4); mhp = Math.max(0, mhp - d); logs.push(`${m.name}이(가) 불타서 ${d}`); if (burn === bt.burn) burn = bt.burn - 1; }
  if (build.cls === 'warrior' && tookHit) res = Math.min(5, res + (R('banner') ? 2 : 1));
  if (build.cls === 'smith' && (tookHit || defended || guardMult < 1)) res = Math.min(5, res + (R('anvil') ? 2 : 1));
  en = Math.min(ENERGY_MAX, en + ENERGY_REGEN + (R('flow') ? 1 : 0));
  return { ...bt, poison, charm, last, mhp, php, turn: bt.turn + 1, log: logs.join(' / '), over: mhp <= 0 ? 'win' : php <= 0 ? 'lose' : null, en, cds, shield, slow: Math.max(0, slow - 1), mpoison, free, buffMult, buffTurns: Math.max(0, buffTurns - 1), res, lastSkill, stance: (stance + 1) % 3, trap, notes, minion, lastAtk, mark: Math.max(0, mark - 1), burn };
}
/** 층 사이 회복: 최대 체력의 30% */
export const healBetween = (php: number, pmax: number) => Math.min(pmax, php + Math.ceil(pmax * 0.3));

/** 한 번의 탐험 결과로 받는 마나: 깬 층 ×4 + 쓰러뜨린 보스마다 +8(하루 상한 40이 따로 있다) */
export const rewardFor = (cleared: number, bosses: number) => cleared * DIVE_PER_FLOOR_MANA + bosses * BOSS_BONUS;
/** 몬스터를 쓰러뜨려 얻는 경험치: 6 + 층×2, 보스 ×3, 정예 ×2 */
export const xpForKill = (floor: number, boss: boolean, elite: boolean) => (6 + floor * 2) * (boss ? 3 : 1) * (elite ? 2 : 1);

/** 풀이 정책(시험·균형용): 예고를 읽고 방어할 때는 방어하고, 아니면 가장 센 스킬을 쓴다 */
export function bestAct(bt: Battle, day: number, build: Build): Act {
  const m = monsterFor(day, bt.floor, bt.elite), it = intentAt(m, bt.turn);
  if (it === 'poison' || it === 'counter') return { kind: 'defend' };
  if (it === 'heavy' && bt.php <= bt.pmax * 0.8 && !(build.cls === 'swordsman' && bt.stance === stanceFor(it))) return { kind: 'defend' };
  if (it === 'guard') return { kind: 'defend' };
  const wk = weakness(day, bt.floor, bt.turn), mainBonus = build.cls === 'warrior' ? 1 + 0.12 * bt.res : build.cls === 'rogue' ? 1 + 0.08 * bt.res : build.cls === 'hunter' ? 1.2 : 1;
  const score = (id: string) => {
    const sk = SKILL_BY_ID[id], fx = sk.fx, main = sk.cls === build.cls, e = fx.elem === 'weak' ? wk.weak : fx.elem;
    if (fx.dmg) {
      const spendMult = (fx.spend && main && ['alchemist', 'clockwork', 'necro', 'smith', 'priest'].includes(build.cls) ? 1 + (fx.perReagent ?? 0) * bt.res : 1) * (main && build.cls === 'priest' ? 1 + 0.16 * bt.res : 1) * (main && build.cls === 'navigator' && fx.tide === 'flood' && Math.floor(bt.turn / 2) % 2 === 0 ? (id === 'v_tsunami' ? 2.5 : 1.3) : 1), stanceMult = main && build.cls === 'swordsman' && bt.stance === stanceFor(it) ? 1.35 : 1;
      return fx.dmg * (fx.hits ?? 1) * (e ? elementMult(e, wk, bt.last) : 1) * (fx.vital && it === 'rest' ? fx.vital : 1) * rankMult(build, id) * (main ? mainBonus : 1) * spendMult * stanceMult * (fx.hits && fx.hits > 1 && bt.mark > 0 ? 1.4 : 1) * (e === 'fire' && bt.mpoison > 0 ? 1.5 : 1);
    }
    if (fx.mark) return bt.mark === 0 ? 1.5 : -1;
    if (fx.trap) return !bt.trap && (it === 'attack' || it === 'heavy') ? 1.6 : -1;
    if (fx.stance) return main && stanceFor(it) >= 0 && bt.stance !== stanceFor(it) ? 1.7 : -1;
    if (fx.reagent) return main && bt.res < 2 ? 1.3 : -1;
    if (fx.minion) return bt.minion === 0 ? 3 : -1;
    if (fx.rewind) return bt.lastAtk ? (SKILL_BY_ID[bt.lastAtk].fx.dmg ?? 0) * 0.9 : -1;
    if (fx.energy) return bt.en <= 3 ? 1.2 : -1;
    if (fx.shield) return bt.php < bt.pmax * 0.6 ? 1.1 : -1;
    if (fx.slow) return it === 'heavy' ? 1.7 : -1;
    if (fx.mpoison) return bt.mpoison === 0 ? 1.4 : -1;
    if (fx.heal) return bt.php < bt.pmax * 0.5 ? 1.8 : -1;
    if (fx.guard) return it === 'heavy' ? 2 : -1;
    if (fx.buff) return bt.buffTurns === 0 ? 1.6 : -1;
    return -1;
  };
  const ranked = build.slots.filter((id) => canUse(bt, build, id)).sort((x, y) => score(y) - score(x));
  return ranked.length && score(ranked[0]) > 0 ? { kind: 'skill', id: ranked[0] } : { kind: 'attack' };
}
/** 정책대로 끝까지 해 본 결과(시험·균형용): 유물은 첫 후보를, 지도는 체력이 모자라면 휴식을 고른다 */
export function autoRun(day: number, build0: Build, pick: (bt: Battle, build: Build) => Act = (bt, build) => bestAct(bt, day, build)) {
  const build: Build = { ...build0, relics: [] };
  let pmax = statsOf(build).hp, php = pmax, cleared = 0, bosses = 0, xp = 0, elite = false;
  for (let f = 1; f <= FLOORS; f++) {
    let bt = startFloor(day, f, php, pmax, elite);
    for (let i = 0; i < 80 && !bt.over; i++) bt = turn(bt, pick(bt, build), day, build);
    if (bt.over !== 'win') break;
    const boss = isBossFloor(f); xp += xpForKill(f, boss, elite);
    cleared = f; if (boss) bosses++;
    php = healBetween(bt.php, pmax);
    if (f % RELIC_EVERY === 0) { const c = relicChoices(day, f, build.relics)[0]; if (c) { build.relics.push(c.id); const np = statsOf(build).hp; php += np - pmax; pmax = np; } }
    const node = nodesFor(day, f).find((n) => n === 'rest' && php < pmax * 0.75) ?? 'fight'; const ap = applyNode(node, php, pmax, day, f); php = ap.php; elite = ap.elite;
  }
  return { cleared, bosses, xp };
}

/** ── 고정 드롭·소모품·제작·방(확률 없음, 날짜 시드) ── */
export const POTION_HEAL = 0.4, ITEM_LIMIT = 3;
export const LOOT: { id: string; name: string }[] = [
  { id: 'jelly', name: '슬라임 젤리' }, { id: 'wing', name: '박쥐 날개' }, { id: 'cloth', name: '고블린 천조각' }, { id: 'bone', name: '뼛조각' },
  { id: 'fang', name: '늑대 송곳니' }, { id: 'ore', name: '골렘 광석' }, { id: 'spore', name: '독버섯 포자' }, { id: 'ecto', name: '유령 안개' },
  { id: 'silk', name: '거미줄' }, { id: 'scale', name: '불꽃 비늘' }, { id: 'crown', name: '왕의 관 조각' }, { id: 'core', name: '심연의 핵' },
  { id: 'mask', name: '축제 가면' }, { id: 'frost', name: '서리 핵' }, { id: 'dragon', name: '용 비늘' },
];
/** 몬스터 종류(0~14)를 쓰러뜨리면 확정으로 얻는 재료 */
export const lootOf = (kind: number) => LOOT[kind]?.id ?? 'jelly';
export const lootName = (id: string) => LOOT.find((l) => l.id === id)?.name ?? id;
export type ItemId = 'potion' | 'charm';
export const ITEMS: Record<ItemId, { name: string; desc: string; cost: Record<string, number> }> = {
  potion: { name: '체력약', desc: '던전에서 마시면 체력이 40% 돌아와요(한 턴을 써요)', cost: { jelly: 2 } },
  charm: { name: '약점 부적', desc: '던전에서 쓰면 다음 공격이 약점으로 통해요(턴을 쓰지 않아요)', cost: { wing: 1, cloth: 1 } },
};
/** 던전 재료로 만드는 꾸미기 소품(소품 번호 → 재료). 마나로 살 수 없다 */
export const CRAFT_D: Record<number, Record<string, number>> = { 20: { jelly: 3 }, 21: { bone: 3, fang: 1 }, 22: { crown: 1, ore: 2 }, 23: { core: 1, fang: 2 }, 30: { frost: 1, ore: 2 }, 31: { dragon: 1, fang: 2 }, 32: { mask: 2 } };

/** 층 사이의 지도 노드: 다음 층으로 가는 길을 3개 중 하나 고른다(날짜·층으로 고정). 전투·정예(더 세지만 재료·경험치 두 배)·휴식·상인·보물·함정 */
export type NodeKind = 'fight' | 'elite' | 'rest' | 'shop' | 'treasure' | 'trap';
export const NODE_INFO: Record<NodeKind, { name: string; desc: string; icon: string }> = {
  fight: { name: '평범한 길', desc: '그대로 다음 층으로', icon: '길' },
  elite: { name: '정예의 길', desc: '다음 층 몬스터가 더 세지만 재료와 경험치가 두 배', icon: '정' },
  rest: { name: '휴식처', desc: '체력이 25% 돌아와요', icon: '쉼' },
  shop: { name: '떠돌이 상인', desc: '체력약 1개를 받아요', icon: '상' },
  treasure: { name: '보물 방', desc: '재료 2개를 얻어요', icon: '보' },
  trap: { name: '함정 길', desc: '체력이 15% 줄지만 재료 3개를 얻어요', icon: '함' },
};
const EXTRA: NodeKind[] = ['rest', 'shop', 'treasure', 'trap', 'elite'];
export function nodesFor(day: number, floor: number): NodeKind[] {
  const pool = EXTRA.filter((k) => !(k === 'elite' && isBossFloor(floor + 1))).sort((a, b) => hash(day, floor * 7 + EXTRA.indexOf(a), 66) - hash(day, floor * 7 + EXTRA.indexOf(b), 66));
  const out: NodeKind[] = ['fight', pool[0], pool[1]];
  if (specialOf(day).id === 'merchant' && !out.includes('shop')) out[2] = 'shop'; // 떠돌이 상인의 날: 상인이 항상 있다
  return out;
}
/** 노드의 효과: 체력 변화, 얻는 재료·소모품, 다음 층이 정예인지(재료 종류는 이 층 몬스터의 드롭을 따른다) */
export function applyNode(kind: NodeKind, php: number, pmax: number, day: number, floor: number): { php: number; mats: Record<string, number>; potion: number; elite: boolean } {
  const drop = lootOf(monsterFor(day, floor).kind);
  if (kind === 'rest') return { php: Math.min(pmax, php + Math.ceil(pmax * 0.25)), mats: {}, potion: 0, elite: false };
  if (kind === 'treasure') return { php, mats: { [drop]: 2 }, potion: 0, elite: false };
  if (kind === 'trap') return { php: Math.max(1, php - Math.ceil(pmax * 0.15)), mats: { [drop]: 3 }, potion: 0, elite: false };
  if (kind === 'shop') return { php, mats: {}, potion: 1, elite: false };
  return { php, mats: {}, potion: 0, elite: kind === 'elite' };
}

/** 히로인의 던전 지원(한 번 들어갈 때 1회): 호감 이야기를 끝까지 들은 히로인이 도와준다. 효과는 작고 모두 던전 안에서만 쓴다 */
export type SupportKind = 'heal' | 'rush' | 'weak';
export const SUPPORT: Record<string, { kind: SupportKind; text: string }> = {
  lisel: { kind: 'heal', text: '체력이 35% 돌아와요' }, kaira: { kind: 'rush', text: '스킬 쿨다운이 풀리고 기력이 4 차요' }, mira: { kind: 'weak', text: '다음 공격이 약점으로 통해요' },
  sera: { kind: 'heal', text: '체력이 35% 돌아와요' }, noa: { kind: 'weak', text: '다음 공격이 약점으로 통해요' },
};
export function applySupport(b: Battle, id: string): Battle {
  const k = SUPPORT[id]?.kind;
  if (k === 'heal') return { ...b, php: Math.min(b.pmax, b.php + Math.ceil(b.pmax * 0.35)) };
  if (k === 'rush') return { ...b, cds: {}, en: Math.min(ENERGY_MAX, b.en + 4) };
  if (k === 'weak') return { ...b, charm: true };
  return b;
}
