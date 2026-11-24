/**
 * 손으로 설계한 유한한 맵(44×44 타일). 각 길드는 업종에 어울리는 지형에 서 있다.
 * 길은 모두 타일 축 방향(= 화면의 대각선)으로만 깔아 가장자리가 계단처럼 깨지지 않게 한다.
 * 화면 방향: -x = 왼쪽 위, +x = 오른쪽 아래, -y = 오른쪽 위, +y = 왼쪽 아래.
 *   왼쪽 위   왕성 + 왕의 대로(은행·보험이 대로변)        중앙   광장(분수·가판)
 *   오른쪽 위  채석장 언덕의 대장간, 늪가의 연금술, 숲 속 돌바닥의 마법사 탑
 *   왼쪽 아래  모래 훈련장의 용병단, 울타리 목장          아래   시장길의 향신료 상회, 밭 사이의 곡물 상단
 *   오른쪽 아래 호수 항구의 해운 상단
 */
import { hash, vnoise } from './hash';

export const N = 44;
/** g 풀 · F 숲바닥 · r 길 · p 광장 · d 흙 · w 물 · s 모래 · f 밭 · k 자갈 · m 늪 · b 부두 판자 */
export type Terrain = 'g' | 'F' | 'r' | 'p' | 'd' | 'w' | 's' | 'f' | 'k' | 'm' | 'b';
export type EntKind = 'house' | 'tree' | 'bush' | 'flowers' | 'rock' | 'fence' | 'hay' | 'scarecrow' | 'boat' | 'mushroom' | 'dummy' | 'cow' | 'well' | 'stall' | 'cart' | 'barrels' | 'lamp' | 'banner' | 'lantern' | 'cave' | 'fountain' | 'castle' | 'guild';
export interface Ent { kind: EntKind; x: number; y: number; v?: number; o?: 'x' | 'y'; id?: string }

/** 길드: 건물 타일과 서는 타일(길 위). 서는 위치는 타일 중심 */
const G = (tile: [number, number], stand: [number, number]) => ({ tile, stand: [stand[0] + 0.5, stand[1] + 0.5] as [number, number] });
export const GUILDS: Record<string, { tile: [number, number]; stand: [number, number] }> = {
  BANK: G([14, 25], [14, 24]), INSR: G([14, 19], [14, 20]),
  MERC: G([15, 30], [16, 30]), IRON: G([28, 12], [27, 12]),
  TOWR: G([37, 6], [35, 6]), ALCH: G([16, 9], [17, 9]),
  SHIP: G([30, 20], [30, 22]), SPCE: G([25, 28], [24, 28]),
  GRAN: G([26, 34], [24, 34]), RNCH: G([13, 36], [14, 36]),
};
export const START: [number, number] = [22.5, 24.5];
export const PLAZA: [number, number] = [22, 22];
export const CASTLE: [number, number] = [8, 22];
export const FOREST_RING = 7; // 맵 바깥으로 이어지는 숲의 두께(타일)

const T: Terrain[][] = Array.from({ length: N }, () => Array<Terrain>(N).fill('g'));
const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N;
const put = (x: number, y: number, c: Terrain) => { if (inb(x, y)) T[y][x] = c; };
const rect = (x0: number, y0: number, x1: number, y1: number, c: Terrain) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c); };
const ell = (cx: number, cy: number, rx: number, ry: number, c: Terrain) => {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++)
    if (inb(x, y) && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) T[y][x] = c;
};

// ── 플레이 영역: 들쭉날쭉한 둥근 사각형. 바깥은 숲 ──
const inside = (x: number, y: number) => Math.max(Math.abs(x - 21.5), Math.abs(y - 21.5)) < 19.5 + (vnoise(x / 4, y / 4, 3) - 0.5) * 6;
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inside(x, y)) T[y][x] = 'F';

