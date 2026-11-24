import { eventOf } from './events';
import { josa } from './josa';
import { hash } from './scene/hash';

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
/** 장비 단계 → 내려갈 수 있는 최대 층 */
export const GEAR_FLOORS = [0, 5, 7, 9, 10, 15, 20];
export const maxFloorFor = (gear: number) => GEAR_FLOORS[gear] ?? 5;
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
export interface Monster extends Stats { name: string; kind: number; boss: boolean; pattern: Intent[] }
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
export function monsterFor(day: number, floor: number): Monster {
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
export function elementMult(e: Element, wk: { weak: Element; resist: Element }, last: Element | null) {
  return (e === wk.weak ? WEAK_MULT : e === wk.resist ? RESIST_MULT : 1) * (last === e ? REPEAT_MULT : 1);
}
export const intentAt = (m: Monster, turn: number): Intent => m.pattern[turn % m.pattern.length];

export interface Battle { /** 독: 남은 턴(매 턴 체력 -3) */ poison: number; /** 약점 부적: 다음 공격이 약점으로 통한다 */ charm: boolean; last: Element | null; floor: number; php: number; pmax: number; mhp: number; turn: number; cd: number; log: string; over: null | 'win' | 'lose' }
export const startFloor = (day: number, floor: number, php: number, pmax: number): Battle => ({ floor, php, pmax, mhp: monsterFor(day, floor).hp, poison: 0, charm: false, last: null, turn: 0, cd: 0, log: '', over: null });

/** 한 턴: 플레이어 행동 → 몬스터(예고한 행동). 순수 함수 */
export function turn(b: Battle, a: Action, day: number, gear: number, elem: Element = 'fire'): Battle {
  if (b.over) return b;
  const p = playerStats(gear), m = monsterFor(day, b.floor), it = intentAt(m, b.turn);
  let mhp = b.mhp, php = b.php, cd = Math.max(0, b.cd - 1), last = b.last, charm = b.charm, poison = b.poison, hurtBy = 0, newPoison = false;
  const logs: string[] = [];
  if (a === 'skill' && b.cd > 0) a = 'attack';
  if (a === 'attack' || a === 'skill') {
    const mult = Math.max(elementMult(elem, weakness(day, b.floor, b.turn), b.last), b.charm ? WEAK_MULT : 0), raw = Math.floor((a === 'skill' ? p.atk * 2 - m.def : p.atk - m.def) * mult), dmg = Math.max(1, it === 'guard' ? Math.floor(raw / 2) : raw);
    mhp = Math.max(0, mhp - dmg); last = elem; charm = false; if (it === 'counter') hurtBy = Math.max(1, Math.floor(dmg * COUNTER_SHARE)); logs.push(`${ELEMENT_NAME[elem]} ${a === 'skill' ? '강타!' : '공격!'} ${m.name}에게 ${dmg}${mult > 1 ? ' (약점!)' : mult < 1 && mult >= 0.5 && b.last !== elem ? ' (약하게 통해)' : b.last === elem ? ' (무뎌졌어)' : ''}`);
    if (a === 'skill') cd = SKILL_CD;
  } else if (a === 'potion') { php = Math.min(b.pmax, php + Math.ceil(b.pmax * POTION_HEAL)); logs.push(`체력약을 마셨어 (+${php - b.php})`); }
  else logs.push('자세를 낮춰 막았어');
  if (mhp > 0 && (it === 'attack' || it === 'heavy')) {
    let dmg = Math.max(1, Math.round((it === 'heavy' ? m.atk * 2 : m.atk) - p.def));
    if (a === 'defend') dmg = Math.max(1, Math.floor(dmg / 3));
    php = Math.max(0, php - dmg); logs.push(`${m.name}의 ${it === 'heavy' ? '강한 일격' : '공격'}으로 ${dmg}`);
  } else if (mhp > 0 && it === 'poison') { if (a === 'defend') logs.push('독을 막아 냈어'); else { poison = POISON_TURNS; newPoison = true; logs.push(`${m.name}의 독에 중독됐어`); } }
  else if (mhp > 0) logs.push(`${josa(m.name, '은는')} ${INTENT_TEXT[it]}`);
  if (hurtBy > 0 && mhp > 0) { php = Math.max(0, php - hurtBy); logs.push(`반격으로 ${hurtBy}`); }
  if (b.poison > 0) { php = Math.max(0, php - POISON_DMG); logs.push(`독으로 ${POISON_DMG}`); if (!newPoison) poison = b.poison - 1; } // 이번 턴에 새로 중독되면 3턴이 다시 시작된다
  return { ...b, poison, charm, last, mhp, php, turn: b.turn + 1, cd, log: logs.join(' / '), over: mhp <= 0 ? 'win' : php <= 0 ? 'lose' : null };
}
/** 층 사이 회복: 최대 체력의 30% */
export const healBetween = (php: number, pmax: number) => Math.min(pmax, php + Math.ceil(pmax * 0.3));

/** 한 번의 탐험 결과로 받는 마나: 깬 층 ×4 + 쓰러뜨린 보스마다 +8(하루 상한 40이 따로 있다) */
export const rewardFor = (cleared: number, bosses: number) => cleared * DIVE_PER_FLOOR_MANA + bosses * BOSS_BONUS;

/** 풀이 정책(시험용): 예고를 읽고 행동을, 약점을 읽고 속성을 고른다 */
export function bestAction(b: Battle, day: number): { action: Action; elem: Element } {
  const it = intentAt(monsterFor(day, b.floor), b.turn), wk = weakness(day, b.floor, b.turn);
  const elem = [...ELEMENTS].sort((x, y) => elementMult(y, wk, b.last) - elementMult(x, wk, b.last))[0];
  if (it === 'heavy' && b.php <= b.pmax * 0.8) return { action: 'defend', elem };
  if (it === 'poison' || it === 'counter') return { action: 'defend', elem }; // 독은 막고, 반격 자세엔 때리지 않는다
  if (it !== 'guard' && b.cd === 0) return { action: 'skill', elem };
  return { action: it === 'guard' ? 'defend' : 'attack', elem };
}
/** 정책대로 끝까지 해 본 결과(시험·균형용) */
export function autoRun(day: number, gear: number, pick: (b: Battle) => { action: Action; elem: Element } = (b) => bestAction(b, day)) {
  const p = playerStats(gear); let php = p.hp, cleared = 0, bosses = 0;
  const top = maxFloorFor(gear);
  for (let f = 1; f <= top; f++) {
    let b = startFloor(day, f, php, p.hp);
    for (let i = 0; i < 80 && !b.over; i++) { const c = pick(b); b = turn(b, c.action, day, gear, c.elem); }
    if (b.over !== 'win') break;
    cleared = f; php = healBetween(b.php, p.hp); if (isBossFloor(f)) bosses++;
    if (roomsFor(day, f).includes('rest')) php = Math.min(p.hp, php + Math.ceil(p.hp * 0.25)); // 풀이 정책: 휴식 방이 있으면 고른다
  }
  return { cleared, bosses };
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

export type RoomKind = 'rest' | 'treasure' | 'trap' | 'shop';
export const ROOM_INFO: Record<RoomKind, { name: string; desc: string }> = {
  rest: { name: '휴식 방', desc: '체력이 25% 돌아와요' },
  treasure: { name: '보물 방', desc: '재료 2개를 얻어요' },
  trap: { name: '함정 방', desc: '체력이 15% 줄지만 재료 3개를 얻어요' },
  shop: { name: '떠돌이 상인의 방', desc: '체력약 1개를 받아요' },
};
const ROOMS: RoomKind[] = ['rest', 'treasure', 'trap', 'shop'];
/** floor층을 깬 뒤 고르는 방 두 개(날짜로 고정, 서로 다르다) */
export function roomsFor(day: number, floor: number): [RoomKind, RoomKind] {
  const a = Math.floor(hash(day, floor, 66) * 4), off = 1 + Math.floor(hash(day, floor, 67) * 3);
  return [ROOMS[a], ROOMS[(a + off) % 4]];
}
/** 방의 효과: 체력 변화와 얻는 재료·소모품(재료 종류는 이 층 몬스터의 드롭을 따른다) */
export function applyRoom(room: RoomKind, php: number, pmax: number, day: number, floor: number): { php: number; mats: Record<string, number>; potion: number } {
  const drop = lootOf(monsterFor(day, floor).kind);
  if (room === 'rest') return { php: Math.min(pmax, php + Math.ceil(pmax * 0.25)), mats: {}, potion: 0 };
  if (room === 'treasure') return { php, mats: { [drop]: 2 }, potion: 0 };
  if (room === 'trap') return { php: Math.max(1, php - Math.ceil(pmax * 0.15)), mats: { [drop]: 3 }, potion: 0 };
  return { php, mats: {}, potion: 1 };
}

/** 히로인의 던전 지원(한 번 들어갈 때 1회): 호감 이야기를 끝까지 들은 히로인이 도와준다. 효과는 작고 모두 던전 안에서만 쓴다 */
export type SupportKind = 'heal' | 'rush' | 'weak';
export const SUPPORT: Record<string, { kind: SupportKind; text: string }> = {
  lisel: { kind: 'heal', text: '체력이 35% 돌아와요' }, kaira: { kind: 'rush', text: '[강타]를 바로 쓸 수 있게 돼요' }, mira: { kind: 'weak', text: '다음 공격이 약점으로 통해요' },
  sera: { kind: 'heal', text: '체력이 35% 돌아와요' }, noa: { kind: 'weak', text: '다음 공격이 약점으로 통해요' },
};
export function applySupport(b: Battle, id: string): Battle {
  const k = SUPPORT[id]?.kind;
  if (k === 'heal') return { ...b, php: Math.min(b.pmax, b.php + Math.ceil(b.pmax * 0.35)) };
  if (k === 'rush') return { ...b, cd: 0 };
  if (k === 'weak') return { ...b, charm: true };
  return b;
}
