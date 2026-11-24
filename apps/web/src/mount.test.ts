import { expect, it } from 'vitest';
import { MAX_MOUNT, MOUNT_PRICE, MOUNT_SPEED } from './mount';
it('탈것은 비쌀수록 빠르지만 걷기 속도의 2배를 넘지 않는다', () => {
  expect(MOUNT_PRICE).toHaveLength(MAX_MOUNT + 1); expect(MOUNT_SPEED).toHaveLength(MAX_MOUNT + 1); expect(MOUNT_SPEED[0]).toBe(1);
  for (let k = 1; k <= MAX_MOUNT; k++) { expect(MOUNT_SPEED[k]).toBeGreaterThan(MOUNT_SPEED[k - 1]); expect(MOUNT_PRICE[k]).toBeGreaterThan(MOUNT_PRICE[k - 1]); expect(MOUNT_SPEED[k]).toBeLessThan(2); }
});