// ── 지형 ──
rect(4, 18, 11, 26, 'd'); // 왕성 앞뜰
ell(38, 24, 5.5, 8, 'w'); // 호수
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (T[y][x] === 'g' && ((x - 38) / 7) ** 2 + ((y - 24) / 9.5) ** 2 <= 1) T[y][x] = 's'; // 물가 모래
ell(15, 8, 4.2, 3.6, 'm'); put(13, 9, 'w'); put(14, 9, 'w'); put(13, 8, 'w'); put(12, 9, 'w'); // 연금술사의 늪과 웅덩이
ell(30, 10, 5.5, 4.5, 'k'); ell(37, 6, 3.4, 3.4, 'k'); // 채석장, 탑 아래 돌바닥
rect(9, 28, 15, 34, 's'); // 용병단 훈련장
rect(27, 32, 40, 42, 'f'); rect(14, 38, 21, 42, 'f'); rect(24, 30, 30, 33, 'f'); // 밭
rect(4, 31, 12, 41, 'g'); // 목장 풀밭
rect(19, 19, 25, 25, 'p'); // 광장(모서리를 깎지 않아야 가장자리 선이 곧다)

// ── 길 (모두 축 방향) ──
rect(10, 20, 18, 24, 'r'); // 왕의 대로(폭 5): 광장 → 성문
rect(22, 6, 23, 17, 'r'); // 북동로
rect(24, 12, 27, 13, 'r'); rect(17, 9, 21, 9, 'r'); rect(23, 6, 35, 6, 'r'); // 대장간·연금술·탑 가는 길
rect(26, 22, 31, 23, 'r'); rect(32, 23, 37, 23, 'b'); // 항구 길과 부두
rect(22, 26, 23, 43, 'r'); // 시장길 → 남문
rect(14, 36, 21, 36, 'r'); rect(24, 34, 25, 34, 'r'); rect(24, 28, 24, 28, 'r'); // 목장·곡물·향신료
rect(16, 25, 17, 30, 'r'); // 훈련장 가는 길

// ── 개체 ──
export const ENTS: Ent[] = [];
const occ = new Set<string>();
const key = (x: number, y: number) => `${x},${y}`;
const free = (x: number, y: number) => inb(x, y) && !occ.has(key(x, y));
const add = (e: Ent, w = 1) => { ENTS.push(e); for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < w; dy++) occ.add(key(e.x - Math.floor(w / 2) + dx, e.y - Math.floor(w / 2) + dy)); };

add({ kind: 'castle', x: CASTLE[0], y: CASTLE[1] }, 3);
add({ kind: 'fountain', x: PLAZA[0], y: PLAZA[1] }, 3);
for (const [x, y] of [[19, 21], [25, 21], [19, 23], [25, 23], [21, 19], [23, 19], [21, 25], [23, 25]]) add({ kind: 'lamp', x, y });
for (const [id, g] of Object.entries(GUILDS)) { add({ kind: 'guild', x: g.tile[0], y: g.tile[1], id }); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) occ.add(key(g.tile[0] + dx, g.tile[1] + dy)); }
for (const [x, y] of [[18, 19], [26, 19], [18, 25], [26, 25]]) if (free(x, y)) add({ kind: 'stall', x, y, v: Math.floor(hash(x, y, 5) * 3) });
add({ kind: 'well', x: 20, y: 17 });
for (const [x, y] of [[12, 19], [16, 25], [21, 11], [21, 14], [24, 30], [21, 35], [21, 40], [29, 21], [28, 24], [24, 8]]) if (free(x, y)) add({ kind: 'lamp', x, y });
// 목장: 울타리와 소
for (let x = 4; x <= 12; x++) { add({ kind: 'fence', x, y: 31, o: 'x' }); add({ kind: 'fence', x, y: 41, o: 'x' }); }
for (let y = 32; y <= 40; y++) { add({ kind: 'fence', x: 3, y, o: 'y' }); if (y < 35 || y > 37) add({ kind: 'fence', x: 13, y, o: 'y' }); }
for (const [x, y] of [[6, 35], [8, 37], [9, 34], [5, 38]]) add({ kind: 'cow', x, y, v: x % 2 });
for (const [x, y] of [[7, 33], [10, 39]]) add({ kind: 'hay', x, y });
// 용병단 훈련장
for (const [x, y] of [[10, 30], [12, 32], [10, 33]]) add({ kind: 'dummy', x, y });
for (let x = 9; x <= 15; x++) if (x !== 15) add({ kind: 'fence', x, y: 28, o: 'x' });
// 곡물 밭
for (const [x, y] of [[31, 38], [17, 40], [27, 31]]) add({ kind: 'scarecrow', x, y });
for (const [x, y] of [[29, 35], [35, 41], [19, 39]]) add({ kind: 'hay', x, y });
// 채석장 바위, 늪 버섯, 호수 배
for (let i = 0; i < 30; i++) { const x = 24 + Math.floor(hash(i, 1, 40) * 14), y = 5 + Math.floor(hash(i, 2, 40) * 12); if (free(x, y) && T[y][x] === 'k') add({ kind: 'rock', x, y, v: hash(x, y, 41) < 0.4 ? 1 : 0 }); }
for (let i = 0; i < 12; i++) { const x = 10 + Math.floor(hash(i, 3, 42) * 11), y = 3 + Math.floor(hash(i, 4, 42) * 11); if (free(x, y) && T[y][x] === 'm') add({ kind: 'mushroom', x, y, v: i % 3 }); }
for (const [x, y] of [[38, 28], [40, 19]]) add({ kind: 'boat', x, y, v: x % 2 });

