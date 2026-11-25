import { beforeAll, describe, expect, it, vi } from 'vitest';
import { GRANT_NEED, grantChoices, CLS_LIST, type Cls } from './skills';
import { eventOf } from './events';
import { dividendPerShare, fantasyDate, isDividendDay, marketAtDay } from '@mana/engine';

// 브라우저 저장소를 흉내 낸다(persist가 import 시점에 읽는다)
const mem = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });

type Store = typeof import('./store');
let S: Store;
beforeAll(async () => { S = await import('./store'); });
const PAY = Array.from({ length: 365 }, (_, i) => i).find(isDividendDay)! + 365; // 두 번째 해의 첫 배당일

/** 앞으로 30일 안에 현재가보다 내려가는 (종목, 시작일)을 찾는다. 세계가 바뀌어도 시험이 깨지지 않게 데이터에서 고른다 */
function dipCase() {
  const long = marketAtDay(400);
  for (let day = 150; day < 360; day += 10) for (const id of Object.keys(long.prices)) {
    const h = long.history[id], low = Math.min(...h.slice(day + 1, day + 31));
    if (low < h[day] * 0.97) return { day, id, low: Math.ceil(low * 100) / 100, p0: h[day] };
  }
  throw new Error('내려가는 구간이 없다');
}
const setup = (over: Record<string, unknown>) => S.useGame.setState({ granted: true, cash: 1000, holdings: { BANK: { qty: 10, cost: 4000 } }, trades: [], achv: {}, bond: {}, ...over });

describe('배당 정산', () => {
  it('배당일이 되는 순간 가진 주식에 지급된다', () => {
    setup({ market: marketAtDay(PAY), paidDay: PAY - 1, skipDays: 0 });
    expect(S.useGame.getState().trades.some((t) => t.side === 'div')).toBe(false); // 배당일 당일엔 종가가 아직 없어 지급 전
    S.useGame.getState().fastForward(1);
    const g = S.useGame.getState();
    const per = dividendPerShare('BANK', PAY, marketAtDay(PAY).history.BANK[PAY]);
    expect(fantasyDate(PAY).day).toBe(30);
    expect(g.cash).toBeCloseTo(1000 + per * 10, 1);
    expect(g.trades.at(-1)).toMatchObject({ side: 'div', id: 'BANK', qty: 10 });
    expect(g.paidDay).toBe(PAY);
    expect(g.market.day).toBe(PAY + 1);
  });
  it('자리를 비운 사이의 배당일도 접속 때 한 번만 정산된다', () => {
    setup({ market: marketAtDay(PAY + 5), paidDay: PAY - 20, skipDays: 0 });
    S.useGame.getState().settleDividends();
    const once = S.useGame.getState();
    expect(once.trades.filter((t) => t.side === 'div').length).toBe(1);
    S.useGame.getState().settleDividends(); // 다시 불러도 중복 지급 없음
    expect(S.useGame.getState().cash).toBe(once.cash);
    expect(once.paidDay).toBe(PAY + 4);
  });
  it('주식이 없으면 지급이 없다', () => {
    setup({ holdings: {}, market: marketAtDay(PAY), paidDay: PAY - 3, skipDays: 0 });
    S.useGame.getState().settleDividends();
    expect(S.useGame.getState().cash).toBe(1000);
  });
});

