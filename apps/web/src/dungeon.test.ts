import { describe, expect, it } from 'vitest';
import { MONSTER_IDS, MONSTER_NAMES, SUPPORT, applySupport, CRAFT_D, ITEMS, applyRoom, lootOf, roomsFor, ELEMENTS, FLOORS, elementMult, weakness, SKILL_CD, autoRun, maxFloorFor, bestAction, intentAt, monsterFor, playerStats, rewardFor, startFloor, turn } from './dungeon';
import { judgeTiming, sparkleCells, triangle, fishPayout } from './activity';

describe('던전(결정적 턴제)', () => {
  it('같은 날 같은 층은 모든 플레이어에게 같은 몬스터와 행동 순서', () => {
    for (const d of [10, 99, 300]) for (let f = 1; f <= FLOORS; f++) expect(monsterFor(d, f)).toEqual(monsterFor(d, f));
    expect(monsterFor(10, 5).boss).toBe(true); expect(monsterFor(10, FLOORS).boss).toBe(true); expect(monsterFor(10, 4).boss).toBe(false);
    expect(JSON.stringify(monsterFor(10, 2))).not.toBe(JSON.stringify(monsterFor(11, 2)));
  });
  it('같은 선택은 항상 같은 결과(난수 없음)', () => {
    const run = () => { let b = startFloor(50, 2, 40, 40); for (const a of ['attack', 'defend', 'skill', 'attack'] as const) b = turn(b, a, 50, 1); return b; };
    expect(run()).toEqual(run());
  });
  it('방어하면 강한 일격을 3분의 1로 줄이고, 강타는 쿨다운 동안 일반 공격이 된다', () => {
    const day = 7, floor = 1, m = monsterFor(day, floor);
    let t = 0; while (intentAt(m, t) !== 'heavy') t++;
    const base = { ...startFloor(day, floor, 40, 40), turn: t };
    expect(turn(base, 'defend', day, 1).php).toBeGreaterThan(turn(base, 'attack', day, 1).php);
    const cd = turn({ ...base, cd: SKILL_CD }, 'skill', day, 1);
    expect(cd.mhp).toBe(turn(base, 'attack', day, 1).mhp);
  });
  it('장비가 좋을수록 더 깊이 간다(예고를 읽는 풀이 기준, 보스까지 가능)', () => {
    const avg = (g: number) => Array.from({ length: 120 }, (_, d) => autoRun(d, g).cleared).reduce((a, b) => a + b, 0) / 120;
    expect(avg(1)).toBeLessThan(avg(2)); expect(avg(2)).toBeLessThan(avg(4)); expect(avg(4)).toBeLessThan(avg(6));
    for (const g of [1, 2, 3, 4, 5, 6]) expect(Math.max(...Array.from({ length: 60 }, (_, d) => autoRun(d, g).cleared))).toBeLessThanOrEqual(maxFloorFor(g));
    expect(playerStats(4).hp).toBeGreaterThan(playerStats(1).hp);
  });
  it('보상: 깬 층 ×4 + 보스마다 +8(하루 상한 40은 store가 막는다)', () => { expect(rewardFor(3, 0)).toBe(12); expect(rewardFor(5, 1)).toBe(28); expect(rewardFor(10, 2)).toBe(56); expect(bestAction(startFloor(1, 1, 40, 40), 1)).toBeTruthy(); });
});

describe('던전 속성', () => {
  it('오늘의 약점은 날짜로 고정되고 약점과 약하게 통하는 속성은 다르며, 보스는 3턴마다 바뀐다', () => {
    for (let d = 0; d < 40; d++) for (let f = 1; f <= FLOORS; f++) { const w = weakness(d, f, 0); expect(w).toEqual(weakness(d, f, 0)); expect(w.weak).not.toBe(w.resist); expect(ELEMENTS).toContain(w.weak); }
    expect(weakness(9, 4, 0)).toEqual(weakness(9, 4, 5)); // 일반 몬스터는 고정
    expect(weakness(9, 5, 0).weak).not.toBe(weakness(9, 5, 3).weak); // 보스는 변한다
  });
  it('약점 ×1.5, 약하게 통함 ×0.5, 같은 속성 연속 ×0.6', () => {
    const wk = { weak: 'fire', resist: 'ice' } as const;
    expect(elementMult('fire', wk, null)).toBe(1.5); expect(elementMult('ice', wk, null)).toBe(0.5); expect(elementMult('bolt', wk, null)).toBe(1);
    expect(elementMult('fire', wk, 'fire')).toBeCloseTo(0.9); expect(elementMult('bolt', wk, 'fire')).toBe(1);
  });
  it('약점 속성으로 때리면 더 아프다', () => {
    const day = 12, wk = weakness(day, 3, 0), other = ELEMENTS.find((e) => e !== wk.weak && e !== wk.resist)!;
    const base = startFloor(day, 3, 60, 60);
    expect(turn(base, 'attack', day, 2, wk.weak).mhp).toBeLessThan(turn(base, 'attack', day, 2, other).mhp);
    expect(turn(base, 'attack', day, 2, other).mhp).toBeLessThan(turn(base, 'attack', day, 2, wk.resist).mhp);
  });
});

