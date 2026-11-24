/**
 * NPC: 마을 사람과 동물. 업종 거점마다 어울리는 일꾼이 있고, 주민은 광장·대로를 오간다.
 * 이동 방식: walk(격자 A*로 장애물을 피해 걷기) · fly(갈매기) · swim(오리, 물 위) · stay(제자리)
 */
import { DEFAULT_LOOK, type Look } from './pixelHeroData';
import { hash } from './hash';
import { findPath, terrain, walkTile } from './map';
import { HEROINES } from './heroines';
import type { AnimalKind } from './pixelWorld';

export type Move = 'walk' | 'fly' | 'swim' | 'stay';
/** heroine: 주요 NPC(히로인)의 id. 있으면 누를 때 머리 위 한마디가 아니라 전체 대화가 열린다 */
export interface NpcDef { id: string; role: string; look?: Look; animal?: [AnimalKind, number]; home: [number, number]; roam: number; move: Move; speed: number; heroine?: string }
export interface Npc { def: NpcDef; x: number; y: number; path: [number, number][]; target: [number, number] | null; wait: number; flip: boolean; back: boolean; moving: boolean; phase: number }

/** 직업별 옷차림. 나머지(피부·머리·눈)는 id에서 정해 사람마다 다르게 한다 */
const ROLE: Record<string, Partial<Look>> = {
  villager: {}, noble: { clothesShape: 1, clothesColor: 3, prop: 3, propColor: 1 }, guard: { clothesShape: 2, clothesColor: 4, prop: 0 },
  merchant: { clothesShape: 0, clothesColor: 2, prop: 2, propColor: 4 }, smith: { clothesShape: 2, clothesColor: 5, hairColor: 3, prop: 0 },
  soldier: { clothesShape: 2, clothesColor: 2, prop: 0 }, farmer: { clothesShape: 0, clothesColor: 5, prop: 2, propColor: 1 },
  sailor: { clothesShape: 0, clothesColor: 1, prop: 2, propColor: 2 }, mage: { clothesShape: 1, clothesColor: 3, prop: 1, propColor: 5, hairColor: 6 },
  alchemist: { clothesShape: 1, clothesColor: 0, prop: 2, propColor: 3, hairColor: 5 }, clerk: { clothesShape: 0, clothesColor: 1, prop: 2, propColor: 6 },
  shepherd: { clothesShape: 0, clothesColor: 0, prop: 2, propColor: 3 }, miner: { clothesShape: 0, clothesColor: 4, prop: 2, propColor: 7 },
};
const lookFor = (id: string, role: string): Look => {
  const h = (k: number, n: number) => Math.floor(hash(id.length * 131 + id.charCodeAt(id.length - 1) * 7 + id.charCodeAt(0), k, 77) * n);
  return { ...DEFAULT_LOOK, skin: h(1, 5), eyeShape: h(2, 3), eyeColor: h(3, 6), hairShape: h(4, 3), hairColor: h(5, 8), clothesShape: h(6, 3), clothesColor: h(7, 6), prop: h(8, 10) < 3 ? 2 + h(9, 3) : 0, propColor: h(10, 8), ...ROLE[role] };
};
const P = (id: string, role: string, home: [number, number], roam = 0, move: Move = roam ? 'walk' : 'stay', speed = 1.3): NpcDef => ({ id, role, look: lookFor(id, role), home, roam, move, speed });
const A = (id: string, kind: AnimalKind, v: number, home: [number, number], roam: number, move: Move = 'walk', speed = 1.5): NpcDef => ({ id, role: kind, animal: [kind, v], home, roam, move, speed });

/** 히로인: 길드 앞(서는 자리 바로 옆)에 서 있다 */
const H = (id: string): NpcDef => { const h = HEROINES[id]; return { id: `h-${id}`, role: 'heroine', look: h.look, home: h.home, roam: 0, move: 'stay', speed: 0, heroine: id }; };

