import { hash } from './hash';
import { GUILDS, N, PLAZA, terrain, tileFree, type Ent } from './map';

/** 마을 시설 기부: 마나를 영구히 써서 마을에 장식이 늘어난다(외형과 번영도만, 시세·거래와 무관). 시설마다 3단계 */
export interface Facility { id: string; name: string; desc: string; tiers: [number, number, number]; items: Ent[][]; /** 누적 지출(`spent`)이 이만큼 쌓여야 열린다(없으면 처음부터) */ need?: number }
export const TIER_PRICES: [number, number, number] = [500, 1500, 4000];
export const MAX_TIER = 3;

const taken = new Set<string>(); // 시설끼리 같은 칸을 쓰지 않게
const claim = <T extends [number, number][]>(pts: T) => { pts.forEach(([x, y]) => taken.add(`${x},${y}`)); return pts; };
const ring = (r0: number, r1: number, ok: (t: string) => boolean) => {
  const out: [number, number][] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.max(Math.abs(x - PLAZA[0]), Math.abs(y - PLAZA[1]));
    if (d >= r0 && d <= r1 && ok(terrain(x, y)) && tileFree(x, y) && !taken.has(`${x},${y}`)) out.push([x, y]);
  }
  return out;
};
/** 해시 순서로 고르되 서로 한 칸 안에 붙지 않게 n개 */
const spread = (cands: [number, number][], n: number, salt: number) => {
  const sorted = [...cands].sort((a, b) => hash(a[0], a[1], salt) - hash(b[0], b[1], salt)), out: [number, number][] = [];
  for (const c of sorted) { if (out.every((o) => Math.hypot(o[0] - c[0], o[1] - c[1]) >= 2.2)) out.push(c); if (out.length === n) break; }
  return out;
};
const tiers = (pts: [number, number][], kind: Ent['kind'], per: number, v = (i: number) => i): Ent[][] =>
  [0, 1, 2].map((t) => pts.slice(t * per, (t + 1) * per).map(([x, y], i) => ({ kind, x, y, v: v(t * per + i) })));

const guildSpots = (): [number, number][] => Object.values(GUILDS).flatMap((g) => {
  const sx = Math.floor(g.stand[0]), sy = Math.floor(g.stand[1]);
  const c = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [sx + dx, sy + dy] as [number, number]).find(([x, y]) => tileFree(x, y) && !taken.has(`${x},${y}`));
  if (c) taken.add(`${c[0]},${c[1]}`);
  return c ? [c] : [];
});

export const FACILITIES: Facility[] = [
  { id: 'lamps', name: '광장 가로등', desc: '대로와 광장 둘레에 가로등이 늘어요', tiers: TIER_PRICES, items: tiers(claim(spread(ring(3, 9, (t) => t === 'r' || t === 'p'), 12, 101)), 'lamp', 4) },
  { id: 'garden', name: '꽃 화단', desc: '광장 둘레 풀밭에 꽃이 피어요', tiers: TIER_PRICES, items: tiers(claim(spread(ring(3, 8, (t) => t === 'g'), 12, 102)), 'flowers', 4, (i) => i % 4) },
  { id: 'banners', name: '길드 깃발', desc: '길드 앞에 깃발이 서요', tiers: TIER_PRICES, items: (() => { const spots = guildSpots(); return [spots.slice(0, 3), spots.slice(3, 7), spots.slice(7, 10)].map((g, t) => g.map(([x, y], i) => ({ kind: 'banner' as const, x, y, v: t * 3 + i }))); })() },
  { id: 'lanterns', name: '축제 등롱', desc: '길가에 붉은 등롱이 매달려요', tiers: TIER_PRICES, items: tiers(claim(spread(ring(4, 10, (t) => t === 'r' || t === 'p'), 12, 103)), 'lantern', 4) },
];

/** 마을 확장(누적 지출로 열린다): 시장 거리와 새 주택가. 걷기를 막지 않는 자리에 개체를 더한다 */
FACILITIES.push(
  { id: 'market', name: '시장 거리', desc: '광장 둘레에 노점과 수레가 늘어요', need: 3000, tiers: [2000, 4000, 6000], items: tiers(claim(spread(ring(5, 11, (t) => t === 'g' || t === 'd'), 12, 104)), 'stall', 4, (i) => i % 4) },
  { id: 'homes', name: '새 주택가', desc: '풀밭에 새 집이 들어서요', need: 8000, tiers: [3000, 5000, 8000], items: tiers(claim(spread(ring(6, 12, (t) => t === 'g'), 9, 105)), 'house', 3) },
);

