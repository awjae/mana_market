import { describe, expect, it } from 'vitest';
import { CREATURES, FOUND_ITEMS, catchOf } from './activity';

describe('낚시 결과(결정적)', () => {
  it('같은 날 같은 회차 같은 낚싯대는 같은 결과', () => { for (let c = 0; c < 30; c++) expect(catchOf(100, c, 3)).toEqual(catchOf(100, c, 3)); });
  it('낚싯대 단계가 낮으면 귀한 것은 걸리지 않는다', () => {
    for (let d = 0; d < 80; d++) for (let c = 0; c < 20; c++) {
      const x = catchOf(d, c, 1);
      if (x.kind === 'creature') expect(CREATURES.find((k) => k.id === x.id)!.rod).toBe(1);
      if (x.kind === 'item') expect(FOUND_ITEMS.find((k) => k.id === x.id)!.rod).toBe(1);
    }
  });
  it('물건은 마나 값어치가 없고 낚싯대 4단계에선 모든 종류가 나온다', () => {
    const seen = new Set<string>();
    for (let d = 0; d < 200; d++) for (let c = 0; c < 10; c++) { const x = catchOf(d, c, 4); if (x.kind === 'item') { expect(x.value).toBe(0); } seen.add(x.kind === 'fish' ? 'fish' : x.id); }
    for (const k of [...CREATURES, ...FOUND_ITEMS]) expect(seen.has(k.id)).toBe(true);
  });
});