describe('업적', () => {
  const base = { trades: [], holdings: {}, bond: {}, cash: 10000, market: marketAtDay(100) };
  const ok = (id: string, g: object) => S.ACHIEVEMENTS.find((a) => a.id === id)!.test({ ...base, ...g } as never);
  it('조건이 맞을 때만 달성된다', () => {
    expect(ok('first-trade', {})).toBe(false);
    expect(ok('first-trade', { trades: [{ day: 1, id: 'IRON', side: 'buy', qty: 1, price: 100 }] })).toBe(true);
    expect(ok('take-profit', { trades: [{ day: 1, id: 'IRON', side: 'sell', qty: 1, price: 100, pnl: -5 }] })).toBe(false);
    expect(ok('take-profit', { trades: [{ day: 1, id: 'IRON', side: 'sell', qty: 1, price: 100, pnl: 5 }] })).toBe(true);
    expect(ok('first-dividend', { trades: [{ day: 1, id: 'BANK', side: 'div', qty: 1, price: 1 }] })).toBe(true);
    expect(ok('meet-all', { bond: { a: { pts: 1, day: 1 }, b: { pts: 1, day: 1 } } })).toBe(false);
    expect(ok('bond-max', { bond: { a: { pts: 4, day: 1 } } })).toBe(true);
  });
  it('다섯 업종·다섯 길드 보유 판정', () => {
    const five = Object.fromEntries(['IRON', 'GRAN', 'TOWR', 'SHIP', 'BANK'].map((id) => [id, { qty: 1, cost: 1 }]));
    expect(ok('spread', { holdings: five })).toBe(true);
    expect(ok('all-sectors', { holdings: five })).toBe(true);
    expect(ok('all-sectors', { holdings: { IRON: { qty: 1, cost: 1 }, MERC: { qty: 1, cost: 1 }, GRAN: { qty: 1, cost: 1 }, RNCH: { qty: 1, cost: 1 }, BANK: { qty: 1, cost: 1 } } })).toBe(false);
  });
  it('checkAchievements는 새로 달성한 것만 기록한다', () => {
    setup({ trades: [{ day: 1, id: 'IRON', side: 'buy', qty: 1, price: 100 }], market: marketAtDay(120), paidDay: 120 });
    const first = S.useGame.getState().checkAchievements();
    expect(first).toContain('first-trade');
    expect(S.useGame.getState().checkAchievements()).toEqual([]);
    expect(S.useGame.getState().achv['first-trade']).toBe(120);
  });
  it('닉네임·거래 횟수 업적', () => {
    setup({ nick: '아리아', trades: Array.from({ length: 20 }, () => ({ day: 1, id: 'IRON', side: 'buy' as const, qty: 1, price: 100 })), market: marketAtDay(120), paidDay: 120 });
    const got = S.useGame.getState().checkAchievements();
    expect(got).toContain('named');
    expect(got).toContain('trades-20');
  });
  it('지정가 예약: 조건에 닿는 날 그날 시세로 체결되고, 한 번만 체결된다', () => {
    const { day, id, low, p0 } = dipCase(), m = marketAtDay(day);
    setup({ market: m, paidDay: day, skipDays: 0, cash: 100000, holdings: {}, orders: [] });
    expect(S.useGame.getState().placeOrder(id, 'buy', 3, p0 + 1)).toMatch(/낮은/);
    expect(S.useGame.getState().placeOrder(id, 'buy', 3, low)).toBeNull();
    S.useGame.getState().fastForward(30);
    const g = S.useGame.getState();
    expect(g.orders).toHaveLength(0);
    expect(g.holdings[id]?.qty).toBe(3);
    expect(g.trades.filter((t) => t.lim)).toHaveLength(1);
    expect(g.trades.find((t) => t.lim)!.price).toBeLessThanOrEqual(low);
  });
  it('가격 알림: 닿는 날 기록되고 사라진다(거래는 하지 않음)', () => {
    const { day, id, low, p0 } = dipCase(), m = marketAtDay(day);
    setup({ market: m, paidDay: day, skipDays: 0, cash: 1000, holdings: {}, orders: [], fired: [] });
    expect(S.useGame.getState().placeOrder(id, 'alert', 0, p0 + 5, false)).toMatch(/낮은/);
    expect(S.useGame.getState().placeOrder(id, 'alert', 0, low, false)).toBeNull();
    S.useGame.getState().fastForward(30);
    const g = S.useGame.getState();
    expect(g.fired).toHaveLength(1);
    expect(g.orders).toHaveLength(0);
    expect(g.cash).toBe(1000);
  });
  it('일일 의뢰: 하루 한 번만 답하고 정답이면 보상, 다음 날 초기화', async () => {
    const { questsFor, QUEST_REWARD } = await import('./quests');
    const m = marketAtDay(150), q = questsFor(m)[0];
    setup({ market: m, cash: 1000, quest: { day: -1, ans: {} }, questCorrect: 0, server: null });
    expect(S.useGame.getState().answerQuest(q.id, q.answer)).toBe(true);
    expect(S.useGame.getState().cash).toBe(1000 + QUEST_REWARD);
    expect(S.useGame.getState().answerQuest(q.id, q.answer)).toBeNull(); // 재답변 불가
    expect(S.useGame.getState().cash).toBe(1000 + QUEST_REWARD);
    const q2 = questsFor(m)[1];
    expect(S.useGame.getState().answerQuest(q2.id, (q2.answer + 1) % 4)).toBe(false);
    expect(S.useGame.getState().cash).toBe(1000 + QUEST_REWARD);
    setup({ market: marketAtDay(151) });
    expect(S.useGame.getState().quest.day).toBe(150);
  });
  it('연속 접속: 하루 걸러면 끊기고, 같은 날은 늘지 않으며, 연습 시간 중에는 세지 않는다', () => {
    setup({ market: marketAtDay(100), streak: { last: -1, n: 0 }, skipDays: 0 });
    S.useGame.getState().touchVisit();
    expect(S.useGame.getState().streak).toEqual({ last: 100, n: 1 });
    S.useGame.getState().touchVisit();
    expect(S.useGame.getState().streak.n).toBe(1);
    setup({ market: marketAtDay(101) }); S.useGame.getState().touchVisit();
    expect(S.useGame.getState().streak.n).toBe(2);
    setup({ market: marketAtDay(103) }); S.useGame.getState().touchVisit();
    expect(S.useGame.getState().streak.n).toBe(1);
    setup({ market: marketAtDay(104), skipDays: 3 }); S.useGame.getState().touchVisit();
    expect(S.useGame.getState().streak.last).toBe(103);
  });
  it('분기 목표: 채운 목표마다 칭호를 한 번만 주고, 셋을 모두 채우면 종합 칭호도 준다', async () => {
    const { quarterOf } = await import('./goals');
    const m = marketAtDay(100), q = quarterOf(100);
    const trades = [
      { day: 100, id: 'IRON', side: 'buy' as const, qty: 1, price: 100 }, { day: 100, id: 'BANK', side: 'buy' as const, qty: 1, price: 100 }, { day: 100, id: 'GRAN', side: 'buy' as const, qty: 1, price: 100 },
      { day: 100, id: 'IRON', side: 'div' as const, qty: 10, price: 5 },
    ];
    setup({ market: m, trades, qtalk: { key: q, n: 4 }, goalDone: [], titles: [], activeTitle: null });
    const a = S.useGame.getState().claimTitles();
    expect(a).toHaveLength(2); // 배당, 길드
    expect(S.useGame.getState().activeTitle).toBe(a[0]);
    expect(S.useGame.getState().claimTitles()).toEqual([]);
    S.useGame.setState({ qtalk: { key: q, n: 5 } });
    const b = S.useGame.getState().claimTitles();
    expect(b).toHaveLength(2); // 이야기 친구 + 종합 칭호
    expect(S.useGame.getState().titles).toHaveLength(4);
    S.useGame.getState().setTitle('없는 칭호');
    expect(S.useGame.getState().activeTitle).toBe(a[0]);
  });
  it('마을 기부: 단계마다 돈을 쓰고, 모자라면 거절하고, 상한을 넘지 않는다', () => {
    setup({ market: marketAtDay(100), cash: 2100, town: {}, spent: 0, server: null });
    expect(S.useGame.getState().donate('lamps')).toBeNull();            // 500
    expect(S.useGame.getState().cash).toBe(1600);
    expect(S.useGame.getState().donate('lamps')).toBeNull();            // 1500
    expect(S.useGame.getState().cash).toBe(100);
    expect(S.useGame.getState().spent).toBe(2000); // 영구 소비 합계
    expect(S.useGame.getState().donate('lamps')).toMatch(/모자라/);     // 4000 필요
    expect(S.useGame.getState().town.lamps).toBe(2);
    S.useGame.setState({ cash: 99999 });
    expect(S.useGame.getState().donate('lamps')).toBeNull();
    expect(S.useGame.getState().donate('lamps')).toMatch(/가장 높은/);
    expect(S.useGame.getState().donate('없는시설')).toMatch(/없는/);
    S.useGame.setState({ server: { url: 'x', token: 'y' } });
    expect(S.useGame.getState().donate('garden')).toMatch(/서버 모드/);
    S.useGame.setState({ server: null });
  });
  it('히로인 선물: 하루 한 번, 돈을 쓰고, 이야기 진행(pts)은 그대로', () => {
    setup({ market: marketAtDay(100), cash: 500, bond: { lisel: { pts: 2, day: 99 } }, server: null });
    expect(S.useGame.getState().giveGift('kaira')).toEqual({ error: '먼저 이야기를 나눠 보세요' });
    const r = S.useGame.getState().giveGift('lisel');
    expect('line' in r).toBe(true);
    expect(S.useGame.getState().cash).toBe(200); // 리젤 선물 300
    expect(S.useGame.getState().bond.lisel).toMatchObject({ pts: 2, gift: 100, gifts: 1 });
    expect(S.useGame.getState().giveGift('lisel')).toEqual({ error: '오늘은 이미 선물했어요' });
    setup({ market: marketAtDay(101), cash: 200, bond: { lisel: { pts: 2, day: 100, gift: 100, gifts: 1 } } });
    expect(S.useGame.getState().giveGift('lisel')).toMatchObject({ error: expect.stringContaining('모자라') }); // 200 < 300
  });
  it('구호 지원: 파산 직전에만, 한 달에 한 번 3,000 마나', () => {
    setup({ market: marketAtDay(100), cash: 300, holdings: {}, lastRelief: -9999, server: null });
    expect(S.useGame.getState().claimRelief()).toBe(true);
    expect(S.useGame.getState().cash).toBe(3300);
    expect(S.useGame.getState().claimRelief()).toBe(false);  // 총자산이 이미 3,000을 넘음
    S.useGame.setState({ cash: 10, lastRelief: 100 });
    expect(S.useGame.getState().claimRelief()).toBe(false);  // 쿨다운
    setup({ market: marketAtDay(131), cash: 10, holdings: {}, lastRelief: 100 });
    expect(S.useGame.getState().claimRelief()).toBe(true);
  });
  it('소품 구매: 가격만큼 쓰고 한 번만 살 수 있다', () => {
    setup({ market: marketAtDay(100), cash: 700, ownedProps: [], server: null });
    expect(S.useGame.getState().buyProp(1)).toMatch(/살 수 없는/);      // 기본 소품은 가게에 없다
    expect(S.useGame.getState().buyProp(11)).toBeNull();                // 고양이 귀 300
    expect(S.useGame.getState().cash).toBe(400);
    expect(S.useGame.getState().buyProp(11)).toMatch(/이미/);
    expect(S.useGame.getState().buyProp(16)).toMatch(/모자라/);         // 해적 두건 1000
    expect(S.useGame.getState().ownedProps).toEqual([11]);
  });
  it('한정 모양 구매(눈·머리·옷): 가격만큼 쓰고, 산 뒤에만 고를 수 있다', async () => {
    const { usableLooks } = await import('./scene/pixelHeroData');
    setup({ market: marketAtDay(100), cash: 1000, ownedLooks: [], spent: 0, server: null });
    expect(usableLooks('hair', S.useGame.getState().ownedLooks)).not.toContain(3);      // 포니테일은 잠겨 있다
    expect(S.useGame.getState().buyLook('hair', 0)).toMatch(/살 수 없는/);             // 무료 모양은 가게에 없다
    expect(S.useGame.getState().buyLook('hair', 4)).toBeNull();                         // 올림머리 800
    expect(S.useGame.getState().cash).toBe(200);
    expect(S.useGame.getState().spent).toBe(800);
    expect(usableLooks('hair', S.useGame.getState().ownedLooks)).toContain(4);
    expect(S.useGame.getState().buyLook('hair', 4)).toMatch(/이미/);
    expect(S.useGame.getState().buyLook('clothes', 4)).toMatch(/모자라/);              // 중갑 2000
  });
});

