import { hash } from './hash';
import { sx, sy } from './iso';
import { guildSprite } from './pixelGuilds';
import { FOREST_RING, N, entsAt, isPaved, terrain, type Ent, type Terrain } from './map';
import { PS, type Sprite } from './pix';
import { banner, barrels, boat, bush, cave, temple, castleSpriteLazy, cart, cow, dummy, fence, flowers, fountain, ground, hay, house, lamp, lantern, mushroom, rock, scarecrow, stall, tree, well, type GroundKind, type HouseKind } from './pixelWorld';

export { hash };

/** 월드 그림 데이터: React 요소가 아니라 단순한 그리기 목록이다. 캔버스(`canvasWorld.ts`)가 이 목록을 그린다.
 *  (이전에는 이미지 800개를 SVG 요소로 올렸는데, 폰의 Safari가 NPC가 움직일 때마다 그 큰 SVG를 다시 그려서 배경이 깜빡였다) */
export interface Tile { sp: Sprite; x: number; y: number; w: number; h: number }
export interface DrawItem extends Tile {
  /** 깊이(타일 x+y 계열, 클수록 앞) */ sum: number;
  /** 화면 가로 위치 판단용 타일 x */ gx: number;
  /** 길드면 그 id와 타일 */ guild?: string; gy: number;
  /** 지금 불투명도(걷는 동안 앞쪽 건물이 흐려졌다 돌아오는 부드러운 전환용) */ a: number;
}
export interface DrawList { tiles: Tile[]; ents: DrawItem[]; edges: string }

/** 스프라이트를 타일 (gx, gy)의 중심에 앉힌다 */
const place = (sp: Sprite, gx: number, gy: number): Tile => ({ sp, x: sx(gx + 0.5, gy + 0.5) - sp.ox * PS, y: sy(gx + 0.5, gy + 0.5) - sp.oy * PS, w: sp.w * PS, h: sp.h * PS });

const KIND: Record<Terrain, GroundKind> = { g: 'grass', F: 'forest', r: 'road', p: 'plaza', d: 'dirt', w: 'water', s: 'sand', f: 'farm', k: 'gravel', m: 'swamp', b: 'boards' };
/** 바닥 타일: 이웃과 겹치는 1칸 여유가 있어 이음매가 보이지 않는다 */
const tileOf = (kind: GroundKind, gx: number, gy: number): Tile => place(ground(kind, Math.floor(hash(gx, gy, 9) * 4)), gx, gy);

const KINDS: HouseKind[] = ['timber', 'stone', 'thatch', 'town'];
const baseHouse = (gx: number, gy: number) => {
  const a = hash(gx, gy, 1);
  return { kind: KINDS[a < 0.42 ? 0 : a < 0.66 ? 1 : a < 0.84 ? 2 : 3], wall: Math.floor(hash(gx, gy, 2) * 4), roof: Math.floor(hash(gx, gy, 3) * 4), ridge: (hash(gx, gy, 4) < 0.5 ? 'x' : 'y') as 'x' | 'y', seed: Math.floor(hash(gx, gy, 5) * 1000), v: Math.floor(hash(gx, gy, 6) * 4) };
};
/** 같은 모습이 이웃해 나란히 서지 않게: 왼쪽·위 이웃과 종류·벽·지붕이 같으면 벽과 지붕 색을 바꾼다 */
const houseAt = (gx: number, gy: number) => {
  const o = baseHouse(gx, gy);
  for (const [dx, dy] of [[-1, 0], [0, -1], [-1, -1], [-2, 0], [0, -2]]) {
    const n = baseHouse(gx + dx, gy + dy);
    if (n.kind === o.kind && n.wall === o.wall && n.roof === o.roof) { o.wall = (o.wall + 1) % 4; o.roof = (o.roof + 1) % 4; o.v = (o.v + 1) % 4; }
  }
  return house(o);
};

/** 개체 하나의 스프라이트와 깊이 */
function entSprite(e: Ent, festival: boolean): { sp: Sprite; sum: number } {
  const { x: gx, y: gy } = e, v = e.v ?? 0;
  const one = (sp: Sprite) => ({ sp, sum: gx + gy + 1 });
  switch (e.kind) {
    case 'guild': return one(guildSprite(e.id!));
    case 'castle': return { sp: castleSpriteLazy(), sum: gx + gy + 2 };
    case 'fountain': return one(fountain());
    case 'house': return one(houseAt(gx, gy));
    case 'tree': return one(tree(v));
    case 'bush': return one(bush(v));
    case 'flowers': return one(flowers(v));
    case 'rock': return one(rock(v));
    case 'fence': return one(fence(e.o ?? 'x'));
    case 'hay': return one(hay());
    case 'scarecrow': return one(scarecrow());
    case 'boat': return one(boat(v));
    case 'mushroom': return one(mushroom(v));
    case 'dummy': return one(dummy());
    case 'cow': return one(cow(v));
    case 'well': return one(well());
    case 'stall': return one(stall(v));
    case 'cart': return one(cart());
    case 'barrels': return one(barrels());
    case 'banner': return one(banner(v));
    case 'lantern': return one(lantern());
    case 'cave': return one(cave());
    case 'temple': return one(temple());
    case 'lamp': return one(lamp(festival));
  }
}

