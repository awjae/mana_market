import { describe, expect, it } from 'vitest';
import { RELIEF_BELOW, RELIEF_COOLDOWN, reliefDue } from './relief';

describe('구호 지원', () => {
  it('총자산이 기준 아래이고 쿨다운이 지났을 때만', () => {
    expect(reliefDue(RELIEF_BELOW - 1, 100, -9999)).toBe(true);
    expect(reliefDue(RELIEF_BELOW, 100, -9999)).toBe(false);
    expect(reliefDue(500, 100, 100 - RELIEF_COOLDOWN + 1)).toBe(false);
    expect(reliefDue(500, 100, 100 - RELIEF_COOLDOWN)).toBe(true);
  });
});
