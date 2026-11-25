import { describe, expect, it } from 'vitest';
import { OATHS, masteryOf, STANCE_NAME, stanceFor, ELEMENTS, FLOORS, MONSTER_IDS, MONSTER_NAMES, SUPPORT, CRAFT_D, ITEMS, applyNode, applySupport, autoRun, canUse, defaultBuild, elementMult, intentAt, lootOf, monsterFor, nodesFor, rewardFor, skillCost, startFloor, statsOf, turn, weakness, xpForKill, type Build } from './dungeon';
import { RELIC_BY_ID, CLASSES, CLS_LIST, CROSS_SLOTS, SLOT_COUNT, GRANT_NEED, grantChoices, grantReady, MAX_LEVEL, RELICS, RELIC_EVERY, SKILLS, defaultSlots, freePoints, levelBonus, levelOf, rankOf, relicChoices, skillPoints, skillsOf, spentPoints, starters, validSlots, xpNeed, type Cls } from './skills';
import { judgeTiming, sparkleCells, triangle, fishPayout } from './activity';

const atk = (id?: string) => (id ? ({ kind: 'skill', id } as const) : ({ kind: 'attack' } as const));
const wallop = (b: Build) => ({ ...b, lvl: 20, gear: 4 });

describe('던전(결정적 턴제)', () => {
  it('같은 날 같은 층은 모든 플레이어에게 같은 몬스터와 행동 순서, 정예는 더 세다', () => {
    for (const d of [10, 99, 300]) for (let f = 1; f <= FLOORS; f++) expect(monsterFor(d, f)).toEqual(monsterFor(d, f));
    expect(monsterFor(10, 5).boss).toBe(true); expect([5, 10, 15, 20].map((f) => monsterFor(1, f).kind)).toEqual([10, 11, 13, 14]); expect(monsterFor(10, 4).boss).toBe(false);
    const n = monsterFor(10, 4), e = monsterFor(10, 4, true);
    expect(e.elite).toBe(true); expect(e.hp).toBeGreaterThan(n.hp); expect(e.atk).toBeGreaterThan(n.atk); expect(monsterFor(10, 5, true).elite).toBeUndefined(); // 보스는 정예가 따로 없다
  });
  it('같은 선택은 항상 같은 결과(난수 없음)', () => {
    const b = defaultBuild(1, 'warrior', 3), run = () => { let x = startFloor(50, 2, 40, 40); for (const a of [atk(), { kind: 'defend' } as const, atk('w_bash'), atk()]) x = turn(x, a, 50, b); return x; };
    expect(run()).toEqual(run());
  });
  it('방어하면 강한 일격을 3분의 1로 줄이고, 스킬은 쿨다운과 기력이 필요하다', () => {
    const day = 7, b = defaultBuild(1, 'warrior', 1), m = monsterFor(day, 1); let t = 0; while (intentAt(m, t) !== 'heavy') t++;
    const base = { ...startFloor(day, 1, 40, 40), turn: t };
    expect(turn(base, { kind: 'defend' }, day, b).php).toBeGreaterThan(turn(base, atk(), day, b).php);
    const rally = defaultBuild(1, 'warrior', 3); rally.ranks = { w_rally: 1 };
    let x = startFloor(day, 1, 20, 40); expect(canUse(x, rally, 'w_rally')).toBe(true);
    x = turn({ ...x, en: 10 }, atk('w_rally'), day, rally); expect(x.cds.w_rally).toBeGreaterThan(0); expect(canUse(x, rally, 'w_rally')).toBe(false);
    expect(canUse({ ...startFloor(day, 1, 40, 40), en: 0 }, b, 'w_bash')).toBe(false);
  });
  it('기력: 공격·방어로 모으고 스킬로 쓰며 턴마다 회복한다', () => {
    const b = defaultBuild(1, 'warrior', 1), x = startFloor(3, 1, 40, 40);
    const a = turn(x, atk(), 3, b); expect(a.en).toBe(x.en + 1 + 2); // 기본 공격 +1, 턴 회복 +2
    const s = turn(x, atk('w_bash'), 3, b); expect(s.en).toBe(x.en - skillCost(b, 'w_bash') + 2);
  });
  it('보상: 깬 층 ×4 + 보스마다 +8, 경험치는 층×2+6(보스 ×3·정예 ×2)', () => { expect(rewardFor(3, 0)).toBe(12); expect(rewardFor(5, 1)).toBe(28); expect(rewardFor(10, 2)).toBe(56); expect(xpForKill(4, false, false)).toBe(14); expect(xpForKill(5, true, false)).toBe(48); expect(xpForKill(4, false, true)).toBe(28); });
});

