import { describe, expect, it } from 'vitest';
import { FACILITIES, MAX_TIER, prosperity, townEnts } from './townFx';

describe('마을 시설', () => {
  it('시설마다 3단계, 단계마다 장식이 있고 서로 같은 칸을 쓰지 않는다', () => {
    const seen = new Set<string>();
    for (const f of FACILITIES) {
      expect(f.items).toHaveLength(MAX_TIER);
      for (const t of f.items) { expect(t.length, f.id).toBeGreaterThanOrEqual(2); for (const e of t) { const k = `${e.x},${e.y}`; expect(seen.has(k), `${f.id} ${k}`).toBe(false); seen.add(k); } }
    }
    expect(seen.size).toBeLessThanOrEqual(80); // 월드 요소 수가 크게 늘지 않게(캔버스 한 장이라 수백 개도 가볍다)
  });
  it('기부한 단계만큼만 장식이 나오고 번영도가 오른다', () => {
    expect(townEnts({})).toHaveLength(0);
    expect(prosperity({})).toBe(0);
    const one = townEnts({ lamps: 1 }).length, two = townEnts({ lamps: 2 }).length;
    expect(two).toBeGreaterThan(one);
    const all = Object.fromEntries(FACILITIES.map((f) => [f.id, 3]));
    expect(prosperity(all)).toBe(100);
    expect(townEnts({ lamps: 9 }).length).toBe(townEnts({ lamps: 3 }).length); // 단계 상한
  });
});

import { SHOP_MAX, SHOP_NEED, cleanShop, nextUnlock, shopEnts, validShop } from './townFx';
describe('마을 확장과 내 상점', () => {
  it('확장 시설은 누적 지출 문턱이 있고 단계마다 개체가 늘며 다른 개체와 칸을 나누지 않는다', () => {
    const fx = FACILITIES.filter((f) => f.need);
    expect(fx.map((f) => f.id)).toEqual(['market', 'homes']);
    const keys = new Set<string>(); let n = 0;
    for (const f of FACILITIES) for (const e of f.items.flat()) { keys.add(`${e.x},${e.y}`); n++; }
    for (const e of shopEnts(SHOP_MAX)) { keys.add(`${e.x},${e.y}`); n++; }
    expect(keys.size).toBe(n);
  });
  it('상점 단계가 오를수록 개체가 하나씩 늘고 이름은 2~10자', () => {
    for (let lv = 1; lv <= SHOP_MAX; lv++) expect(shopEnts(lv)).toHaveLength(lv);
    expect(shopEnts(0)).toHaveLength(0);
    expect(validShop('a')).toBe(false); expect(validShop('은빛 상회')).toBe(true); expect(cleanShop('  이름   긴 가게 이름이에요  ')).toBe('이름 긴 가게 이름이에요'.slice(0, 10));
  });
  it('다음에 열리는 것은 누적 지출 순서대로 알려 준다', () => {
    expect(nextUnlock(0)?.need).toBe(SHOP_NEED); expect(nextUnlock(100000)).toBeNull();
  });
});