describe('마을 일과(채집·제작)', () => {
  it('채집은 곳마다 하루 한 번, 날이 바뀌면 다시 된다', () => {
    S.useGame.setState({ market: marketAtDay(100), gather: { day: -1, done: [] }, mats: {}, ownedProps: [], server: null });
    const g = () => S.useGame.getState();
    expect(g().gatherAt(0)).toContain('주웠어요');
    expect(g().gatherAt(0)).toContain('주웠어요'); // 횟수 제한 없음(재료만 쌓인다)
    expect(Object.values(g().mats).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(1);
    S.useGame.setState({ market: marketAtDay(101) });
    expect(g().gatherAt(0)).toContain('주웠어요');
  });
  it('수공품은 재료가 있어야 만들고 재료가 줄며 마나는 변하지 않는다', () => {
    S.useGame.setState({ cash: 500, mats: { plant: 3 }, ownedProps: [], server: null });
    expect(S.useGame.getState().craftProp(19)).toBe('재료가 모자라요');
    expect(S.useGame.getState().craftProp(17)).toBeNull();
    const g = S.useGame.getState();
    expect(g.mats.plant).toBe(0);
    expect(g.ownedProps).toContain(17);
    expect(g.cash).toBe(500);
    expect(g.craftProp(17)).toBe('이미 가지고 있어요');
  });
});

describe('마나 은행', () => {
  const base = { granted: true, cash: 10000, holdings: {}, trades: [], loan: null, server: null, spent: 0, orders: [], market: marketAtDay(200) };
  it('빌린 돈은 현금이 되고 총자산에서는 빚이 빠진다', () => {
    S.useGame.setState(base);
    expect(S.useGame.getState().borrowLoan(3000)).toBeNull();
    const g = S.useGame.getState();
    expect(g.cash).toBe(13000);
    expect(S.netWorth(g)).toBe(10000);
  });
  it('현금이 원금 아래로 내려가는 매수는 거절된다', () => {
    S.useGame.setState({ ...base, cash: 3000 + base.market.prices.BANK * 0.5, loan: { principal: 3000, cap: 3000, paidInterest: 0, paidDay: 200 } });
    const c0 = S.useGame.getState().cash;
    expect(S.useGame.getState().buy('BANK', 1)).toContain('아래로는 살 수 없어요');
    expect(S.useGame.getState().cash).toBe(c0);
  });
  it('날이 지나면 이자가 현금에서 나가고 영구 소비로 기록된다', () => {
    S.useGame.setState({ ...base, loan: { principal: 2000, cap: 2000, paidInterest: 0, paidDay: 197 } });
    S.useGame.getState().accrueLoan();
    const g = S.useGame.getState();
    expect(g.cash).toBe(10000 - 30); // 3일 × 10
    expect(g.spent).toBe(30);
    expect(g.loan?.paidDay).toBe(200);
  });
  it('갚으면 빚이 줄고 전부 갚으면 없어진다', () => {
    S.useGame.setState({ ...base, loan: { principal: 2000, cap: 2000, paidInterest: 0, paidDay: 200 } });
    expect(S.useGame.getState().repayLoan(2000)).toBeNull();
    expect(S.useGame.getState().loan).toBeNull();
    expect(S.useGame.getState().cash).toBe(8000);
  });
});

describe('납품·낚시', () => {
  const base = { granted: true, cash: 1000, server: null, spent: 0, earned: 0, mats: { plant: 10, fruit: 10, stone: 10 }, act: { day: -1, sold: 0, fished: 0, casts: 0, dove: 0, tries: 0 }, fishLog: {}, rod: 1, market: marketAtDay(300) };
  it('납품은 고정가이고 하루 30 마나까지만 받는다', () => {
    S.useGame.setState(base);
    expect(S.useGame.getState().sellMat('stone', 99)).toContain('24 마나'); // 8 × 3개 = 24 (4개면 32 > 30)
    expect(S.useGame.getState().sellMat('fruit', 99)).toContain('6 마나'); // 남은 6
    expect(S.useGame.getState().sellMat('plant', 99)).toBe('오늘 넘길 수 있는 몫을 다 채웠어요');
    const g = S.useGame.getState();
    expect(g.cash).toBe(1030); expect(g.earned).toBe(30);
    S.useGame.setState({ market: marketAtDay(301) });
    expect(S.useGame.getState().sellMat('plant', 1)).toContain('5 마나');
  });
  it('낚시는 횟수 제한이 없고 마나는 하루 상한까지만 earned에 쌓인다', () => {
    S.useGame.setState(base);
    for (let i = 0; i < 3; i++) expect(S.useGame.getState().fishCast()).toContain('마나');
    const a = S.useGame.getState();
    expect(a.earned).toBe(a.cash - 1000);
    for (let i = 0; i < 40; i++) S.useGame.getState().fishCast(); // 계속 던져도
    expect(S.useGame.getState().act.casts).toBe(43);
    expect(S.useGame.getState().act.fished).toBeLessThanOrEqual(40); // 하루에 받는 마나는 상한까지만
    expect(a.earned).toBeLessThanOrEqual(18); // 낚싯대 1단계는 1등급 물고기·게·새우만(3번이면 최대 18)
    expect(Object.values(a.fishLog).reduce((x, y) => x + y, 0)).toBe(3);
  });
  it('낚싯대는 마나를 영구히 쓰고 단계가 오른다', () => {
    S.useGame.setState({ ...base, cash: 700 });
    expect(S.useGame.getState().buyRod()).toBeNull();
    const g = S.useGame.getState();
    expect(g.rod).toBe(2); expect(g.cash).toBe(100); expect(g.spent).toBe(600);
    expect(g.buyRod()).toContain('마나가 모자라요');
  });
});

describe('던전', () => {
  const day = 300, base = { granted: true, cash: 0, server: null, spent: 0, earned: 0, act: { day: -1, sold: 0, fished: 0, casts: 0, dove: 0, tries: 0 }, gear: 1, market: marketAtDay(day) };
  it('몇 번이고 들어갈 수 있고, 마나는 그날 가장 좋은 기록만큼만 받는다', () => {
    S.useGame.setState(base);
    const g = () => S.useGame.getState();
    expect(g().startDive()).toBeNull();
    expect(g().finishDive(2, 0)).toContain('8 마나');
    expect(g().startDive()).toBeNull();
    expect(g().finishDive(1, 0)).toContain('이미 채웠어요'); // 첫 기록(2층)보다 낮으면 추가 없음
    expect(g().finishDive(3, 0)).toContain('4 마나'); // 3층 12 - 이미 받은 8
    expect(g().startDive()).toBeNull(); // 횟수 제한 없음(마나는 그날 최고 기록만큼만)
    expect(g().finishDive(3, 0)).toContain('이미 채웠어요');
    expect(g().cash).toBe(12);
    expect(g().earned).toBe(12);
  });
  it('보스까지 깨면 28마나, 하루 활동 합계 상한을 넘지 않는다', () => {
    S.useGame.setState({ ...base, act: { ...base.act, day, sold: 30, fished: 40, dove: 0 } });
    expect(S.useGame.getState().finishDive(5, 1)).toContain('28 마나'); // 합계 120 - 70 = 50 여유
    S.useGame.setState({ ...base, act: { ...base.act, day, sold: 60, fished: 40, dove: 0 } });
    expect(S.useGame.getState().finishDive(5, 1)).toContain('20 마나'); // 합계 120 - 100 = 20
  });
  it('장비를 올리면 영구 소비로 스탯이 오른다', () => {
    S.useGame.setState({ ...base, cash: 900 });
    expect(S.useGame.getState().buyGear()).toBeNull();
    const g = S.useGame.getState();
    expect(g.gear).toBe(2); expect(g.cash).toBe(100); expect(g.spent).toBe(800);
  });
});

describe('던전 재료·제작·도감', () => {
  const base = { granted: true, server: null, ownedProps: [] as number[], dlog: { seen: [] as number[], mats: {} as Record<string, number>, items: { potion: 0, charm: 0 } } };
  it('몬스터를 쓰러뜨리면 고정 재료가 쌓이고 도감에 등록된다', () => {
    S.useGame.setState(base);
    S.useGame.getState().dungeonCollect({ kind: 0 }); S.useGame.getState().dungeonCollect({ kind: 0 });
    const d = S.useGame.getState().dlog;
    expect(d.mats.jelly).toBe(2); expect(d.seen).toEqual([0]);
  });
  it('소모품은 재료로 만들고 3개까지, 쓰면 줄어든다', () => {
    S.useGame.setState({ ...base, dlog: { ...base.dlog, mats: { jelly: 10 } } });
    for (let i = 0; i < 3; i++) expect(S.useGame.getState().craftItem('potion')).toBeNull();
    expect(S.useGame.getState().craftItem('potion')).toContain('3개까지');
    expect(S.useGame.getState().dlog.mats.jelly).toBe(4);
    expect(S.useGame.getState().useItem('potion')).toBe(true);
    expect(S.useGame.getState().dlog.items.potion).toBe(2);
    expect(S.useGame.getState().craftItem('charm')).toBe('재료가 모자라요');
  });
  it('던전 소품은 재료로만 만들고 마나는 쓰지 않는다', () => {
    S.useGame.setState({ ...base, cash: 100, dlog: { ...base.dlog, mats: { jelly: 3 } } });
    expect(S.useGame.getState().craftDProp(20)).toBeNull();
    expect(S.useGame.getState().ownedProps).toContain(20);
    expect(S.useGame.getState().cash).toBe(100);
    expect(S.useGame.getState().craftDProp(21)).toBe('재료가 모자라요');
  });
});

describe('낚시: 생물·물건·상한 뒤 값', () => {
  const base = { granted: true, cash: 0, server: null, spent: 0, earned: 0, mats: {} as Record<string, number>, act: { day: -1, sold: 0, fished: 0, casts: 0, dove: 0, tries: 0 }, fishLog: {} as Record<string, number>, rod: 4, market: marketAtDay(300) };
  it('많이 던지면 물고기·생물·물건이 모두 걸리고 도감에 쌓인다', () => {
    S.useGame.setState(base);
    for (let i = 0; i < 120; i++) S.useGame.getState().fishCast(3);
    const keys = Object.keys(S.useGame.getState().fishLog);
    expect(keys.some((k) => k.startsWith('c:'))).toBe(true);
    expect(keys.some((k) => k.startsWith('i:'))).toBe(true);
    expect(keys.some((k) => /^(봄|여름|가을|겨울):/.test(k))).toBe(true);
    const m = S.useGame.getState().mats; expect((m.pearl ?? 0) + (m.coin ?? 0) + (m.shell ?? 0)).toBeGreaterThan(0);
  });
  it('물건은 마나를 주지 않고, 하루 40 마나를 넘으면 값의 4분의 1만 준다', () => {
    S.useGame.setState({ ...base, act: { ...base.act, day: 300, fished: 40 } });
    const c0 = S.useGame.getState().cash;
    for (let i = 0; i < 30; i++) S.useGame.getState().fishCast(3);
    const gained = S.useGame.getState().cash - c0;
    expect(gained).toBeGreaterThan(0); expect(gained).toBeLessThan(30 * 25 * 0.25 + 1); // 가장 비싼 값(25)의 4분의 1이 상한
    expect(S.useGame.getState().act.fished).toBe(40); // 상한 안의 몫은 늘지 않는다
  });
});

describe('마을 확장·내 상점', () => {
  const base = { granted: true, server: null, cash: 20000, spent: 0, town: {} as Record<string, number>, shop: null as { name: string; lv: number } | null };
  it('확장 시설과 상점은 누적 지출이 쌓여야 열린다', () => {
    S.useGame.setState(base);
    expect(S.useGame.getState().donate('market')).toContain('써야 열려요');
    expect(S.useGame.getState().openShop('은빛 상회')).toContain('써야 열려요');
    S.useGame.setState({ spent: 3000 });
    expect(S.useGame.getState().donate('market')).toBeNull();
    expect(S.useGame.getState().town.market).toBe(1);
    expect(S.useGame.getState().spent).toBe(5000);
  });
  it('가게는 개업·확장으로 마나를 영구히 쓰고 수입은 없다', () => {
    S.useGame.setState({ ...base, spent: 3000 });
    expect(S.useGame.getState().openShop('x')).toContain('2~10자');
    expect(S.useGame.getState().openShop('은빛 상회')).toBeNull();
    expect(S.useGame.getState().shop).toEqual({ name: '은빛 상회', lv: 1 });
    expect(S.useGame.getState().cash).toBe(16000);
    expect(S.useGame.getState().openShop('다른 가게')).toBe('이미 가게가 있어요');
    for (let i = 0; i < 3; i++) expect(S.useGame.getState().upgradeShop()).toBeNull();
    expect(S.useGame.getState().shop?.lv).toBe(4);
    expect(S.useGame.getState().upgradeShop()).toBe('가게를 더 키울 수 없어요');
    expect(S.useGame.getState().cash).toBe(20000 - 4000 - 2000 - 4000 - 6000);
  });
});

describe('히로인 인연', () => {
  const base = { granted: true, server: null, cash: 20000, spent: 0, love: null as null | { id: string; stage: number; day: number }, bond: { kaira: { pts: 8, day: 0 }, mira: { pts: 5, day: 0 } }, market: marketAtDay(300) };
  it('여덟 번째 이야기까지 들은 사람만 고를 수 있고, 한 명을 고르면 바꿀 수 없다', () => {
    S.useGame.setState(base);
    expect(S.useGame.getState().chooseLove('mira')).toContain('여덟 번째');
    expect(S.useGame.getState().chooseLove('kaira')).toBeNull();
    expect(S.useGame.getState().chooseLove('lisel')).toBe('이미 평생의 인연을 정했어요');
    expect(S.useGame.getState().love).toEqual({ id: 'kaira', stage: 0, day: -1 });
  });
  it('하루에 한 번, 데이트 4번 → 약속 → 결혼식 순서로 마나를 영구히 쓴다', () => {
    S.useGame.setState({ ...base, love: { id: 'kaira', stage: 0, day: -1 } });
    const day = (d: number) => S.useGame.setState({ market: marketAtDay(d) });
    for (let i = 0; i < 4; i++) { day(300 + i); const r = S.useGame.getState().loveStep(); expect('scene' in r).toBe(true); }
    expect(S.useGame.getState().love?.stage).toBe(4);
    expect(S.useGame.getState().cash).toBe(20000 - 4 * 300);
    const same = S.useGame.getState().loveStep(); expect('error' in same && same.error).toContain('오늘은 이미');
    day(310); expect('scene' in S.useGame.getState().loveStep()).toBe(true); // 약속
    day(311); expect('scene' in S.useGame.getState().loveStep()).toBe(true); // 결혼식
    expect(S.useGame.getState().love?.stage).toBe(6);
    expect(S.useGame.getState().spent).toBe(4 * 300 + 3000 + 5000);
    day(312); const done = S.useGame.getState().loveStep(); expect('error' in done && done.error).toBe('이미 함께 살고 있어요');
  });
  it('마나가 모자라면 진행하지 않는다', () => {
    S.useGame.setState({ ...base, cash: 100, love: { id: 'kaira', stage: 4, day: -1 } });
    const r = S.useGame.getState().loveStep(); expect('error' in r && r.error).toContain('마나가 모자라요'); expect(S.useGame.getState().love?.stage).toBe(4);
  });
});

describe('탈것', () => {
  const base = { granted: true, server: null, cash: 20000, spent: 0, mounts: [] as number[], mount: 0 };
  it('사면 마나를 영구히 쓰고 바로 타며, 산 것만 바꿔 탈 수 있다', () => {
    S.useGame.setState(base);
    expect(S.useGame.getState().buyMount(1)).toBeNull();
    expect(S.useGame.getState().mount).toBe(1); expect(S.useGame.getState().cash).toBe(17000); expect(S.useGame.getState().spent).toBe(3000);
    expect(S.useGame.getState().buyMount(1)).toBe('이미 가지고 있어요');
    S.useGame.getState().rideMount(2); expect(S.useGame.getState().mount).toBe(1); // 안 산 것은 못 탄다
    S.useGame.getState().rideMount(0); expect(S.useGame.getState().mount).toBe(0);
    S.useGame.getState().rideMount(1); expect(S.useGame.getState().mount).toBe(1);
  });
  it('마나가 모자라면 못 산다', () => { S.useGame.setState({ ...base, cash: 2999 }); expect(S.useGame.getState().buyMount(1)).toContain('마나가 모자라요'); expect(S.useGame.getState().mounts).toEqual([]); });
});

describe('생활 업적(마나 보상 없음)', () => {
  const ok = (id: string, g: object) => S.ACHIEVEMENTS.find((a) => a.id === id)!.test({ trades: [], holdings: {}, bond: {}, cash: 0, market: marketAtDay(100), ...g } as never);
  it('낚시·던전·제작·마을·인연·탈것 기록에서 달성된다', () => {
    expect(ok('life-fish', {})).toBe(false); expect(ok('life-fish', { fishLog: { 'c:crab': 1 } })).toBe(true);
    expect(ok('fish-book', { fishLog: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`k${i}`, 1])) })).toBe(false);
    expect(ok('fish-book', { fishLog: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`k${i}`, 1])) })).toBe(true);
    expect(ok('boss-king', { dlog: { seen: [1, 2], mats: {}, items: { potion: 0, charm: 0 } } })).toBe(false);
    expect(ok('boss-king', { dlog: { seen: [10], mats: {}, items: { potion: 0, charm: 0 } } })).toBe(true);
    expect(ok('craft-1', { ownedProps: [11] })).toBe(false); expect(ok('craft-1', { ownedProps: [17] })).toBe(true);
    expect(ok('my-shop', { shop: { name: 'a가게', lv: 1 } })).toBe(true); expect(ok('rider', { mounts: [1] })).toBe(true);
    expect(ok('married', { love: { id: 'noa', stage: 5, day: 1 } })).toBe(false); expect(ok('married', { love: { id: 'noa', stage: 6, day: 1 } })).toBe(true);
    expect(ok('town-grow', { town: { market: 1 } })).toBe(true); expect(ok('gear-max', { gear: 4 })).toBe(true); expect(ok('gear-max', { gear: 3 })).toBe(false); expect(ok('event-1', { events: ['1030:fest-0'] })).toBe(true); expect(ok('rod-max', { rod: 3 })).toBe(false);
  });
});