export interface ViewSpec { ax: number; ay: number; W: number; H: number; heroY: number; K: number; /** 마을 기부로 늘어난 장식(고정 개체에 더해 그린다) */ extra?: Ent[]; /** 연말 축제 기간이면 가로등이 축제 장식으로 바뀐다(요소 수는 그대로) */ festival?: boolean }

/** 앵커 타일 주변의 보이는 범위만 그린다. 맵은 data(`map.ts`)에서 오고, 바깥은 숲이 둘러싼다 */
export function buildWorld(v: ViewSpec): DrawList {
  const { ax, ay, W, H, heroY, K } = v;
  // 카메라가 앵커에서 최대 몇 타일 움직여도(앵커는 1.5타일 넘게 벗어나면 옮겨진다) 화면이 비지 않게 여유를 둔다
  const uMax = (W / 2 + 90) / ((56 * K) / 2) + 3;
  const vMin = -(heroY + 60) / ((28 * K) / 2) - 3;
  const vMax = (H - heroY + 40) / ((28 * K) / 2) + 3;
  const tiles: Tile[] = [];
  const edges: string[] = []; // 포장된 길(길·광장)의 가장자리: 가는 검정 테두리
  const ents: DrawItem[] = [];
  const extraAt = new Map<string, Ent[]>();
  for (const e of v.extra ?? []) { const k = `${e.x},${e.y}`; extraAt.set(k, [...(extraAt.get(k) ?? []), e]); }
  const gxMin = Math.floor(ax + (vMin - uMax) / 2), gxMax = Math.ceil(ax + (vMax + uMax) / 2);
  const gyMin = Math.floor(ay + (vMin - uMax) / 2), gyMax = Math.ceil(ay + (vMax + uMax) / 2);
  const push = (t: Tile, sum: number, gx: number, gy: number, guild?: string) => ents.push({ ...t, sum, gx, gy, guild, a: 1 });
  for (let gx = gxMin; gx <= gxMax; gx++)
    for (let gy = gyMin; gy <= gyMax; gy++) {
      const u = gx - ax - (gy - ay), vv = gx - ax + (gy - ay);
      if (Math.abs(u) > uMax || vv < vMin || vv > vMax) continue;
      const key = `${gx},${gy}`, sum = gx + gy + 1;
      if (gx < 0 || gy < 0 || gx >= N || gy >= N) { // 맵 바깥: 숲이 가로막는다
        const out = Math.max(-gx, gx - N + 1, -gy, gy - N + 1);
        if (out <= FOREST_RING && hash(gx, gy, 12) < 0.9) push(place(tree(hash(gx, gy, 13) < 0.55 ? 2 : Math.floor(hash(gx, gy, 14) * 2)), gx, gy), sum, gx, gy);
        continue;
      }
      const t = terrain(gx, gy);
      tiles.push(tileOf(entsAt.get(key)?.some((e) => e.kind === 'guild') ? 'plaza' : KIND[t], gx, gy));
      if (isPaved(gx, gy)) {
        const T = [sx(gx, gy), sy(gx, gy)], R = [sx(gx + 1, gy), sy(gx + 1, gy)], B = [sx(gx + 1, gy + 1), sy(gx + 1, gy + 1)], L = [sx(gx, gy + 1), sy(gx, gy + 1)];
        const seg = (a: number[], b: number[]) => edges.push(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`);
        if (!isPaved(gx, gy - 1)) seg(T, R);
        if (!isPaved(gx + 1, gy)) seg(R, B);
        if (!isPaved(gx, gy + 1)) seg(B, L);
        if (!isPaved(gx - 1, gy)) seg(L, T);
      }
      for (const e of [...(entsAt.get(key) ?? []), ...(extraAt.get(key) ?? [])]) {
        const r = entSprite(e, !!v.festival);
        push(place(r.sp, gx, gy), r.sum, gx, gy, e.kind === 'guild' ? e.id : undefined);
      }
    }
  ents.sort((a, b) => a.sum - b.sum || a.gx - b.gx);
  return { tiles, ents, edges: edges.join('') };
}