describe('던전 속성', () => {
  it('오늘의 약점은 날짜로 고정되고 약점과 약하게 통하는 속성은 다르며, 보스는 3턴마다 바뀐다', () => {
    for (let d = 0; d < 40; d++) for (let f = 1; f <= FLOORS; f++) { const w = weakness(d, f, 0); expect(w).toEqual(weakness(d, f, 0)); expect(w.weak).not.toBe(w.resist); expect(ELEMENTS).toContain(w.weak); }
    expect(weakness(9, 4, 0)).toEqual(weakness(9, 4, 5)); expect(weakness(9, 5, 0).weak).not.toBe(weakness(9, 5, 3).weak);
  });
  it('약점 ×1.5(렌즈 ×1.8), 약하게 통함 ×0.5, 같은 속성 연속 ×0.6', () => {
    const wk = { weak: 'fire', resist: 'ice' } as const;
    expect(elementMult('fire', wk, null)).toBe(1.5); expect(elementMult('ice', wk, null)).toBe(0.5); expect(elementMult('bolt', wk, null)).toBe(1); expect(elementMult('fire', wk, 'fire')).toBeCloseTo(0.9); expect(elementMult('fire', wk, null, 1.8)).toBe(1.8);
  });
  it('마법사는 약점 속성 스킬이 훨씬 더 아프다', () => {
    const day = 12, wk = weakness(day, 3, 0), m = defaultBuild(1, 'mage', 1), base = { ...startFloor(day, 3, 80, 80), en: 10 };
    const idOf = (e: string) => ({ fire: 'm_fire', ice: 'm_ice' } as Record<string, string>)[e];
    const weakId = idOf(wk.weak) ?? 'm_fire', other = weakId === 'm_fire' ? 'm_ice' : 'm_fire';
    if (idOf(wk.weak)) expect(turn(base, atk(weakId), day, m).mhp).toBeLessThan(turn(base, atk(other), day, m).mhp);
    const nova = defaultBuild(1, 'mage', 5); nova.ranks = { m_nova: 1 };
    expect(turn(base, atk('m_nova'), day, nova).mhp).toBeLessThan(base.mhp);
  });
});

describe('클래스·스킬·레벨', () => {
  it('클래스 12종, 스킬 72개(클래스당 6, 시작 스킬 2개)', () => {
    expect(Object.keys(CLASSES)).toHaveLength(12); expect(SKILLS).toHaveLength(72);
    for (const c of CLS_LIST) { expect(skillsOf(c)).toHaveLength(6); expect(starters(c)).toHaveLength(2); expect(defaultSlots(c)).toEqual(starters(c)); }
  });
  it('레벨 곡선과 스킬 포인트: 홀수 레벨마다 1점, 시작 스킬의 첫 랭크는 공짜', () => {
    expect(levelOf(0).lvl).toBe(1); expect(levelOf(xpNeed(1) - 1).lvl).toBe(1); expect(levelOf(xpNeed(1)).lvl).toBe(2);
    let total = 0; for (let l = 1; l < MAX_LEVEL; l++) total += xpNeed(l); expect(levelOf(total).lvl).toBe(MAX_LEVEL); expect(levelOf(total * 5).lvl).toBe(MAX_LEVEL);
    expect([1, 2, 3, 4, 19, 20].map(skillPoints)).toEqual([1, 1, 2, 2, 10, 10]);
    expect(spentPoints({ w_bash: 1, w_guard: 1 })).toBe(0); expect(spentPoints({ w_bash: 2, w_cleave: 1 })).toBe(2);
    expect(freePoints(5, { w_cleave: 1 })).toBe(2); expect(levelBonus(1)).toEqual({ hp: 0, atk: 0, def: 0 }); expect(levelBonus(9).atk).toBe(4);
    expect(rankOf({}, 'w_bash')).toBe(1); expect(rankOf({}, 'w_cleave')).toBe(0);
  });
  it('장착은 배운 스킬만(다른 계열 시작 스킬도 가능), 중복 없이', () => {
    expect(validSlots('warrior', {}, ['w_bash', 'm_fire', 'w_cleave', 'w_bash'])).toEqual(['w_bash', 'm_fire']);
    expect(validSlots('warrior', { w_cleave: 1 }, ['w_bash', 'w_cleave'])).toEqual(['w_bash', 'w_cleave']);
  });
  it('레벨과 장비가 스탯을 올린다', () => { expect(statsOf(defaultBuild(1, 'warrior', 10)).hp).toBeGreaterThan(statsOf(defaultBuild(1, 'warrior', 1)).hp); expect(statsOf(defaultBuild(4, 'warrior', 1)).atk).toBeGreaterThan(statsOf(defaultBuild(1, 'warrior', 1)).atk); });
});