describe('오늘의 모험 목표 달성', () => {
  const day = 77, base = { granted: true, server: null, daily: { last: -1, n: 0 }, titles: [] as string[], activeTitle: null as string | null, act: { day, casts: 99, tries: 99, sold: 99, fished: 0, dove: 0 }, gather: { day, done: [] as number[], n: 99 }, bond: { noa: { pts: 1, day } }, market: marketAtDay(day) };
  it('모두 채운 날 하루가 늘고 하루에 한 번만 센다, 5일째에 칭호', () => {
    S.useGame.setState(base);
    expect(S.useGame.getState().checkDaily()).toBe(true);
    expect(S.useGame.getState().daily).toEqual({ last: day, n: 1 });
    expect(S.useGame.getState().checkDaily()).toBe(false);
    S.useGame.setState({ daily: { last: day - 1, n: 4 }, market: marketAtDay(day) });
    expect(S.useGame.getState().checkDaily()).toBe(true);
    expect(S.useGame.getState().titles).toContain('부지런한 모험가'); expect(S.useGame.getState().activeTitle).toBe('부지런한 모험가');
  });
  it('목표를 못 채우면 아무 일도 없다', () => {
    S.useGame.setState({ ...base, act: { ...base.act, casts: 0, tries: 0, sold: 0 }, gather: { day, done: [], n: 0 }, bond: {} });
    expect(S.useGame.getState().checkDaily()).toBe(false); expect(S.useGame.getState().daily.n).toBe(0);
  });
});

