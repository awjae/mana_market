import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DATE_COST, LOVE, RING_COST, STAGE, WEDDING_COST, stepCost } from './love';
import { HEROINES } from './scene/heroines';

describe('인연 이야기 내용', () => {
  it('히로인 5명 모두 데이트 4번·약속·결혼식·일상 대사가 있다', () => {
    expect(Object.keys(LOVE).sort()).toEqual(Object.keys(HEROINES).sort());
    for (const s of Object.values(LOVE)) { expect(s.dates).toHaveLength(4); for (const d of s.dates) { expect(d.lines.length).toBeGreaterThanOrEqual(3); expect(d.place.length).toBeGreaterThan(1); } expect(s.proposal.length).toBeGreaterThanOrEqual(4); expect(s.wedding.length).toBeGreaterThanOrEqual(4); expect(s.married.length).toBeGreaterThanOrEqual(5); }
  });
  it('15세 수위: 노출·성적 암시·외모 평가 표현이 없다', () => {
    const src = readFileSync(new URL('./love.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/키스|입맞춤|입술|가슴|허벅지|속옷|알몸|벗|침대|밤을 함께|몸매|섹시|야한|유혹|안아 줘|껴안/);
  });
  it('비용: 데이트 300, 반지 3,000, 결혼식 5,000이고 결혼 뒤에는 비용이 없다', () => {
    expect([0, 1, 2, 3].map(stepCost)).toEqual([DATE_COST, DATE_COST, DATE_COST, DATE_COST]); expect(stepCost(4)).toBe(RING_COST); expect(stepCost(5)).toBe(WEDDING_COST); expect(stepCost(STAGE.married)).toBe(0);
  });
});
