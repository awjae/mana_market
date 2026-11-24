import { describe, expect, it } from 'vitest';
import { CRAFT, SPOTS, yieldOf } from './gather';
import { START, findPath } from './scene/map';
import { PROPS } from './scene/pixelHeroData';

describe('채집점', () => {
  it('3곳이 서로 다르고 시작 위치에서 걸어 갈 수 있다', () => {
    expect(new Set(SPOTS.map((s) => s.tile.join(','))).size).toBe(3);
    for (const s of SPOTS) expect(findPath(START, [s.tile[0] + 0.5, s.tile[1] + 0.5], 4000)?.length ?? 0, s.label).toBeGreaterThan(0);
  });
  it('양은 날짜로 정해지고 1~2개, 수공품은 그림이 있다', () => {
    for (let d = 0; d < 60; d++) for (const s of SPOTS) expect([1, 2]).toContain(yieldOf(s.kind, d));
    for (const k of Object.keys(CRAFT)) expect(PROPS[Number(k)]).toBeTruthy();
  });
});

import { FISH_SPOT } from './gather';
import { tileFree, walkable } from './scene/map';
describe('낚시터', () => {
  it('부두 끝은 걸어 갈 수 있고 시작 위치에서 길이 있다', () => {
    expect(walkable(FISH_SPOT.tile[0] + 0.5, FISH_SPOT.tile[1] + 0.5)).toBe(true);
    expect(tileFree(FISH_SPOT.tile[0], FISH_SPOT.tile[1])).toBe(true);
    expect(findPath(START, [FISH_SPOT.tile[0] + 0.5, FISH_SPOT.tile[1] + 0.5], 4000).length).toBeGreaterThan(0);
  });
});

import { DIVE_SPOT } from './gather';
describe('던전', () => {
  it('입구는 걸어 갈 수 있고 채집점·낚시터와 겹치지 않는다', () => {
    expect(findPath(START, [DIVE_SPOT.tile[0] + 0.5, DIVE_SPOT.tile[1] + 0.5], 4000).length).toBeGreaterThan(0);
    expect([...SPOTS.map((x) => x.tile.join(',')), FISH_SPOT.tile.join(',')]).not.toContain(DIVE_SPOT.tile.join(','));
  });
});

import { RARE, RARE_RATE, rareFind } from './gather';
describe('채집의 귀한 것', () => {
  it('날짜·채집점·줍기 횟수로 정해지고 4번에 1번꼴이다', () => {
    let hit = 0, n = 0;
    for (let d = 0; d < 200; d++) for (let spot = 0; spot < 3; spot++) for (let c = 0; c < 10; c++) { const r = rareFind(d, spot, c); expect(r).toBe(rareFind(d, spot, c)); if (r) hit++; n++; }
    expect(hit / n).toBeGreaterThan(RARE_RATE - 0.05); expect(hit / n).toBeLessThan(RARE_RATE + 0.05);
  });
  it('귀한 재료로 만드는 소품이 있고 소품 그림도 있다', () => {
    for (const r of Object.values(RARE)) expect(Object.values(CRAFT).some((c) => r.id in c)).toBe(true);
  });
});