// 집: 광장 둘레와 큰길가에 모인다. 길에 붙어 있어야 서고, 농가는 드물게
const nearRoad = (x: number, y: number, r = 2) => { for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (['r', 'p'].includes(T[y + dy]?.[x + dx])) return true; return false; };
for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) {
  if (!free(x, y) || T[y][x] !== 'g' || !nearRoad(x, y)) continue;
  const dp = Math.max(Math.abs(x - PLAZA[0]), Math.abs(y - PLAZA[1]));
  const dens = dp <= 8 ? 0.5 : dp <= 14 ? (y < 15 ? 0.03 : 0.2) : y > 30 ? 0.08 : 0; // 늪·채석장·탑 둘레(야생)에는 집을 짓지 않는다
  if (hash(x, y, 20) < dens) add({ kind: 'house', x, y });
}
// 숲과 수풀
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  if (!free(x, y)) continue;
  const t = T[y][x], n = vnoise(x / 3.5, y / 3.5, 8);
  if (t === 'F') { if (hash(x, y, 30) < 0.92) add({ kind: 'tree', x, y, v: hash(x, y, 31) < 0.55 ? 2 : Math.floor(hash(x, y, 32) * 2) }); }
  else if (t === 'g' && !nearRoad(x, y, 1)) {
    if (n > 0.68 && hash(x, y, 33) < 0.6) add({ kind: 'tree', x, y, v: hash(x, y, 31) < 0.4 ? 2 : Math.floor(hash(x, y, 32) * 2) });
    else if (hash(x, y, 34) < 0.07) add({ kind: 'bush', x, y, v: Math.floor(hash(x, y, 35) * 2) });
    else if (hash(x, y, 36) < 0.07) add({ kind: 'flowers', x, y, v: Math.floor(hash(x, y, 37) * 4) });
  } else if (t === 'm' && hash(x, y, 38) < 0.1) add({ kind: 'bush', x, y, v: 1 });
}
// 탑 둘레의 짙은 숲 (오솔길 쪽만 비운다)
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (free(x, y) && T[y][x] === 'g' && Math.hypot(x - 37, y - 6) < 6.5 && Math.hypot(x - 37, y - 6) > 3.6 && hash(x, y, 39) < 0.6 && !nearRoad(x, y, 1)) add({ kind: 'tree', x, y, v: hash(x, y, 31) < 0.6 ? 2 : 0 });