describe('튜토리얼 8단계 이전 저장', () => {
  it('7단계까지 마친 저장은 새 단계를 건너뛰고, 진행 중인 저장은 그대로다', () => {
    expect(S.migrateTutStep({ tutStep: 7 }, 21).tutStep).toBe(S.TUT_LEN);
    expect(S.migrateTutStep({ tutStep: 5 }, 21).tutStep).toBe(5);
    expect(S.migrateTutStep({ tutStep: 7 }, 22).tutStep).toBe(7); // 이미 새 버전이면 그대로(8단계를 하는 중)
    expect(S.TUT_LEN).toBe(8);
  });
});

describe('입문 과제 자동 완료', () => {
  const base = { granted: true, server: null, cash: 0, earned: 0, starter: 0, titles: [] as string[], activeTitle: null as string | null, trades: [{ day: 1, id: 'IRON', side: 'buy' as const, qty: 1, price: 1 }], questCorrect: 0, holdings: {}, orders: [], fishLog: {} as Record<string, number>, mats: {} as Record<string, number>, dlog: { seen: [] as number[], mats: {}, items: { potion: 0, charm: 0 } }, ownedProps: [] as number[], bond: {}, town: {}, shop: null };
  it('순서대로 하나씩, 기록이 맞으면 보상을 주고 다음 과제로 넘어간다', () => {
    S.useGame.setState(base);
    expect(S.useGame.getState().checkStarter()).toHaveLength(1);
    expect(S.useGame.getState().starter).toBe(1); expect(S.useGame.getState().cash).toBe(100); expect(S.useGame.getState().earned).toBe(100);
    S.useGame.setState({ questCorrect: 1, fishLog: { 'c:crab': 1 }, mats: { plant: 3 } });
    expect(S.useGame.getState().checkStarter()).toHaveLength(3); // 의뢰, 낚시, 채집이 한꺼번에 맞으면 같이 완료
    expect(S.useGame.getState().starter).toBe(4); expect(S.useGame.getState().cash).toBe(100 + 100 + 100 + 150);
    expect(S.useGame.getState().checkStarter()).toHaveLength(0); // 다음 과제(재료 넘기기)는 아직
  });
  it('모두 마치면 칭호를 받고 더는 반복되지 않는다', () => {
    S.useGame.setState({ ...base, starter: 12, shop: { lv: 1 } as never });
    expect(S.useGame.getState().checkStarter()).toHaveLength(1);
    expect(S.useGame.getState().titles).toContain('모험 입문자'); expect(S.useGame.getState().checkStarter()).toHaveLength(0);
  });
});

