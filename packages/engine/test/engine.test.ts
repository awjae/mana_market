import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, createMarket, nextDay, step, type EngineConfig, type MarketState } from '../src';

const run = (seed: number, days: number, cfg = DEFAULT_CONFIG) => {
  let s = createMarket(seed, cfg);
  for (let i = 0; i < days; i++) s = nextDay(s, cfg);
  return s;
};
const returns = (s: MarketState) =>
  Object.values(s.history).flatMap((h) => h.slice(1).map((p, i) => p / h[i] - 1));

/** 노이즈·이벤트를 끈 설정 */
const quiet: EngineConfig = {
  ...DEFAULT_CONFIG,
  drift: 0, marketVol: 0, sectorVol: 0, maxDailyMove: 0.5,
  stocks: DEFAULT_CONFIG.stocks.map((s) => ({ ...s, idioVol: 0 })),
  eventChance: { stock: 0, sector: 0, kingdom: 0 },
};
const withEffect = (schedule: number[], magnitude: number) => ({
  ...createMarket(1, quiet),
  effects: [{ eventId: 'x', stockIds: ['IRON'], magnitude, schedule, age: -1 }], // 다음 날 schedule[0]부터 적용
});
const iron = (s: MarketState) => s.history.IRON;
const ret = (s: MarketState, i: number) => iron(s)[i] / iron(s)[i - 1] - 1;

describe('결정성', () => {
  it('같은 시드면 같은 결과, 다른 시드면 다른 결과', () => {
    expect(run(42, 100)).toEqual(run(42, 100));
    expect(run(42, 100).prices).not.toEqual(run(43, 100).prices);
  });
  it('step은 입력 상태를 변경하지 않는다', () => {
    const s = run(1, 5);
    const copy = structuredClone(s);
    step(s, 123);
    expect(s).toEqual(copy);
  });
});

describe('가격 안정성 (20 시드 × 365일)', () => {
  const states = Array.from({ length: 20 }, (_, i) => run(i + 1, 365));
  it('0 이하가 되거나 무한 상승하지 않는다', () => {
    for (const s of states)
      for (const stock of DEFAULT_CONFIG.stocks) {
        const ratio = s.prices[stock.id] / stock.startPrice;
        expect(s.prices[stock.id]).toBeGreaterThanOrEqual(DEFAULT_CONFIG.priceFloor);
        expect(Number.isFinite(ratio)).toBe(true);
        expect(ratio).toBeLessThan(20);
      }
  });
  it('일일 변동은 상한을 넘지 않는다', () => {
    const max = Math.max(...states.flatMap((s) => returns(s).map(Math.abs)));
    expect(max).toBeLessThanOrEqual(DEFAULT_CONFIG.maxDailyMove + 0.001);
  });
  it('일일 변동률 분포가 그럴듯하다', () => {
    const r = states.flatMap(returns);
    const mean = r.reduce((a, b) => a + b, 0) / r.length;
    const sd = Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length);
    const big = r.filter((x) => Math.abs(x) > 0.1).length / r.length;
    expect(Math.abs(mean)).toBeLessThan(0.003);
    expect(sd).toBeGreaterThan(0.01);
    expect(sd).toBeLessThan(0.05); // 가상 자산이라 변동성을 크게 둔다(v9)
    expect(big).toBeLessThan(0.045); // ±10% 초과는 드물어야 함(v9·v11에서 변동성을 키웠다)
  });
});

