import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** 투자 조언·전망·매매 권유로 읽히는 문구가 게임 대사·소식·퀴즈에 들어가지 않게 막는다(CLAUDE.md "투자 조언 금지") */
const FILES = [
  'src/scene/heroines.ts', 'src/scene/npcTalk.ts', 'src/scene/npcReact.ts', 'src/ui/BankPanel.tsx', 'src/ui/DailyPanel.tsx', 'src/activity.ts', 'src/dungeon.ts', 'src/skills.ts', 'src/ui/EasyToggle.tsx', 'src/ui/ShopPanel.tsx', 'src/love.ts', 'src/ui/LoveScreen.tsx', 'src/ui/LovePanel.tsx', 'src/ui/MountPanel.tsx', 'src/ui/LifePanel.tsx', 'src/ui/Codex.tsx', 'src/adventurer.ts', 'src/places.ts', 'src/shop.ts', 'src/ui/Minigames.tsx', 'src/ui/DungeonScreen.tsx', 'src/gather.ts', 'src/quests.ts', 'src/goals.ts', 'src/relief.ts', 'src/ui/TownPanel.tsx', 'src/scene/townFx.ts', 'src/reasons.ts', 'src/recap.ts', 'src/ui/Story.tsx', 'src/ui/Conversation.tsx', 'src/ui/Tutorial.tsx', 'src/ui/About.tsx', 'src/ui/Quests.tsx',
  '../../packages/engine/src/data.ts', '../../packages/engine/src/regimes.ts',
];
const BANNED = /사세요|파세요|매수하세요|매도하세요|사야 (해|한다|할|지)|팔아야|오를 것|오를 거야|오를 듯|오를 테|내릴 것|내릴 거야|유망|추천|대박|놓치지|지금 (사|팔)|기회(를|가|예요|야)|떨어질 거|확실히 벌|곧 (공시|나올|나와)|틀림없|분명히|눈여겨|주목|이제 (좋아|나빠|오르|내리)|알고 있|내부|헛소문(이었|일 거)/;

describe('문구 점검', () => {
  for (const f of FILES) {
    it(`${f}에는 매매 권유·전망 표현이 없다`, () => {
      const lines = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').split('\n');
      const hits = lines.map((l, i) => (BANNED.test(l) && !l.trim().startsWith('//') && !l.includes('금지') ? `${i + 1}: ${l.trim().slice(0, 80)}` : '')).filter(Boolean);
      expect(hits).toEqual([]);
    });
  }
});

describe('주민 대사 정보 누설 방지', () => {
  it('npcTalk·npcReact는 예정 이벤트·영향·시가·소문 템플릿·소문 어조를 읽지 않는다', () => {
    for (const f of ['src/scene/npcTalk.ts', 'src/scene/npcReact.ts']) {
      const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/**')).join('\n');
      expect(src, f).not.toMatch(/\.pending|\.effects|\.opens|templateId/);
    }
  });
});