describe('주간 도전·이벤트 달성', () => {
  const day = 90, k = Math.floor(day / 6), base = { granted: true, server: null, titles: [] as string[], activeTitle: null as string | null, weekly: { stat: { k, casts: 99, gathers: 99, tries: 99, best: 9, seen0: 0 }, n: 0, last: -1 }, dlog: { seen: [0, 1, 2, 3], mats: {}, items: { potion: 0, charm: 0 } }, market: marketAtDay(day) };
  it('이번 주 세 가지를 모두 채우면 한 번 세고, 세 번째에 칭호', () => {
    S.useGame.setState(base);
    expect(S.useGame.getState().checkWeekly()).toBe(true);
    expect(S.useGame.getState().weekly.n).toBe(1); expect(S.useGame.getState().checkWeekly()).toBe(false);
    S.useGame.setState({ weekly: { ...base.weekly, n: 2, last: k - 1 } });
    expect(S.useGame.getState().checkWeekly()).toBe(true); expect(S.useGame.getState().titles).toContain('주간의 도전자');
  });
  it('기록이 모자라거나 주가 바뀌면 달성되지 않는다', () => {
    S.useGame.setState({ ...base, weekly: { ...base.weekly, stat: { ...base.weekly.stat, casts: 0, gathers: 0 } } });
    expect(S.useGame.getState().checkWeekly()).toBe(false);
    S.useGame.setState({ ...base, market: marketAtDay(day + 6) });
    expect(S.useGame.getState().checkWeekly()).toBe(false); expect(S.useGame.getState().weekly.stat.k).toBe(k + 1); // 새 주는 0부터
  });
  it('이벤트 날 과제를 모두 마치면 칭호를 받고 같은 이벤트는 한 번만', () => {
    const evDay = Array.from({ length: 365 }, (_, i) => i).find((d) => eventOf(d))!;
    S.useGame.setState({ granted: true, server: null, titles: [], activeTitle: null, events: [], act: { day: evDay, sold: 0, fished: 0, casts: 3, dove: 0, tries: 1 }, gather: { day: evDay, done: [], n: 3 }, market: marketAtDay(evDay) });
    expect(S.useGame.getState().checkEvent()).toBe(eventOf(evDay)!.name);
    expect(S.useGame.getState().titles[0]).toContain('손님'); expect(S.useGame.getState().checkEvent()).toBeNull();
  });
});

