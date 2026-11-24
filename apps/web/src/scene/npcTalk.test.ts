import { marketAtDay } from '@mana/engine';
import { describe, expect, it } from 'vitest';
import { npcTalk } from './npcTalk';
import type { Npc } from './npcs';

const npc = (role: string, id = role) => ({ def: { id, role } }) as unknown as Npc;
describe('일반 NPC 대사', () => {
  const m = marketAtDay(60); // 첫 60일은 큰 소식이 적다
  it('같은 NPC를 연달아 눌러도 같은 말이 연속으로 나오지 않는다', () => {
    for (const role of ['villager', 'smith', 'mage', 'dog', 'clerk']) {
      const n = npc(role, `t-${role}`);
      let prev = '';
      for (let i = 0; i < 60; i++) { const t = npcTalk(n, m).text; expect(t, role).not.toBe(prev); prev = t; }
    }
  });
  it('직업별 한마디가 충분히 다양하다(소식이 없는 날 포함 20번 눌러 5가지 이상)', () => {
    const seen = new Set<string>();
    const empty = { ...m, news: [], newsLog: [] };
    for (let i = 0; i < 80; i++) seen.add(npcTalk(npc('farmer', `f${i % 3}`), empty).text);
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });
});