export const BLOCKING: EntKind[] = ['house', 'tree', 'bush', 'rock', 'fence', 'hay', 'scarecrow', 'dummy', 'cow', 'well', 'stall', 'cart', 'barrels', 'fountain', 'castle', 'guild'];
export const terrain = (x: number, y: number): Terrain => (inb(x, y) ? T[y][x] : 'F');
export const entsAt = new Map<string, Ent[]>();
const blockedSet = new Set<string>();
for (const e of ENTS) {
  const w = e.kind === 'castle' || e.kind === 'fountain' ? 3 : 1;
  for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < w; dy++) {
    const k = key(e.x - Math.floor(w / 2) + dx, e.y - Math.floor(w / 2) + dy);
    if (BLOCKING.includes(e.kind)) blockedSet.add(k);
  }
  const k = key(e.x, e.y); entsAt.set(k, [...(entsAt.get(k) ?? []), e]);
}
/** 걸을 수 있는 타일: 맵 안, 물·개체가 없는 곳 */
export const walkTile = (x: number, y: number) => inb(x, y) && T[y][x] !== 'w' && T[y][x] !== 'F' && !blockedSet.has(key(x, y));
/** 기부로 늘어나는 장식을 놓을 수 있는 타일: 걸을 수 있고 고정 개체가 없는 곳 */
export const tileFree = (x: number, y: number) => walkTile(x, y) && !entsAt.has(key(x, y));
export const walkable = (x: number, y: number) => walkTile(Math.floor(x), Math.floor(y));
export const isPaved = (x: number, y: number) => T[y]?.[x] === 'r' || T[y]?.[x] === 'p';

/** (x, y) 근처에서 가장 가까운 걸을 수 있는 타일 중심(반경 r 안). 없으면 null */
export function nearestWalkable(x: number, y: number, r = 2): [number, number] | null {
  let best: [number, number] | null = null, bd = Infinity;
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    const tx = Math.floor(x) + dx, ty = Math.floor(y) + dy;
    if (!walkTile(tx, ty)) continue;
    const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
    if (d < bd) { bd = d; best = [tx + 0.5, ty + 0.5]; }
  }
  return best;
}

/** 격자 위 A* (8방향, 모서리 가로지르기 금지). 타일 중심 좌표의 경유점 목록을 돌려준다 */
export function findPath(from: [number, number], to: [number, number], limit = Infinity): [number, number][] {
  const s = [Math.floor(from[0]), Math.floor(from[1])], g = [Math.floor(to[0]), Math.floor(to[1])];
  if (!walkTile(g[0], g[1])) return [];
  const id = (x: number, y: number) => y * N + x;
  const open = new Map<number, number>([[id(s[0], s[1]), 0]]), came = new Map<number, number>(), gs = new Map<number, number>([[id(s[0], s[1]), 0]]), closed = new Set<number>();
  const h = (x: number, y: number) => Math.hypot(x - g[0], y - g[1]);
  let spent = 0;
  while (open.size) {
    if (++spent > limit) return []; // NPC는 멀리 돌아가야 하면 포기한다(매 프레임 끊김 방지)
    let cur = -1, best = Infinity;
    for (const [k, f] of open) if (f < best) { best = f; cur = k; }
    const cx = cur % N, cy = Math.floor(cur / N);
    if (cx === g[0] && cy === g[1]) {
      const out: [number, number][] = [[to[0], to[1]]]; let k = cur;
      while (came.has(k)) { k = came.get(k)!; const px = k % N, py = Math.floor(k / N); if (px !== s[0] || py !== s[1]) out.unshift([px + 0.5, py + 0.5]); }
      return out;
    }
    open.delete(cur); closed.add(cur);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!walkTile(nx, ny) || closed.has(id(nx, ny)) || (dx && dy && (!walkTile(cx + dx, cy) || !walkTile(cx, cy + dy)))) continue;
      const ng = gs.get(cur)! + Math.hypot(dx, dy);
      if (ng < (gs.get(id(nx, ny)) ?? Infinity)) { gs.set(id(nx, ny), ng); came.set(id(nx, ny), cur); open.set(id(nx, ny), ng + h(nx, ny)); }
    }
  }
  return [];
}
export const ascii = () => T.map((row, y) => row.map((c, x) => { const e = entsAt.get(key(x, y)); const g = e?.find((q) => q.kind === 'guild'); return g ? g.id![0] : e?.some((q) => q.kind === 'castle') ? 'C' : e?.some((q) => q.kind === 'house') ? 'H' : e?.some((q) => q.kind === 'tree') ? 't' : e?.length ? '*' : c; }).join('')).join('\n');