describe('던전 RPG: 클래스·스킬·경험치', () => {
  const base = { granted: true, server: null, market: marketAtDay(200), dun: { xp: 0, cls: null as null | Cls, ranks: {} as Record<string, number>, slots: [] as string[], swapDay: -1, owned: [] as Cls[], seed: 7, sub: null as Cls | null }, spent: 0 };
  it('성당: 문턱을 넘어야 직업을 받고, 후보 3개 중 하나만 고를 수 있으며 후보는 다시 열어도 같다', () => {
    S.useGame.setState(base);
    expect(S.useGame.getState().grantCls('mage')).toContain('아직'); expect(S.useGame.getState().chooseCls('mage')).toContain('성당');
    S.useGame.setState({ spent: GRANT_NEED[0] });
    const c = grantChoices(7, []); expect(c).toHaveLength(3); expect(grantChoices(7, [])).toEqual(c);
    const out = CLS_LIST.find((x) => !c.includes(x))!; expect(S.useGame.getState().grantCls(out)).toContain('후보');
    expect(S.useGame.getState().grantCls(c[0])).toBeNull(); expect(S.useGame.getState().dun.cls).toBe(c[0]); expect(S.useGame.getState().dun.owned).toEqual([c[0]]);
    expect(S.useGame.getState().grantCls(c[1])).toContain('아직'); // 다음 문턱은 더 높다
    S.useGame.setState({ spent: GRANT_NEED[1] }); const c2 = grantChoices(7, [c[0]]); expect(c2).not.toContain(c[0]);
    expect(S.useGame.getState().grantCls(c2[0])).toBeNull(); expect(S.useGame.getState().chooseCls(c[0])).toBeNull(); expect(S.useGame.getState().dun.cls).toBe(c[0]);
    expect(S.useGame.getState().chooseCls(c2[0])).toBeNull(); expect(S.useGame.getState().dun.cls).toBe(c2[0]);
  });
  it('스킬은 포인트가 있어야 배우고 강화하며, 랭크는 3까지, 배우면 빈 칸에 장착된다', () => {
    S.useGame.setState({ ...base, dlog: { seen: [], mats: {}, items: { potion: 0, charm: 0 } }, fishLog: {}, dun: { ...base.dun, cls: 'warrior', slots: ['w_bash', 'w_guard'], xp: 0, owned: ['warrior'] } });
    expect(S.useGame.getState().learnSkill('w_cleave')).toBe(null); // 레벨 1 = 1점
    expect(S.useGame.getState().dun.ranks.w_cleave).toBe(1); expect(S.useGame.getState().dun.slots).toContain('w_cleave');
    expect(S.useGame.getState().learnSkill('w_rally')).toContain('포인트가 없어요');
    expect(S.useGame.getState().learnSkill('a_blast')).toContain('받지 못한'); // 성당에서 받지 않은 직업
    S.useGame.setState({ dun: { ...S.useGame.getState().dun, xp: 100000 } }); // 레벨 20 = 10점
    for (let i = 0; i < 2; i++) expect(S.useGame.getState().learnSkill('w_cleave')).toBeNull();
    expect(S.useGame.getState().learnSkill('w_cleave')).toBe('이미 가장 높은 랭크예요');
  });
  it('장착 토글은 5칸까지(주 계열 밖은 2칸), 경험치는 쌓인다', () => {
    S.useGame.setState({ ...base, dun: { ...base.dun, cls: 'warrior', owned: ['warrior'], ranks: { w_cleave: 1, w_counter: 1, w_rally: 1 }, slots: ['w_bash', 'w_guard'] } });
    S.useGame.getState().toggleSlot('w_cleave'); S.useGame.getState().toggleSlot('w_counter'); S.useGame.getState().toggleSlot('w_rally');
    expect(S.useGame.getState().dun.slots).toHaveLength(5); S.useGame.getState().toggleSlot('w_bash'); expect(S.useGame.getState().dun.slots).not.toContain('w_bash');
    S.useGame.getState().addXp(30); S.useGame.getState().addXp(-5); expect(S.useGame.getState().dun.xp).toBe(30);
  });
});