describe('던전 방·드롭·소모품', () => {
  it('방 두 개는 날짜로 고정되고 서로 다르다', () => {
    for (let d = 0; d < 60; d++) for (let f = 1; f < FLOORS; f++) { const r = roomsFor(d, f); expect(r).toEqual(roomsFor(d, f)); expect(r[0]).not.toBe(r[1]); }
  });
  it('방 효과: 휴식은 회복, 함정은 체력을 줄이되 재료 3개, 상인은 체력약 1개', () => {
    expect(applyRoom('rest', 20, 60, 5, 2).php).toBe(35);
    const t = applyRoom('trap', 20, 60, 5, 2); expect(t.php).toBe(11); expect(Object.values(t.mats)[0]).toBe(3);
    expect(applyRoom('shop', 20, 60, 5, 2).potion).toBe(1);
    expect(applyRoom('treasure', 20, 60, 5, 2).mats[lootOf(monsterFor(5, 2).kind)]).toBe(2);
  });
  it('몬스터 종류마다 고정 드롭이 있고 제작 재료가 모두 존재한다', () => {
    for (let k = 0; k < 15; k++) expect(lootOf(k)).toBeTruthy();
    const ids = new Set(Array.from({ length: 15 }, (_, k) => lootOf(k)));
    expect(ids.size).toBe(15); expect(MONSTER_IDS).toHaveLength(15); expect(MONSTER_NAMES).toHaveLength(15);
    for (const r of [...Object.values(CRAFT_D), ...Object.values(ITEMS).map((i) => i.cost)]) for (const m of Object.keys(r)) expect(ids.has(m)).toBe(true);
  });
  it('체력약은 체력을 40% 채우고, 약점 부적은 속성과 상관없이 약점으로 통한다', () => {
    const day = 12, base = { ...startFloor(day, 3, 60, 60), php: 20 };
    expect(turn(base, 'potion', day, 2).php).toBeGreaterThan(20);
    const wk = weakness(day, 3, 0), bad = wk.resist;
    expect(turn({ ...base, php: 60, charm: true }, 'attack', day, 2, bad).mhp).toBeLessThan(turn({ ...base, php: 60 }, 'attack', day, 2, bad).mhp);
    expect(turn({ ...base, php: 60, charm: true }, 'attack', day, 2, bad).charm).toBe(false);
  });
});

describe('히로인 지원', () => {
  it('지원 효과: 회복·강타 즉시·약점', () => {
    const b = { ...startFloor(3, 2, 20, 60), cd: 3 };
    expect(applySupport(b, 'lisel').php).toBe(41); expect(applySupport(b, 'kaira').cd).toBe(0); expect(applySupport(b, 'noa').charm).toBe(true);
    expect(Object.keys(SUPPORT)).toHaveLength(5);
  });
  it('몬스터는 10종(+축제 도깨비)이 날짜별로 골고루 나오고 보스는 5·10·15·20층', () => {
    const seen = new Set<number>(); for (let d = 0; d < 400; d++) for (let f = 1; f < 20; f++) if (f % 5) seen.add(monsterFor(d, f).kind);
    expect([...seen].filter((k) => k < 10)).toHaveLength(10); expect(seen.has(12)).toBe(true); expect(seen.size).toBe(11); expect([5, 10, 15, 20].map((f) => monsterFor(1, f).kind)).toEqual([10, 11, 13, 14]);
  });
});

describe('몬스터 특수 행동', () => {
  const find = (kinds: number[], intent: string) => { for (let d = 0; d < 400; d++) for (let f = 1; f <= FLOORS; f++) { const m = monsterFor(d, f); if (kinds.includes(m.kind)) { const t = m.pattern.indexOf(intent as never); if (t >= 0) return { d, f, t }; } } throw new Error('없음'); };
  it('독버섯·거미는 독을 뿜고, 방어하면 막는다. 독은 매 턴 체력을 깎다 끝난다', () => {
    const { d, f, t } = find([6, 8], 'poison');
    const b = { ...startFloor(d, f, 60, 60), turn: t };
    expect(turn(b, 'attack', d, 2).poison).toBe(3);
    expect(turn(b, 'defend', d, 2).poison).toBe(0);
    let x = turn(b, 'attack', d, 2); const hp0 = x.php; x = { ...x, mhp: 999 }; const next = turn(x, 'defend', d, 2);
    expect(next.php).toBeLessThan(hp0); expect(next.poison).toBe(2);
  });
  it('돌 골렘·보스는 반격 자세에서 때리면 내가 다치고, 방어하면 다치지 않는다', () => {
    const { d, f, t } = find([5, 10, 11], 'counter');
    const b = { ...startFloor(d, f, 60, 60), turn: t };
    expect(turn(b, 'attack', d, 3).log).toContain('반격');
    expect(turn(b, 'defend', d, 3).php).toBe(60);
  });
});

describe('미니게임 판정', () => {
  it('게이지는 0~1을 왕복하고 가운데 구간일수록 높은 점수', () => {
    expect(triangle(0)).toBe(0); expect(triangle(1)).toBe(1); expect(triangle(2)).toBe(0); expect(triangle(1.5)).toBe(0.5);
    expect(judgeTiming(0.5, 0.15)).toBe(3); expect(judgeTiming(0.56, 0.15)).toBe(2); expect(judgeTiming(0.63, 0.15)).toBe(1); expect(judgeTiming(0.9, 0.15)).toBe(0);
  });
  it('낚시는 점수 2 이상이면 값 전부, 아니면 절반이고 채집 반짝임은 날짜로 고정', () => {
    expect(fishPayout(25, 3)).toBe(25); expect(fishPayout(25, 2)).toBe(25); expect(fishPayout(25, 1)).toBe(12); expect(fishPayout(4, 0)).toBe(2);
    expect(sparkleCells(100, 1)).toEqual(sparkleCells(100, 1)); expect(new Set(sparkleCells(100, 1)).size).toBe(3);
  });
});