export const NPC_DEFS: NpcDef[] = [
  ...Object.keys(HEROINES).map(H),
  // 광장과 대로
  P('v1', 'villager', [22, 22], 5), P('v2', 'villager', [21, 21], 5), P('v3', 'villager', [23, 24], 5), P('v4', 'villager', [22, 19], 4, 'walk', 1.1), P('v5', 'villager', [16, 22], 4), P('v6', 'villager', [22, 30], 5),
  P('m1', 'merchant', [19, 19]), P('m2', 'merchant', [25, 19]), P('m3', 'merchant', [19, 25]), P('m4', 'merchant', [25, 25]),
  P('n1', 'noble', [13, 22], 3, 'walk', 1), P('n2', 'noble', [17, 22], 3, 'walk', 1),
  P('g1', 'guard', [10, 21]), P('g2', 'guard', [10, 23]),
  // 거점 일꾼
  P('c1', 'clerk', [15, 24]), P('c2', 'clerk', [15, 20]),
  P('s1', 'soldier', [12, 31], 3, 'walk', 1.6), P('s2', 'soldier', [11, 29], 2, 'walk', 1.6), P('s3', 'soldier', [13, 33], 2, 'walk', 1.6), P('cap', 'guard', [16, 31]),
  P('sm', 'smith', [27, 13]), P('mi', 'miner', [30, 11], 3, 'walk', 1.1),
  P('al', 'alchemist', [18, 9]), P('mg', 'mage', [34, 6]),
  P('sa1', 'sailor', [31, 22], 3), P('sa2', 'sailor', [36, 23]),
  P('sp', 'merchant', [23, 29]),
  P('f1', 'farmer', [30, 36], 4, 'walk', 1.1), P('f2', 'farmer', [17, 40], 2, 'walk', 1.1), P('sh', 'shepherd', [8, 36], 3, 'walk', 1.1),
  // 동물
  A('ch1', 'chicken', 0, [20, 35], 3), A('ch2', 'chicken', 0, [21, 38], 3), A('ch3', 'chicken', 0, [19, 36], 3), A('ch4', 'chicken', 0, [24, 40], 3),
  A('sw1', 'sheep', 0, [6, 36], 3, 'walk', 0.9), A('sw2', 'sheep', 0, [9, 38], 3, 'walk', 0.9), A('sw3', 'sheep', 0, [5, 33], 2, 'walk', 0.9), A('sw4', 'sheep', 0, [10, 35], 3, 'walk', 0.9),
  A('dg1', 'dog', 0, [22, 27], 5, 'walk', 2), A('dg2', 'dog', 1, [13, 31], 3, 'walk', 2), A('ct1', 'cat', 0, [16, 17], 3, 'walk', 1.4), A('ct2', 'cat', 1, [26, 27], 3, 'walk', 1.4),
  A('dk1', 'duck', 0, [38, 24], 4, 'swim', 0.7), A('dk2', 'duck', 0, [39, 21], 3, 'swim', 0.7), A('dk3', 'duck', 0, [37, 27], 3, 'swim', 0.7),
  A('gl1', 'gull', 0, [36, 22], 6, 'fly', 2.4), A('gl2', 'gull', 0, [38, 26], 6, 'fly', 2.4), A('gl3', 'gull', 0, [33, 25], 5, 'fly', 2.4),
];

/** 가장 가까운 걸을 수 있는 칸을 찾는다(처음 놓을 때) */
const nearest = (x: number, y: number): [number, number] => {
  for (let r = 0; r < 6; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && walkTile(x + dx, y + dy)) return [x + dx + 0.5, y + dy + 0.5];
  return [x + 0.5, y + 0.5];
};
export const createNpcs = (): Npc[] => NPC_DEFS.map((def, i) => {
  const [x, y] = def.move === 'walk' || def.move === 'stay' ? nearest(def.home[0], def.home[1]) : [def.home[0] + 0.5, def.home[1] + 0.5];
  return { def, x, y, path: [], target: null, wait: Math.random() * 3, flip: false, back: false, moving: false, phase: i * 0.7 };
});

/** 다른 NPC가 이미 서 있거나 가는 곳(1.1타일 안)은 피한다: 한곳에 몰려 겹치지 않게 */
const crowded = (all: Npc[], self: Npc, x: number, y: number) => all.some((o) => o !== self && (Math.hypot(o.x - x, o.y - y) < 1.1 || (o.path.length && Math.hypot(o.path[o.path.length - 1][0] - x, o.path[o.path.length - 1][1] - y) < 1.1)));

const pickTarget = (n: Npc, all: Npc[]): [number, number] | null => {
  const { home, roam, move } = n.def;
  for (let k = 0; k < 8; k++) {
    const tx = Math.floor(home[0] + (Math.random() * 2 - 1) * roam), ty = Math.floor(home[1] + (Math.random() * 2 - 1) * roam);
    if ((move === 'walk' ? walkTile(tx, ty) : move === 'swim' ? terrain(tx, ty) === 'w' : true) && (move === 'fly' || !crowded(all, n, tx + 0.5, ty + 0.5))) return [tx + 0.5, ty + 0.5];
  }
  return null;
};

/** 한 걸음: 목적지를 정해 걷고, 도착하면 잠깐 쉰다 */
export function stepNpc(n: Npc, dt: number, all: Npc[] = []) {
  n.phase += dt;
  if (n.def.move === 'stay') { n.moving = false; return; }
  if (!n.path.length) {
    n.moving = false; n.wait -= dt;
    if (n.wait > 0) return;
    const t = pickTarget(n, all);
    n.wait = 1.5 + Math.random() * 4;
    if (!t) return;
    n.path = n.def.move === 'walk' ? findPath([n.x, n.y], t, 160).slice(0, 16) : [t];
    if (!n.path.length) return;
  }
  const [tx, ty] = n.path[0], dx = tx - n.x, dy = ty - n.y, dist = Math.hypot(dx, dy), step = n.def.speed * dt;
  n.moving = true;
  if (dist <= step) { n.x = tx; n.y = ty; n.path.shift(); if (!n.path.length) n.moving = false; }
  else { n.x += (dx / dist) * step; n.y += (dy / dist) * step; }
  if (Math.abs(dx - dy) > 1e-3) n.flip = dx - dy < 0;
  n.back = dx + dy < -1e-3;
}
