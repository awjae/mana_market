import { rgb, sprite, type Sprite } from './pix';
import { GH, GW, composeLook, type Look } from './pixelHeroData';

/** 사람 NPC는 도트마다 요소를 만들면 30명이 6천 개라 너무 무겁다: 한 번 그려 이미지 한 장으로 캐시한다 */
export const personSprite = (look: Look, back: boolean): Sprite => sprite(`person:${back ? 'b' : 'f'}:${JSON.stringify(look)}`, GW + 2, GH + 3, (GW + 2) / 2, GH + 1, (s) => {
  const { fill, line } = composeLook(look, back);
  for (const c of [...line, ...fill]) s.b.set(c.x + 1, c.y + 1, rgb(c.c));
}, { outline: false });

/** 사람 NPC는 주인공(2)보다 조금 작은 도트 크기(1.9)로 그린다: 같은 치비 비율이지만 주인공이 살짝 더 커 보이게 */
export const PERSON_PS = 1.9;