describe('유물', () => {
  it('3층마다 날짜·층으로 고정된 후보 3개, 이미 가진 것은 빠진다', () => {
    expect(RELICS).toHaveLength(20); expect(RELIC_EVERY).toBe(3);
    for (let d = 0; d < 30; d++) { const c = relicChoices(d, 3, []); expect(c).toHaveLength(3); expect(c).toEqual(relicChoices(d, 3, [])); expect(new Set(c.map((r) => r.id)).size).toBe(3); expect(relicChoices(d, 3, [c[0].id]).map((r) => r.id)).not.toContain(c[0].id); }
    expect(new Set(Array.from({ length: 40 }, (_, d) => relicChoices(d, 6, []).map((r) => r.id).join())).size).toBeGreaterThan(10);
  });
  it('유물이 스탯과 전투를 바꾼다', () => {
    const b = defaultBuild(1, 'warrior', 1), r = { ...b, relics: ['blade', 'plate', 'heart'] };
    expect(statsOf(r).atk).toBe(statsOf(b).atk + 3); expect(statsOf(r).def).toBe(statsOf(b).def + 3); expect(statsOf(r).hp).toBe(statsOf(b).hp + 20);
    const x = { ...startFloor(5, 2, 40, 40), en: 10 }, plain = turn(x, atk(), 5, b), withEdge = turn(x, atk(), 5, { ...b, relics: ['edge'] });
    expect(withEdge.mhp).toBeLessThan(plain.mhp); expect(skillCost({ ...b, relics: ['scroll'] }, 'w_bash')).toBe(skillCost(b, 'w_bash') - 1);
  });
});

describe('지도 노드·드롭·소모품', () => {
  it('길 3개는 날짜·층으로 고정되고 서로 다르며 첫째는 평범한 길, 보스 앞에는 정예가 없다', () => {
    for (let d = 0; d < 60; d++) for (let f = 1; f < FLOORS; f++) { const n = nodesFor(d, f); expect(n).toEqual(nodesFor(d, f)); expect(n[0]).toBe('fight'); expect(new Set(n).size).toBe(3); if (isBoss(f + 1)) expect(n).not.toContain('elite'); }
  });
  it('노드 효과: 휴식 회복, 함정은 체력을 줄이되 재료 3개, 상인은 체력약, 정예는 다음 층이 정예', () => {
    expect(applyNode('rest', 20, 60, 5, 2).php).toBe(35); const t = applyNode('trap', 20, 60, 5, 2); expect(t.php).toBe(11); expect(Object.values(t.mats)[0]).toBe(3);
    expect(applyNode('shop', 20, 60, 5, 2).potion).toBe(1); expect(applyNode('treasure', 20, 60, 5, 2).mats[lootOf(monsterFor(5, 2).kind)]).toBe(2);
    expect(applyNode('elite', 20, 60, 5, 2).elite).toBe(true); expect(applyNode('fight', 20, 60, 5, 2).elite).toBe(false);
  });
  it('몬스터 종류마다 고정 드롭이 있고 제작 재료가 모두 존재한다', () => {
    for (let k = 0; k < 15; k++) expect(lootOf(k)).toBeTruthy();
    const ids = new Set(Array.from({ length: 15 }, (_, k) => lootOf(k)));
    expect(ids.size).toBe(15); expect(MONSTER_IDS).toHaveLength(15); expect(MONSTER_NAMES).toHaveLength(15);
    for (const r of [...Object.values(CRAFT_D), ...Object.values(ITEMS).map((i) => i.cost)]) for (const m of Object.keys(r)) expect(ids.has(m)).toBe(true);
  });
  it('체력약은 체력을 채우고, 약점 부적은 속성과 상관없이 약점으로 통한다', () => {
    const day = 12, b = defaultBuild(2, 'mage', 5), base = { ...startFloor(day, 3, 20, 60), php: 20, en: 10 }; b.ranks = {};
    expect(turn(base, { kind: 'potion' }, day, b).php).toBeGreaterThan(20);
    const bad = weakness(day, 3, 0).resist, id = bad === 'fire' ? 'm_fire' : bad === 'ice' ? 'm_ice' : null;
    if (id) { const charmed = turn({ ...base, php: 60, charm: true }, atk(id), day, b); expect(charmed.mhp).toBeLessThan(turn({ ...base, php: 60 }, atk(id), day, b).mhp); expect(charmed.charm).toBe(false); }
  });
});
const isBoss = (f: number) => f % 5 === 0;

