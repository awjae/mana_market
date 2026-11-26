import { describe, expect, it } from 'vitest';
import { HEROINES } from './heroines';
import { LOOK_COUNT, LOOK_PRICE, ACC_COLORS, BASE_PROPS, CLOTHES, CLOTHES_NAMES, DEFAULT_LOOK, EYES, EYE_NAMES, GW, HAIRS, HAIR_NAMES, PROPS, PROP_NAMES, PROP_UNLOCK, composeLook } from './pixelHeroData';

describe('도트 캐릭터 데이터', () => {
  it('모든 층의 격자 폭은 16칸이다', () => {
    const rows = [...PROPS, ...CLOTHES, ...EYES, ...HAIRS.flatMap((h) => [h.back, h.front])].flatMap((l) => l.rows);
    for (const r of rows) expect(r.length, r).toBe(GW);
  });
  it('소품 이름과 그림 수가 같고, 해금 소품은 실제 히로인에 연결된다', () => {
    expect(PROP_NAMES.length).toBe(PROPS.length);
    for (const [i, who] of Object.entries(PROP_UNLOCK)) { expect(Number(i)).toBeGreaterThanOrEqual(BASE_PROPS); expect(HEROINES[who], `${who}`).toBeDefined(); }
    expect(new Set(Object.values(PROP_UNLOCK)).size).toBe(Object.keys(PROP_UNLOCK).length); // 히로인 한 명당 소품 하나
  });
  it('모든 소품 × 앞/뒷모습이 그려지고 칸이 겹치지 않는다', () => {
    for (let p = 0; p < PROPS.length; p++) for (const back of [false, true]) {
      const { fill } = composeLook({ ...DEFAULT_LOOK, prop: p, propColor: p % ACC_COLORS.length }, back);
      expect(fill.length).toBeGreaterThan(100);
      expect(new Set(fill.map((c) => `${c.x},${c.y}`)).size).toBe(fill.length);
    }
  });
  it('히로인은 각자 해금 소품을 쓰고 서로 다른 모습이다', () => {
    const looks = Object.values(HEROINES).map((h) => JSON.stringify(h.look));
    expect(new Set(looks).size).toBe(looks.length);
    for (const h of Object.values(HEROINES)) expect(PROP_UNLOCK[h.look.prop], `${h.name}의 소품`).toBe(h.id);
  });
  it('머리·눈·옷의 이름과 그림 수가 같고, 모든 조합이 앞/뒷모습으로 겹침 없이 그려진다', () => {
    expect(HAIR_NAMES.length).toBe(HAIRS.length);
    expect(EYE_NAMES.length).toBe(EYES.length);
    expect(CLOTHES_NAMES.length).toBe(CLOTHES.length);
    expect(LOOK_COUNT).toEqual({ eye: EYES.length, hair: HAIRS.length, clothes: CLOTHES.length });
    for (const k of ['eye', 'hair', 'clothes'] as const) for (const i of Object.keys(LOOK_PRICE[k]).map(Number)) expect(i, `${k}:${i}`).toBeLessThan(LOOK_COUNT[k]); // 가격표는 실제 모양 번호만
    for (let h = 0; h < HAIRS.length; h++) for (let e = 0; e < EYES.length; e++) for (let c = 0; c < CLOTHES.length; c++) for (const back of [false, true]) {
      const { fill } = composeLook({ ...DEFAULT_LOOK, hairShape: h, eyeShape: e, clothesShape: c, prop: 0 }, back);
      expect(fill.length).toBeGreaterThan(120);
      expect(new Set(fill.map((x) => `${x.x},${x.y}`)).size).toBe(fill.length);
      for (const x of fill) { expect(x.x).toBeGreaterThanOrEqual(0); expect(x.x).toBeLessThan(GW); }
    }
  }, 20000); // 모든 조합을 그려서 병렬 부하에서는 기본 5초를 넘는다
});
