import { describe, expect, it } from 'vitest';
import { WORLD_VERSION, marketAtDay } from '../src/world';

// 골든 값: 이 테스트가 깨졌다면 세계(과거 시세)가 바뀐 것이다. 의도한 변경이면 WORLD_VERSION을 올리고 값을 갱신한다
const GOLDEN: Record<number, Record<number, { prices: Record<string, number>; index: number }>> = {
  13: {
    100: { prices: { IRON: 114.32, MERC: 60.27, GRAN: 70.88, RNCH: 34.07, TOWR: 166.03, ALCH: 104.3, SHIP: 105.28, SPCE: 140.28, BANK: 218.79, INSR: 251.94 }, index: 1043.5 },
    300: { prices: { IRON: 123.28, MERC: 51.19, GRAN: 51.96, RNCH: 28.1, TOWR: 148.18, ALCH: 76.72, SHIP: 73.16, SPCE: 128.19, BANK: 191.25, INSR: 191.39 }, index: 864.87 },
  },
  12: {
    100: { prices: { IRON: 94.89, MERC: 46.24, GRAN: 107.14, RNCH: 54.57, TOWR: 167.92, ALCH: 95.79, SHIP: 201.95, SPCE: 107.56, BANK: 255.63, INSR: 231.76 }, index: 1139.43 },
    300: { prices: { IRON: 124.25, MERC: 69.49, GRAN: 107.33, RNCH: 26.32, TOWR: 173.36, ALCH: 88.67, SHIP: 105.44, SPCE: 101.94, BANK: 242.61, INSR: 219.92 }, index: 1035.07 },
  },
  11: {
    100: { prices: {IRON: 192.76, MERC: 20.19, GRAN: 77.61, RNCH: 80.02, TOWR: 138.54, ALCH: 131.29, SHIP: 240.53, SPCE: 265.52, BANK: 394.37, INSR: 357.16}, index: 1552.51 },
    300: { prices: {IRON: 379.99, MERC: 29.13, GRAN: 158.37, RNCH: 99.19, TOWR: 194.62, ALCH: 214.19, SHIP: 557.29, SPCE: 280.4, BANK: 1133.32, INSR: 583.62}, index: 2666.09 },
  },
  10: {
    100: { prices: {IRON: 161.69, MERC: 17.23, GRAN: 74.03, RNCH: 70.19, TOWR: 121.49, ALCH: 107.25, SHIP: 229.98, SPCE: 253.44, BANK: 351, INSR: 319.6}, index: 1395.46 },
    300: { prices: {IRON: 258.34, MERC: 18.34, GRAN: 130.63, RNCH: 78.39, TOWR: 138.57, ALCH: 164.45, SHIP: 496.25, SPCE: 180.55, BANK: 727.28, INSR: 535.03}, index: 2053.14 },
  },
  9: {
    100: { prices: {IRON: 155.29, MERC: 16.42, GRAN: 70.79, RNCH: 67.17, TOWR: 116.36, ALCH: 102.65, SHIP: 220.13, SPCE: 242.68, BANK: 336.09, INSR: 305.87}, index: 1336.04 },
    300: { prices: {IRON: 234.12, MERC: 16.6, GRAN: 118.67, RNCH: 70.87, TOWR: 126, ALCH: 150.05, SHIP: 445.98, SPCE: 162.08, BANK: 657.12, INSR: 485.83}, index: 1858.00 },
  },
  8: {
    100: { prices: {IRON: 148.86, MERC: 19.1, GRAN: 69.76, RNCH: 62.82, TOWR: 134.1, ALCH: 97.07, SHIP: 226.73, SPCE: 221.7, BANK: 337.57, INSR: 298.22}, index: 1301.89 },
    300: { prices: {IRON: 200.38, MERC: 18.64, GRAN: 106.12, RNCH: 63.21, TOWR: 152.42, ALCH: 141.2, SHIP: 369.81, SPCE: 154.92, BANK: 602.25, INSR: 454.06}, index: 1694.93 },
  },
  7: {
    100: { prices: {IRON: 179.25, MERC: 22.93, GRAN: 84.16, RNCH: 75.67, TOWR: 160.85, ALCH: 116.42, SHIP: 272.97, SPCE: 268.31, BANK: 409.68, INSR: 359.84}, index: 1569.88 },
    300: { prices: {IRON: 216.42, MERC: 20.18, GRAN: 116.91, RNCH: 65.37, TOWR: 160.05, ALCH: 148.56, SHIP: 414.69, SPCE: 170.82, BANK: 657.35, INSR: 489.28}, index: 1836.57 },
  },
  6: {
    100: { prices: {IRON: 164.71, MERC: 20.91, GRAN: 77.15, RNCH: 69.47, TOWR: 147.54, ALCH: 106.63, SHIP: 250.09, SPCE: 245.75, BANK: 375.03, INSR: 330.03}, index: 1439.08 },
    300: { prices: {IRON: 175.31, MERC: 16.41, GRAN: 96.04, RNCH: 53.08, TOWR: 131.69, ALCH: 121.88, SHIP: 332.03, SPCE: 137.06, BANK: 533.91, INSR: 400.81}, index: 1492.65 },
  },
  5: {
    100: { prices: {IRON: 157.22, MERC: 39.95, GRAN: 64.53, RNCH: 54.51, TOWR: 176.64, ALCH: 105.9, SHIP: 163.1, SPCE: 197.21, BANK: 424.06, INSR: 257.38}, index: 1268.69 },
    300: { prices: {IRON: 116.75, MERC: 36.33, GRAN: 75.95, RNCH: 46.14, TOWR: 284.77, ALCH: 71.9, SHIP: 307.62, SPCE: 153.85, BANK: 624.26, INSR: 147.22}, index: 1288.60 },
  },
  4: {
    100: { prices: { IRON: 154.23, MERC: 39.2, GRAN: 63, RNCH: 53.29, TOWR: 165.11, ALCH: 99.01, SHIP: 158.96, SPCE: 192.23, BANK: 382.8, INSR: 232.37 }, index: 1206.92 },
    300: { prices: { IRON: 144.04, MERC: 45.04, GRAN: 69.17, RNCH: 42.07, TOWR: 263.19, ALCH: 66.94, SHIP: 223.69, SPCE: 111.61, BANK: 461.26, INSR: 108.62 }, index: 1101.11 },
  },
  3: {
    100: { prices: { IRON: 159.64, MERC: 40.62, GRAN: 60.88, RNCH: 51.44, TOWR: 161.11, ALCH: 96.42, SHIP: 153.59, SPCE: 185.8, BANK: 371.78, INSR: 225.9 }, index: 1181.53 },
    300: { prices: { IRON: 133.81, MERC: 41.73, GRAN: 78.54, RNCH: 47.83, TOWR: 268.09, ALCH: 68, SHIP: 248.27, SPCE: 123.62, BANK: 441.86, INSR: 103.99 }, index: 1141.83 },
  },
};

describe('세계 버전 고정', () => {
  it('같은 버전이면 과거 시세가 항상 같다', () => {
    for (const [d, g] of Object.entries(GOLDEN[WORLD_VERSION])) {
      const m = marketAtDay(Number(d));
      for (const [id, p] of Object.entries(g.prices)) expect(m.prices[id]).toBeCloseTo(p, 1);
      expect(m.index[m.index.length - 1]).toBeCloseTo(g.index, 1);
    }
  });
});