/** 내 상점(수입 없음): 마을에 내 가게 자리를 열고 단계마다 가게 앞이 꾸며진다. 개업 4,000, 확장 2,000/4,000/6,000 */
export const SHOP_NEED = 3000, SHOP_PRICES = [4000, 2000, 4000, 6000], SHOP_MAX = 4;
const shopSpots = (): [number, number][] => {
  const cands = ring(4, 8, (t) => t === 'g' || t === 'd');
  for (const [x, y] of [...cands].sort((a, b) => hash(a[0], a[1], 106) - hash(b[0], b[1], 106))) {
    const near = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => [x + dx, y + dy] as [number, number]).filter(([a, b]) => tileFree(a, b) && !taken.has(`${a},${b}`));
    if (near.length >= 3) { const pts: [number, number][] = [[x, y], ...near.slice(0, 3)]; claim(pts); return pts; }
  }
  return [[PLAZA[0] + 5, PLAZA[1] + 5], [PLAZA[0] + 6, PLAZA[1] + 5], [PLAZA[0] + 5, PLAZA[1] + 6], [PLAZA[0] + 6, PLAZA[1] + 6]];
};
const SHOP_PTS = shopSpots();
/** 상점 단계(1~4)에 따른 월드 개체: 1 노점, 2 통, 3 깃발, 4 꽃과 수레 */
export const shopEnts = (lv: number): Ent[] => {
  const e: Ent[] = [];
  if (lv >= 1) e.push({ kind: 'stall', x: SHOP_PTS[0][0], y: SHOP_PTS[0][1], v: 2 });
  if (lv >= 2) e.push({ kind: 'barrels', x: SHOP_PTS[1][0], y: SHOP_PTS[1][1] });
  if (lv >= 3) e.push({ kind: 'banner', x: SHOP_PTS[2][0], y: SHOP_PTS[2][1], v: 1 });
  if (lv >= 4) e.push({ kind: 'flowers', x: SHOP_PTS[3][0], y: SHOP_PTS[3][1], v: 2 });
  return e;
};
/** 결혼 뒤 마을에 서는 부부의 작은 집(집과 꽃 화단, 걷기를 막지 않는 자리) */
const HOME_PTS = (() => { const c = ring(6, 11, (t) => t === 'g').filter(([x, y]) => [[1, 0], [0, 1]].every(([dx, dy]) => tileFree(x + dx, y + dy) && !taken.has(`${x + dx},${y + dy}`))); const [x, y] = [...c].sort((a, b) => hash(a[0], a[1], 107) - hash(b[0], b[1], 107))[0] ?? [PLAZA[0] - 6, PLAZA[1] + 6]; claim([[x, y], [x + 1, y], [x, y + 1]]); return [[x, y], [x + 1, y], [x, y + 1]] as [number, number][]; })();
export const shopTile = (): [number, number] => SHOP_PTS[0];
export const homeTile = (): [number, number] => HOME_PTS[0];
export const homeEnts = (married: boolean): Ent[] => (married ? [{ kind: 'house', x: HOME_PTS[0][0], y: HOME_PTS[0][1] }, { kind: 'flowers', x: HOME_PTS[1][0], y: HOME_PTS[1][1], v: 1 }, { kind: 'lamp', x: HOME_PTS[2][0], y: HOME_PTS[2][1] }] : []);
export const cleanShop = (n: string) => n.replace(/\s+/g, ' ').trim().slice(0, 10);
export const validShop = (n: string) => cleanShop(n).length >= 2;
/** 열려 있는 문턱 목록(누적 지출 기준)과 다음에 열리는 것 */
export const UNLOCKS: { need: number; name: string }[] = [...FACILITIES.filter((f) => f.need).map((f) => ({ need: f.need!, name: f.name })), { need: SHOP_NEED, name: '내 상점' }].sort((a, b) => a.need - b.need);
export const nextUnlock = (spent: number) => UNLOCKS.find((u) => u.need > spent) ?? null;

/** 단계별로 쌓인 장식 전부: `town`은 시설 id → 현재 단계(0~3) */
export const townEnts = (town: Record<string, number>): Ent[] =>
  FACILITIES.flatMap((f) => f.items.slice(0, Math.min(MAX_TIER, town[f.id] ?? 0)).flat());
/** 마을 번영도(0~100%): 모든 시설의 단계 합 */
export const prosperity = (town: Record<string, number>) => Math.round((FACILITIES.reduce((a, f) => a + Math.min(MAX_TIER, town[f.id] ?? 0), 0) / (FACILITIES.length * MAX_TIER)) * 100);
