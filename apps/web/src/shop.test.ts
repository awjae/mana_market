import { expect, it } from 'vitest';
import { visitorsOf } from './shop';
it('손님은 단계 수만큼(최대 3), 날짜로 정해지고 받침에 맞는 조사를 쓴다', () => {
  expect(visitorsOf(10, 0, [])).toHaveLength(0); expect(visitorsOf(10, 2, [])).toHaveLength(2); expect(visitorsOf(10, 4, [])).toHaveLength(3);
  expect(visitorsOf(10, 3, ['진주 머리핀'])).toEqual(visitorsOf(10, 3, ['진주 머리핀']));
  for (let d = 0; d < 60; d++) for (const t of visitorsOf(d, 3, ['왕관'])) { expect(t).not.toContain('이(가)'); expect(t).not.toContain('을(를)'); }
});