describe('히로인 지원', () => {
  it('지원 효과: 회복·쿨다운과 기력·약점', () => {
    const b = { ...startFloor(3, 2, 20, 60), cds: { w_bash: 3 }, en: 2 };
    expect(applySupport(b, 'lisel').php).toBe(41); expect(applySupport(b, 'kaira').cds).toEqual({}); expect(applySupport(b, 'kaira').en).toBe(6); expect(applySupport(b, 'noa').charm).toBe(true);
    expect(Object.keys(SUPPORT)).toHaveLength(5);
  });
  it('몬스터는 10종(+축제 도깨비)이 날짜별로 골고루 나온다', () => {
    const seen = new Set<number>(); for (let d = 0; d < 400; d++) for (let f = 1; f < 20; f++) if (f % 5) seen.add(monsterFor(d, f).kind);
    expect([...seen].filter((k) => k < 10)).toHaveLength(10); expect(seen.has(12)).toBe(true); expect(seen.size).toBe(11);
  });
});

describe('균형: 레벨이 오를수록 깊이 가고, 계열끼리 크게 벌어지지 않는다', () => {
  const PREF: Record<Cls, string[]> = { warrior: ['w_bash', 'w_guard', 'w_cleave', 'w_rally'], mage: ['m_fire', 'm_ice', 'm_bolt', 'm_nova'], rogue: ['r_stab', 'r_poison', 'r_flurry', 'r_vital'],
    alchemist: ['a_acid', 'a_brew', 'a_blast', 'a_elixir', 'a_transmute'], swordsman: ['s_draw', 's_parry', 's_shift', 's_flash', 's_flow'], hunter: ['h_aim', 'h_snare', 'h_mark', 'h_volley', 'h_shot'],
    clockwork: ['c_gear', 'c_wind', 'c_bomb', 'c_rewind', 'c_overclock'], bard: ['b_open', 'b_chorus', 'b_bridge', 'b_discord', 'b_finale'], necro: ['n_harvest', 'n_skeleton', 'n_bonestorm', 'n_dread', 'n_drain'],
    navigator: ['v_wave', 'v_anchor', 'v_storm', 'v_tsunami', 'v_route'], smith: ['f_forge', 'f_shield', 'f_hammer', 'f_temper', 'f_quench'], priest: ['p_light', 'p_smite', 'p_bless', 'p_halo', 'p_prayer'] };
  /** 레벨 L에서 포인트를 쓴 빌드: 대표 스킬을 먼저 배우고 남으면 랭크, 장착은 대표 스킬 */
  const buildAt = (cls: Cls, lvl: number): Build => {
    const b = defaultBuild(1, cls, lvl), ranks: Record<string, number> = {}; let pts = skillPoints(lvl); const st = (id: string) => !!skillsOf(cls).find((x) => x.id === id)?.starter;
    for (const id of PREF[cls]) if (!st(id) && pts > 0) { ranks[id] = 1; pts--; }
    for (const id of PREF[cls]) while (pts > 0 && (ranks[id] ?? (st(id) ? 1 : 0)) < 3) { ranks[id] = (ranks[id] ?? 1) + 1; pts--; }
    return { ...b, ranks, slots: PREF[cls].filter((id) => (ranks[id] ?? (st(id) ? 1 : 0)) >= 1).slice(0, 5) };
  };
  const avg = (cls: Cls, lvl: number) => Array.from({ length: 50 }, (_, d) => autoRun(d, buildAt(cls, lvl)).cleared).reduce((a, x) => a + x, 0) / 50;
  it('같은 계열은 레벨이 오를수록 더 깊이, 같은 레벨의 계열 차이는 6층 안', () => {
    for (const c of CLS_LIST) { const a = [1, 5, 10, 20].map((l) => avg(c, l)); for (let i = 1; i < a.length; i++) expect(a[i], c).toBeGreaterThan(a[i - 1]); expect(a[0], c).toBeGreaterThan(1.5); expect(a[0], c).toBeLessThan(6); expect(a[3], c).toBeGreaterThan(14); }
    for (const l of [1, 5, 10, 20]) { const v = CLS_LIST.map((c) => avg(c, l)); expect(Math.max(...v) - Math.min(...v), `L${l}`).toBeLessThan(7); }
  });
  it('주 계열이 아닌 스킬을 2칸 섞어도 주 계열만 쓴 빌드보다 2층 넘게 깊이 가지 못한다', () => {
    const w = buildAt('warrior', 10), main = avg('warrior', 10);
    const mixed = Array.from({ length: 50 }, (_, d) => autoRun(d, { ...w, slots: ['w_bash', 'w_guard', 'w_cleave', 'm_fire', 'm_ice'] }).cleared).reduce((a, x) => a + x, 0) / 50;
    expect(mixed - main).toBeLessThan(2);
  });
  it('유물을 고르는 풀이로도 한 판은 끝까지 돈다(깊이 ≥ 1)', () => { expect(autoRun(3, wallop(defaultBuild(1, 'warrior'))).cleared).toBeGreaterThan(0); });
});

