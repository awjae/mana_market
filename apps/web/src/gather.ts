import { fantasyDate, type Season } from '@mana/engine';
import { weatherKind } from './calendar';
import { hash } from './scene/hash';
import { FACILITIES } from './scene/townFx';
import { N, PLAZA, terrain, tileFree, type Ent } from './scene/map';

/** 마을 일과: 채집점 3곳에서 하루 한 번씩 재료를 줍고, 모은 재료로 수공품 소품을 만든다.
 *  무엇이 나오는지는 날짜(계절·날씨)로 정해지는 결정적 값이다(뽑기 아님). 마나·시세와 무관하다. */
export type MatKind = 'plant' | 'fruit' | 'stone';
export const MAT_KINDS: MatKind[] = ['plant', 'fruit', 'stone'];
const NAMES: Record<MatKind, Record<Season, string>> = {
  plant: { 봄: '새싹잎', 여름: '푸른 풀잎', 가을: '단풍잎', 겨울: '얼음꽃' },
  fruit: { 봄: '산딸기', 여름: '여름 열매', 가을: '도토리', 겨울: '말린 열매' },
  stone: { 봄: '이슬 맺힌 돌', 여름: '반짝이는 조약돌', 가을: '이끼 낀 돌', 겨울: '서리 돌' },
};
export const MAT_LABEL: Record<MatKind, string> = { plant: '풀', fruit: '열매', stone: '돌' };
export const matName = (k: MatKind, day: number) => NAMES[k][fantasyDate(day).season];

/** 채집점: 마을 바깥쪽 풀밭 3곳(대로·시설 장식과 겹치지 않게 광장에서 먼 곳) */
export interface Spot { id: number; kind: MatKind; label: string; tile: [number, number]; ent: Ent }
const KIND_ENT: Record<MatKind, { ent: Ent['kind']; label: string }> = { plant: { ent: 'bush', label: '덤불' }, fruit: { ent: 'mushroom', label: '풀숲' }, stone: { ent: 'rock', label: '바위틈' } };
const pickTile = (salt: number): [number, number] => {
  const c: [number, number][] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.max(Math.abs(x - PLAZA[0]), Math.abs(y - PLAZA[1]));
    if (d >= 11 && d <= 16 && terrain(x, y) === 'g' && tileFree(x, y)) c.push([x, y]);
  }
  c.sort((a, b) => hash(a[0], a[1], salt) - hash(b[0], b[1], salt));
  return c[0] ?? [PLAZA[0] + 11, PLAZA[1]];
};
export const SPOTS: Spot[] = MAT_KINDS.map((kind, id) => {
  const tile = pickTile(300 + id);
  return { id, kind, label: KIND_ENT[kind].label, tile, ent: { kind: KIND_ENT[kind].ent, x: tile[0], y: tile[1], v: id } };
});

/** 오늘 이 채집점에서 얻는 양: 맑은 날 열매, 비 오는 날 풀, 눈 오는 날 돌이 두 개씩 */
export const yieldOf = (kind: MatKind, day: number) => {
  const w = weatherKind(day);
  return (w === 'clear' && kind === 'fruit') || (w === 'rain' && kind === 'plant') || (w === 'snow' && kind === 'stone') ? 2 : 1;
};

/** 드물게 함께 찾는 귀한 것(날짜·채집점·그날의 줍기 횟수로 정해지는 결정적 값, 4번에 1번꼴). 마나 값어치 없이 소품 재료로만 쓴다 */
export const RARE: Record<MatKind, { id: string; name: string }> = { plant: { id: 'herb', name: '달빛 약초' }, fruit: { id: 'goldfruit', name: '황금 열매' }, stone: { id: 'crystal', name: '수정 조각' } };
export const RARE_RATE = 0.25;
export const rareFind = (day: number, spot: number, n: number): boolean => hash(day, spot * 31 + n, 90) < RARE_RATE;

/** 수공품 소품(소품 번호 → 재료). 마나로는 살 수 없다 */
export const CRAFT: Record<number, Record<string, number>> = {
  17: { plant: 3 }, // 풀잎 관
  18: { plant: 2, fruit: 1 }, // 들꽃 머리핀
  19: { fruit: 3, stone: 1 }, // 도토리 모자
  24: { pearl: 2 }, // 진주 머리핀(낚시에서 건진 진주)
  25: { coin: 3 }, // 해적 금화 머리장식
  26: { shell: 2 }, // 소라 머리핀
  27: { herb: 2 }, // 달빛 약초 화관(채집)
  28: { goldfruit: 2 }, // 황금 열매 머리핀
  29: { crystal: 2 }, // 수정 머리장식
};

/** 낚시터: 항구 부두 끝. 채집점과 같은 방식으로 가까이 가면 E키 */
export const FISH_SPOT = { id: 3, label: '부두', tile: [37, 23] as [number, number], ent: { kind: 'barrels', x: 37, y: 23 } as Ent };
export const ALL_SPOTS = [...SPOTS, FISH_SPOT];

/** 던전 입구: 광장에서 걸어서 금방 보이는 풀밭(마을 시설 장식·채집점과 겹치지 않는 자리). 큰 동굴 그림이라 멀리서도 눈에 띈다 */
const diveTile = (): [number, number] => {
  const used = new Set([...ALL_SPOTS.map((x) => x.tile.join(',')), ...FACILITIES.flatMap((f) => f.items.flat()).map((e) => `${e.x},${e.y}`)]);
  const c: [number, number][] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.max(Math.abs(x - PLAZA[0]), Math.abs(y - PLAZA[1]));
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => used.has(`${x + dx},${y + dy}`));
    if (d >= 6 && d <= 8 && terrain(x, y) === 'g' && tileFree(x, y) && !used.has(`${x},${y}`) && !near) c.push([x, y]);
  }
  c.sort((a, b) => hash(a[0], a[1], 399) - hash(b[0], b[1], 399));
  return c[0] ?? [PLAZA[0] - 8, PLAZA[1]];
};
const DT = diveTile();
export const DIVE_SPOT = { id: 4, label: '동굴 입구', tile: DT, ent: { kind: 'cave', x: DT[0], y: DT[1] } as Ent };
export const ALL_SPOTS_WITH_DIVE = [...ALL_SPOTS, DIVE_SPOT];
