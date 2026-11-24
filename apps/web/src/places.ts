import { DIVE_SPOT, FISH_SPOT, SPOTS } from './gather';
import { HEROINES } from './scene/heroines';
import { homeTile, shopTile } from './scene/townFx';

/** 월드의 활동 장소 목록(생활 탭·마을 지도에서 "걸어가기"로 안내한다) */
export type PlaceId = string;
export interface Place { id: string; name: string; glyph: string; tile: [number, number]; kind: 'gather' | 'fish' | 'dive' | 'shop' | 'home' | 'heroine'; desc: string }
export function placesFor(g: { shop: { lv: number } | null; love: { stage: number } | null }): Place[] {
  const out: Place[] = [
    ...SPOTS.map((s) => ({ id: `gather${s.id}`, name: s.label, glyph: '채', tile: s.tile, kind: 'gather' as const, desc: `${['풀', '열매', '돌'][s.id]} 채집` })),
    { id: 'fish', name: '부두', glyph: '낚', tile: FISH_SPOT.tile, kind: 'fish', desc: '낚시' },
    { id: 'dive', name: '동굴 입구', glyph: '굴', tile: DIVE_SPOT.tile, kind: 'dive', desc: '던전' },
  ];
  if (g.shop) out.push({ id: 'shop', name: '내 상점', glyph: '상', tile: shopTile(), kind: 'shop', desc: '내 가게' });
  if ((g.love?.stage ?? 0) >= 6) out.push({ id: 'home', name: '우리 집', glyph: '집', tile: homeTile(), kind: 'home', desc: '함께 사는 집' });
  for (const h of Object.values(HEROINES)) out.push({ id: `h-${h.id}`, name: h.name, glyph: '♥', tile: h.home, kind: 'heroine', desc: h.title });
  return out;
}
/** 그 장소로 걸어가라고 월드에 알린다(월드가 길을 찾아 걷는다) */
export const gotoTile = (tile: [number, number]) => dispatchEvent(new CustomEvent('mana-goto', { detail: { x: tile[0] + 0.5, y: tile[1] + 0.5 } }));