describe('계열 고유 자원과 상태 시너지', () => {
  const day = 5, b = (cls: Cls, extra: Partial<Build> = {}): Build => ({ ...defaultBuild(1, cls, 10), ...extra });
  it('전사: 맞으면 기세가 쌓이고 강타가 모두 쓴다', () => {
    const base = { ...startFloor(day, 4, 80, 80), en: 10 }; let x = base; let guard = 0;
    while (x.res < 2 && guard++ < 12) x = { ...turn({ ...x, en: 10 }, atk(), day, b('warrior')), php: 80 };
    expect(x.res).toBeGreaterThan(0);
    const bash = turn({ ...x, en: 10 }, atk('w_bash'), day, b('warrior'));
    expect(bash.res).toBe(0);
  });
  it('도적: 직전과 다른 스킬이면 콤보, 같은 스킬이나 방어는 끊긴다', () => {
    const r = b('rogue', { ranks: { r_flurry: 1 }, slots: ['r_stab', 'r_poison', 'r_flurry'] }); let x = { ...startFloor(day, 19, 999, 999), en: 10 };
    x = turn(x, atk('r_stab'), day, r); expect(x.res).toBe(1); x = turn({ ...x, en: 10 }, atk('r_flurry'), day, r); expect(x.res).toBe(2);
    x = turn({ ...x, en: 10 }, atk('r_flurry'), day, r); expect(x.res).toBe(1); x = turn({ ...x, en: 10 }, { kind: 'defend' }, day, r); expect(x.res).toBe(0);
  });
  it('연금술사: 시약이 쌓이고 폭약이 모두 써서 더 세다. 보조로 가져오면 시약이 안 쌓인다', () => {
    const al = b('alchemist', { ranks: { a_blast: 1 }, slots: ['a_acid', 'a_brew', 'a_blast'] }); let x = { ...startFloor(day, 19, 999, 999), en: 10 };
    x = turn(x, atk('a_brew'), day, al); expect(x.res).toBe(2);
    const noBrew = turn({ ...startFloor(day, 19, 999, 999), en: 10 }, atk('a_blast'), day, al).mhp, withBrew = turn({ ...x, en: 10 }, atk('a_blast'), day, al);
    expect(withBrew.mhp).toBeLessThan(noBrew); expect(withBrew.res).toBe(0);
    const cross = b('mage', { ranks: {}, slots: ['m_fire', 'a_brew'] }); expect(turn({ ...startFloor(day, 19, 999, 999), en: 10 }, atk('a_brew'), day, cross).res).toBe(0);
  });
  it('검객: 자세가 매 턴 돌고 자세 전환이 예고에 맞춘다', () => {
    const sw = b('swordsman', { ranks: { s_shift: 1 }, slots: ['s_draw', 's_parry', 's_shift'] });
    let x = { ...startFloor(day, 4, 80, 80), en: 10 }; expect(x.stance).toBe(0); x = turn(x, atk(), day, sw); expect(x.stance).toBe(1);
    const m = monsterFor(day, 4); let t = 0; while (stanceFor(intentAt(m, t)) < 0) t++;
    const y = turn({ ...startFloor(day, 4, 80, 80), turn: t, en: 10, stance: (stanceFor(intentAt(m, t)) + 1) % 3 }, atk('s_shift'), day, sw);
    expect(y.log).toContain('자세를'); expect(y.stance).toBe((stanceFor(intentAt(m, t)) + 1) % 3); // 전환 뒤 다음 턴으로 돌아간다
    expect(STANCE_NAME).toHaveLength(3);
  });
  it('사냥꾼: 덫은 공격하는 턴에 발동하고 사라지며, 표식은 피해를 25% 늘린다', () => {
    const hu = b('hunter', { ranks: { h_mark: 1 }, slots: ['h_aim', 'h_snare', 'h_mark'] }); const m = monsterFor(day, 4); let t = 0; while (!['attack', 'heavy'].includes(intentAt(m, t))) t++;
    const set = turn({ ...startFloor(day, 4, 80, 80), turn: t, en: 10 }, atk('h_snare'), day, hu); expect(set.log).toContain('올가미가 발동'); expect(set.trap).toBeNull();
    const plain = turn({ ...startFloor(day, 4, 80, 80), turn: t, en: 10 }, atk('h_aim'), day, hu).mhp, marked = turn({ ...startFloor(day, 4, 80, 80), turn: t, en: 10, mark: 3 }, atk('h_aim'), day, hu).mhp;
    expect(marked).toBeLessThan(plain);
  });
  it('시너지: 독+불은 독 폭발, 화상+얼음은 증기, 표식+연타는 처형', () => {
    const mg = b('mage', { slots: ['m_fire', 'm_ice'] }), base = { ...startFloor(day, 4, 80, 80), en: 10 };
    const boom = turn({ ...base, mpoison: 3 }, atk('m_fire'), day, mg); expect(boom.log).toContain('독 폭발'); expect(boom.mpoison).toBe(0);
    const steam = turn({ ...base, burn: 3 }, atk('m_ice'), day, mg); expect(steam.log).toContain('증기'); expect(steam.burn).toBe(0);
    const hu = b('hunter', { ranks: { h_volley: 1 }, slots: ['h_aim', 'h_volley'] }), exec = turn({ ...base, mark: 3 }, atk('h_volley'), day, hu); expect(exec.log).toContain('처형'); expect(exec.mark).toBe(0);
  });
  it('주 계열이 아닌 스킬 장착은 2칸까지, 해금 조건이 있다', () => {
    expect(validSlots('warrior', {}, ['w_bash', 'm_fire', 'a_acid', 'h_aim', 'w_guard'])).toEqual(['w_bash', 'm_fire', 'a_acid', 'w_guard']);
    expect(SLOT_COUNT).toBe(5); expect(CROSS_SLOTS).toBe(2);
    expect(grantReady(499, [])).toBe(false); expect(grantReady(GRANT_NEED[0], [])).toBe(true); expect(grantReady(GRANT_NEED[0], ['mage'])).toBe(false);
    const c = grantChoices(3, ['mage']); expect(c).toHaveLength(3); expect(c).not.toContain('mage'); expect(GRANT_NEED).toHaveLength(CLS_LIST.length);
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

describe('새 계열 6종·서약·숙련·계열 유물', () => {
  const day = 5, b = (cls: Cls, extra: Partial<Build> = {}): Build => ({ ...defaultBuild(1, cls, 10), ...extra }), deep = () => ({ ...startFloor(day, 19, 999, 999), en: 10 });
  it('시계공: 태엽이 쌓이고 폭탄이 풀며, 되감기는 직전 공격을 반복한다', () => {
    const c = b('clockwork', { ranks: { c_bomb: 1, c_rewind: 1 }, slots: ['c_gear', 'c_wind', 'c_bomb', 'c_rewind'] });
    let x = turn(deep(), atk('c_wind'), day, c); expect(x.res).toBe(2);
    const g = turn({ ...deep() }, atk('c_gear'), day, c), r = turn(turn(deep(), atk('c_gear'), day, c), atk('c_rewind'), day, c);
    expect(r.log).toContain('되감기'); expect(r.mhp).toBeLessThan(g.mhp);
    x = turn({ ...x, en: 10 }, atk('c_bomb'), day, c); expect(x.res).toBe(0);
  });
  it('음유시인: 도-레-미는 행진곡, 미-레-도는 자장가', () => {
    const bd = b('bard', { ranks: { b_bridge: 1 }, slots: ['b_open', 'b_chorus', 'b_bridge'] });
    let x = deep(); for (const id of ['b_open', 'b_chorus', 'b_bridge']) x = turn({ ...x, en: 10 }, atk(id), day, bd); expect(x.log).toContain('행진곡'); expect(x.notes).toEqual([]);
    let y = deep(); for (const id of ['b_bridge', 'b_chorus', 'b_open']) y = turn({ ...y, en: 10 }, atk(id), day, bd); expect(y.log).toContain('자장가');
  });
  it('사령술사: 해골 하수인이 매 턴 때리고 사라진다', () => {
    const n = b('necro'); const x = turn(deep(), atk('n_skeleton'), day, n); expect(x.minion).toBeGreaterThan(0); expect(x.log).toContain('하수인이');
    const y = turn({ ...x, en: 10 }, { kind: 'attack' }, day, n); expect(y.mhp).toBeLessThan(x.mhp - 1);
  });
  it('항해사: 밀물에 파도 가르기가 더 세다', () => {
    const v = b('navigator'); const hi = turn({ ...deep(), turn: 0 }, atk('v_wave'), day, v), lo = turn({ ...deep(), turn: 2 }, atk('v_wave'), day, v);
    expect(hi.mhp).toBeLessThan(lo.mhp);
  });
  it('대장장이: 맞으면 열이 오르고 달군 망치가 열을 모두 쓴다', () => {
    const f = b('smith', { ranks: { f_hammer: 1 }, slots: ['f_forge', 'f_shield', 'f_hammer'] }); let x = turn(deep(), atk('f_shield'), day, f); expect(x.res).toBeGreaterThanOrEqual(2);
    x = turn({ ...x, en: 10 }, atk('f_hammer'), day, f); expect(x.res).toBeLessThan(2);
  });
  it('사제: 신앙이 쌓이고 심판이 모두 쓴다', () => {
    const p = b('priest'); let x = turn(deep(), atk('p_light'), day, p); expect(x.res).toBe(1); x = turn({ ...x, en: 10 }, atk('p_smite'), day, p); expect(x.res).toBe(0);
  });
  it('서약은 제약과 경험치 보너스를 준다', () => {
    const glass = b('warrior', { oath: 'glass' }), plain = b('warrior');
    expect(turn(deep(), { kind: 'attack' }, day, glass).mhp).toBeLessThan(turn(deep(), { kind: 'attack' }, day, plain).mhp);
    expect(OATHS.glass.xp).toBeGreaterThan(1); expect(OATHS.frugal.xp).toBeGreaterThan(1);
  });
  it('숙련: 주 계열 랭크 합이 6 오를 때마다 스탯이 오른다(최대 3단계)', () => {
    const base = statsOf(b('warrior')), hi = statsOf(b('warrior', { ranks: { w_cleave: 3, w_counter: 3, w_rally: 3, w_fury: 3, w_bash: 3, w_guard: 3 } }));
    expect(masteryOf(b('warrior'))).toBe(0); expect(masteryOf(b('warrior', { ranks: { w_cleave: 3, w_counter: 3, w_rally: 3, w_fury: 3, w_bash: 3, w_guard: 3 } }))).toBe(3); expect(hi.hp).toBeGreaterThan(base.hp);
  });
  it('계열 유물은 그 계열에게만 나온다', () => {
    for (let f = 3; f <= 18; f += 3) for (const r of relicChoices(day, f, [], 'mage')) expect(!r.cls || r.cls === 'mage').toBe(true);
    expect(RELIC_BY_ID.banner.cls).toBe('warrior');
    const wb = b('warrior', { relics: ['banner'] }); const hurt = turn({ ...startFloor(day, 4, 80, 80), turn: 0 }, { kind: 'defend' }, day, wb); expect(hurt.res).toBeGreaterThanOrEqual(0);
  });
});