describe('이벤트 충격', () => {
  it('여진: 1 → .5 → .25 배로 이어지고 이후 사라진다', () => {
    let s = withEffect([1, 0.5, 0.25], 0.1);
    for (let i = 0; i < 4; i++) s = nextDay(s, quiet);
    expect(ret(s, 1)).toBeCloseTo(0.1, 2);
    expect(ret(s, 2)).toBeCloseTo(0.05, 2);
    expect(ret(s, 3)).toBeCloseTo(0.025, 2);
    expect(ret(s, 4)).toBeCloseTo(0, 5);
    expect(s.effects).toHaveLength(0);
  });
  it('과잉 반응: 급락 뒤 일부 되돌림, 순효과는 여전히 음수', () => {
    let s = withEffect([1.6, -0.5, -0.3], -0.06);
    for (let i = 0; i < 3; i++) s = nextDay(s, quiet);
    expect(ret(s, 1)).toBeLessThan(-0.09);
    expect(ret(s, 2)).toBeGreaterThan(0);
    expect(ret(s, 3)).toBeGreaterThan(0);
    expect(iron(s)[3]).toBeLessThan(iron(s)[0]);
    expect(iron(s)[3]).toBeGreaterThan(iron(s)[1]);
  });
  const festivalOnly: EngineConfig = {
    ...quiet,
    eventChance: { stock: 0, sector: 0, kingdom: 1 },
    templates: quiet.templates.filter((t) => t.id === 'kingdom_festival').map((t) => ({ ...t, rumorChance: 0 })),
  };
  it('공시의 첫 충격은 공시가 보이는 날의 시가에 이미 반영된다', () => {
    const s1 = nextDay(createMarket(1, festivalOnly), festivalOnly);
    expect(s1.news[0].kind).toBe('disclosure');
    expect(s1.opens.IRON[1]).toBeGreaterThan(120);
    expect(s1.prices.IRON).toBeGreaterThan(120);
  });
  it('여진은 크기는 그대로이고 방향이 반반이다', () => {
    let up = 0, down = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const e = nextDay(createMarket(seed, festivalOnly), festivalOnly).effects[0];
      const tpl = festivalOnly.templates[0].schedule;
      expect(e.schedule[0]).toBe(tpl[0]);
      e.schedule.slice(1).forEach((v, i) => { expect(Math.abs(v)).toBeCloseTo(Math.abs(tpl[i + 1])); if (v * tpl[i + 1] > 0) up++; else down++; });
    }
    expect(up / (up + down)).toBeGreaterThan(0.4); expect(up / (up + down)).toBeLessThan(0.6);
  });
});

describe('소문', () => {
  const festival = DEFAULT_CONFIG.templates.find((t) => t.id === 'kingdom_festival')!;
  const rumorCfg = (rumorAccuracy: number): EngineConfig => ({
    ...quiet,
    eventChance: { stock: 0, sector: 0, kingdom: 1 },
    templates: [{ ...festival, rumorChance: 1, rumorAccuracy, rumorLead: [2, 2] }],
  });
  const kinds = (cfg: EngineConfig, days: number) => {
    let s = createMarket(1, cfg);
    const out: string[][] = [];
    for (let i = 0; i < days; i++) out.push((s = nextDay(s, cfg)).news.map((n) => n.kind));
    return out;
  };
  it('맞는 소문은 lead일 뒤 공시로 이어진다', () => {
    const k = kinds(rumorCfg(1), 4);
    expect(k[0]).toEqual(['rumor']);
    expect(k[2]).toContain('disclosure');
  });
  it('틀린 소문은 공시로 이어지지 않는다', () => {
    expect(kinds(rumorCfg(0), 10).flat()).not.toContain('disclosure');
  });
});

describe('업종 영향', () => {
  it('전쟁: 무기 업종 상승, 해운 하락 (농업은 방향이 갈릴 수 있다)', () => {
    const war = DEFAULT_CONFIG.templates.find((t) => t.id === 'kingdom_war')!;
    const cfg: EngineConfig = {
      ...quiet,
      eventChance: { stock: 0, sector: 0, kingdom: 1 },
      templates: [{ ...war, rumorChance: 0 }],
    };
    const start = createMarket(1, cfg), s = nextDay(start, cfg);
    expect(s.prices.IRON).toBeGreaterThan(start.prices.IRON);
    expect(s.prices.SHIP).toBeLessThan(start.prices.SHIP);
  });
});

import { TEMPLATES as TPL } from '../src/data';
describe('이벤트 템플릿 정의', () => {
  it('id가 중복되지 않는다(중복 정의는 확률을 몰래 바꾼다)', () => {
    const ids = TPL.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('업종 이벤트는 호재와 악재가 모두 있다', () => {
    for (const sec of DEFAULT_CONFIG.sectors.map((s) => s.id)) {
      const mine = TPL.filter((t) => t.scope === 'sector' && t.sectors?.includes(sec));
      if (!mine.length) continue;
      expect(mine.some((t) => t.tone === 'good') && mine.some((t) => t.tone === 'bad'), sec).toBe(true);
    }
  });
});