describe('던전 RPG: 부 직업', () => {
  it('성당에서 부 직업을 켜고 끌 수 있고, 주 직업과 같거나 받지 않은 직업은 안 된다', () => {
    S.useGame.setState({ granted: true, server: null, dun: { xp: 0, cls: 'warrior', ranks: {}, slots: ['w_bash', 'w_guard'], swapDay: -1, owned: ['warrior', 'mage'], seed: 7, sub: null }, spent: 0 });
    expect(S.useGame.getState().setSub('mage')).toContain('이상 쓰면'); S.useGame.setState({ spent: 5000 });
    expect(S.useGame.getState().setSub('warrior')).toContain('켤 수 없는'); expect(S.useGame.getState().setSub('rogue')).toContain('켤 수 없는');
    expect(S.useGame.getState().setSub('mage')).toBeNull(); S.useGame.getState().toggleSlot('m_fire'); S.useGame.getState().toggleSlot('r_stab');
    expect(S.useGame.getState().dun.slots).toEqual(['w_bash', 'w_guard', 'm_fire']);
    expect(S.useGame.getState().setSub(null)).toBeNull(); expect(S.useGame.getState().dun.slots).toEqual(['w_bash', 'w_guard']); // 끄면 부 직업 스킬이 빠진다
    S.useGame.getState().setSub('mage'); S.useGame.getState().chooseCls('mage'); expect(S.useGame.getState().dun.sub).toBeNull(); // 주 직업이 되면 부 직업에서 빠진다
  });
});

describe('던전 RPG: 받은 직업끼리 교차 장착', () => {
  const base = { granted: true, server: null, market: marketAtDay(200), dlog: { seen: [] as number[], mats: {}, items: { potion: 0, charm: 0 } }, fishLog: {}, dun: { xp: 100000, cls: 'warrior' as Cls, owned: ['warrior', 'mage', 'alchemist'] as Cls[], seed: 7, sub: 'mage' as Cls | null, ranks: {} as Record<string, number>, slots: ['w_bash', 'w_guard'] as string[], swapDay: -1 } };
  it('다른 계열의 스킬도 배워 장착하되 주 계열이 아닌 스킬은 2칸까지', () => {
    S.useGame.setState(base);
    S.useGame.getState().toggleSlot('m_fire'); S.useGame.getState().toggleSlot('m_ice'); S.useGame.getState().toggleSlot('r_stab');
    expect(S.useGame.getState().dun.slots.filter((id) => !id.startsWith('w_'))).toEqual(['m_fire', 'm_ice']); // 셋째 교차 스킬은 들어가지 않는다
    expect(S.useGame.getState().learnSkill('m_bolt')).toBeNull(); expect(S.useGame.getState().dun.ranks.m_bolt).toBe(1);
  });
  it('계열을 바꿔도 기존 장착 중 새 주 계열 기준으로 교차 2칸만 남는다', () => {
    S.useGame.setState({ ...base, dun: { ...base.dun, slots: ['w_bash', 'w_guard', 'm_fire', 'm_ice'] } });
    S.useGame.getState().chooseCls('alchemist');
    const sl = S.useGame.getState().dun.slots; expect(sl.filter((id) => !id.startsWith('a_')).length).toBeLessThanOrEqual(2); expect(sl.length).toBeLessThanOrEqual(5);
  });
});
