import { describe, expect, it } from 'vitest';
import { GUILDS, N, START, ENTS, findPath, walkTile, walkable } from './map';
import { HEROINES } from './heroines';
import { NPC_DEFS } from './npcs';

describe('손으로 설계한 맵', () => {
  it('시작 위치는 걸을 수 있다', () => expect(walkable(START[0], START[1])).toBe(true));
  it('모든 길드의 서는 자리는 걸을 수 있고 시작 위치에서 도달할 수 있다', () => {
    for (const [id, g] of Object.entries(GUILDS)) {
      expect(walkable(g.stand[0], g.stand[1]), `${id} 서는 자리가 막혀 있다`).toBe(true);
      const path = findPath(START, g.stand);
      expect(path.length, `${id}에 도달할 수 없다`).toBeGreaterThan(0);
      const [x, y] = path[path.length - 1];
      expect(Math.hypot(x - g.stand[0], y - g.stand[1])).toBeLessThan(0.01);
    }
  });
  it('길드 건물 타일은 서는 자리와 이웃하고(3칸 안) 건물 자체는 막혀 있다', () => {
    for (const [id, g] of Object.entries(GUILDS)) {
      expect(walkTile(g.tile[0], g.tile[1]), `${id} 건물 타일이 비어 있다`).toBe(false);
      expect(Math.hypot(g.tile[0] + 0.5 - g.stand[0], g.tile[1] + 0.5 - g.stand[1])).toBeLessThan(3);
    }
  });
  it('길드는 서로 다른 타일에 있고 개체와 겹치지 않는다', () => {
    const tiles = new Set(Object.values(GUILDS).map((g) => `${g.tile}`));
    expect(tiles.size).toBe(Object.keys(GUILDS).length);
    const at = new Map<string, string[]>();
    for (const e of ENTS) { const k = `${e.x},${e.y}`; at.set(k, [...(at.get(k) ?? []), e.kind]); }
    for (const g of Object.values(GUILDS)) expect(at.get(`${g.tile}`), '길드 타일에 다른 개체가 있다').toEqual(['guild']);
  });
  it('맵 바깥과 물은 걸을 수 없다', () => {
    expect(walkTile(-1, 5)).toBe(false); expect(walkTile(N, 5)).toBe(false); expect(walkTile(38, 24)).toBe(false);
  });
});

describe('NPC', () => {
  it('히로인은 길드 서는 자리 옆의 걸을 수 있는 칸에 선다', () => {
    for (const h of Object.values(HEROINES)) {
      expect(walkTile(h.home[0], h.home[1]), `${h.name}의 자리가 막혀 있다`).toBe(true);
      const g = GUILDS[h.guild];
      expect(Math.hypot(h.home[0] + 0.5 - g.stand[0], h.home[1] + 0.5 - g.stand[1]), `${h.name}이 서는 자리와 멀다`).toBeLessThan(3);
      expect(h.story.length).toBe(8); // 이야기는 8챕터(4일 선물 + 이후 4일 깊은 이야기)
    }
  });
  it('NPC id는 겹치지 않고, 걷는 NPC의 근거지는 걸을 수 있는 칸 근처다', () => {
    expect(new Set(NPC_DEFS.map((d) => d.id)).size).toBe(NPC_DEFS.length);
    for (const d of NPC_DEFS.filter((x) => x.move === 'walk' || x.move === 'stay')) {
      let ok = false;
      for (let dx = -5; dx <= 5 && !ok; dx++) for (let dy = -5; dy <= 5 && !ok; dy++) ok = walkTile(d.home[0] + dx, d.home[1] + dy);
      expect(ok, `${d.id} 근처에 걸을 곳이 없다`).toBe(true);
    }
  });
});
