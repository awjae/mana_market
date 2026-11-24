import { expect, it } from 'vitest';
import { placesFor } from './places';
import { START, findPath } from './scene/map';

it('활동 장소는 모두 시작 위치에서 걸어 갈 수 있고 이름이 겹치지 않는다', () => {
  const ps = placesFor({ shop: { lv: 1 }, love: { stage: 6 } });
  expect(new Set(ps.map((p) => p.id)).size).toBe(ps.length);
  for (const p of ps.filter((x) => x.kind !== 'heroine')) expect(findPath(START, [p.tile[0] + 0.5, p.tile[1] + 0.5], 6000).length, p.name).toBeGreaterThan(0);
});
it('상점과 집은 열려 있을 때만 장소에 나온다', () => {
  expect(placesFor({ shop: null, love: null }).some((p) => p.id === 'shop' || p.id === 'home')).toBe(false);
  expect(placesFor({ shop: { lv: 1 }, love: { stage: 5 } }).some((p) => p.id === 'shop')).toBe(true);
  expect(placesFor({ shop: { lv: 1 }, love: { stage: 5 } }).some((p) => p.id === 'home')).toBe(false);
});
