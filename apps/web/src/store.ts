import { cleanNick, ranking, validNick } from './social';
import { weatherKind } from './calendar';
import { call, type ServerConn, type ServerMe } from './serverClient';
import { josa } from './josa';
import { DAILY_TITLES, allDailyDone } from './daily';
import { STARTER, STARTER_TITLE } from './starter';
import { CLS_LIST, MAX_RANK, SKILL_BY_ID, SUB_NEED, grantChoices, grantReady, defaultSlots, freePoints, levelOf, rankOf as skillRank, validSlots, SLOT_COUNT, type Cls } from './skills';
import { specialOf } from './special';
import { EVENT_TASKS, eventOf, eventTitle } from './events';
import { WEEKLY_TITLES, freshWeek, weekOf, weeklyGoals, type WeekStat } from './weekly';
import { MAX_MOUNT, MOUNT_PRICE } from './mount';
import { LOVE, LOVE_NEED_PTS, STAGE, stepCost, type Scene } from './love';
import { CRAFT_D, ITEMS, ITEM_LIMIT, MONSTER_NAMES, lootOf, rewardFor, type ItemId } from './dungeon';
import { ACTIVITY_CAP, DIVE_CAP, FISH_OVER_RATE, KEEP_ITEMS, catchOf, letterOf, GEAR_PRICE, MAX_GEAR, fishPayout, FISH_CAP, FISH_NAMES, MAX_ROD, ROD_PRICE, SELL_CAP, SELL_PRICE, fishKey } from './activity';
import { CRAFT, RARE, SPOTS, rareFind, matName, yieldOf, type MatKind } from './gather';
import { QUEST_REWARD, questsFor } from './quests';
import { monthKey } from './recap';
import { allTitle, goalsFor, quarterOf } from './goals';
import { HEROINES } from './scene/heroines';
import { LOOK_PRICE, PROP_PRICE, lookKey, type LookKind } from './scene/pixelHeroData';
import { RELIEF_AMOUNT, reliefDue } from './relief';
import { FACILITIES, MAX_TIER, SHOP_MAX, SHOP_NEED, SHOP_PRICES, cleanShop, validShop } from './scene/townFx';
import { accrue, borrow, fantasyDate, repay, type Loan, DEFAULT_CONFIG, MAX_ORDERS, slotIndexAt, buyShares, dayIndexAt, liveMarket, marketAtDay, nextDay, round2, sellShares, settleDays as payDividends, type Fired, type Holding, type MarketState, type Order, type Trade } from '@mana/engine';
import { create } from 'zustand';
import { DEFAULT_LOOK, type Look } from './scene/pixelHeroData';
import { persist } from 'zustand/middleware';

export const START_CASH = 30000; // 스토리에서 왕실이 내려 주는 첫 밑천
export const TUT_LEN = 8;
/** 저장 버전이 오르며 달라진 튜토리얼 단계를 맞춘다(이미 마친 사람은 새 단계를 건너뛴다) */
export function migrateTutStep(o: Record<string, unknown>, version: number) {
  if (version < 4 && Number(o.tutStep) >= 6) o.tutStep = TUT_LEN;
  if (version < 22 && Number(o.tutStep) >= 7) o.tutStep = TUT_LEN; // 7단계(말걸기)까지 마친 사람은 새 8단계(생활 탭)를 건너뛴다
  return o;
} // 튜토리얼 단계 수 (tutStep >= TUT_LEN 이면 끝)

/** 현실의 오늘(KST 기준)이 게임의 며칠인지 */
export const todayIdx = () => dayIndexAt(Date.now());

export type { Holding, Trade, Order, Fired } from '@mana/engine';
export { ORDER_DAYS, MAX_ORDERS } from '@mana/engine';

const newSeed = () => Math.floor(Math.random() * 1_000_000_000) + 1;
/** 저장에서 받은 직업을 읽는다(옛 저장은 지금 직업 하나를 이미 받은 것으로 친다) */
const ownedOf = (d: { cls?: unknown; owned?: unknown }): Cls[] => [...new Set([...(Array.isArray(d.owned) ? d.owned : []), d.cls].filter((c): c is Cls => CLS_LIST.includes(c as Cls)))];
/** 부 직업은 받은 직업이고 주 직업과 달라야 한다 */
const subOf = (d: { cls?: unknown; sub?: unknown; owned?: unknown }): Cls | null => { const o = ownedOf(d); return CLS_LIST.includes(d.sub as Cls) && o.includes(d.sub as Cls) && d.sub !== d.cls ? (d.sub as Cls) : null; };
const withFired = <T extends { fired: Fired[] }>(old: Fired[], r: T) => ({ ...r, fired: [...old, ...r.fired].slice(-20) });

/** 업적: 샌드박스에서 해 볼 만한 목표. 조건은 저장된 상태만으로 판단한다 */
export interface Achievement { id: string; name: string; desc: string; test: (g: Pick<Game, 'trades' | 'holdings' | 'bond' | 'cash' | 'market' | 'nick' | 'questCorrect' | 'streak'> & Partial<Pick<Game, 'fishLog' | 'dlog' | 'rod' | 'gear' | 'ownedProps' | 'shop' | 'love' | 'mounts' | 'town' | 'events'>>) => boolean }
/** 업적용: 확정된 어제 종가로 평가(일중 반짝으로 달성되지 않게) */
/** 이번 주 기록을 고친다(주가 바뀌었으면 0부터 시작) */
const bump = (g: { weekly: { stat: WeekStat; n: number; last: number }; market: { day: number }; dlog: { seen: number[] } }, f: (w: WeekStat) => WeekStat) => {
  const k = weekOf(g.market.day), stat = g.weekly.stat.k === k ? g.weekly.stat : freshWeek(k, g.dlog.seen.length);
  return { ...g.weekly, stat: f(stat) };
};
const worthClosed = (g: Pick<Game, 'cash' | 'holdings' | 'market'> & { loan?: Loan | null }) => g.cash - (g.loan?.principal ?? 0) + Object.entries(g.holdings).reduce((a, [id, h]) => a + h.qty * (g.market.history[id].at(-2) ?? g.market.prices[id]), 0);
const worthOf = (g: Pick<Game, 'cash' | 'holdings' | 'market'> & { loan?: Loan | null }) => g.cash - (g.loan?.principal ?? 0) + Object.entries(g.holdings).reduce((a, [id, h]) => a + h.qty * g.market.prices[id], 0);
/** 생활 업적(마나 보상 없음): 낚시·던전·제작·마을·인연·탈것 */
const fishCount = (g: { fishLog?: Record<string, number> }) => Object.keys(g.fishLog ?? {}).length;
const seenMon = (g: { dlog?: { seen: number[] } }) => g.dlog?.seen ?? [];
const LIFE_ACHIEVEMENTS: Achievement[] = [
  { id: 'life-fish', name: '첫 월척', desc: '부두에서 무언가를 낚아 보세요.', test: (g) => fishCount(g) >= 1 },
  { id: 'fish-book', name: '낚시 도감의 절반', desc: '낚시 도감을 열네 칸 채워 보세요.', test: (g) => fishCount(g) >= 14 },
  { id: 'dex-half', name: '몬스터 도감의 절반', desc: '던전의 몬스터 여섯 종류를 쓰러뜨려 보세요.', test: (g) => seenMon(g).length >= 6 },
  { id: 'boss-king', name: '동굴의 왕', desc: '5층의 보스 동굴의 왕을 쓰러뜨려 보세요.', test: (g) => seenMon(g).includes(10) },
  { id: 'boss-abyss', name: '심연을 건너다', desc: '10층의 보스 심연의 군주를 쓰러뜨려 보세요.', test: (g) => seenMon(g).includes(11) },
  { id: 'gear-max', name: '완전 무장', desc: '던전 장비를 4단계까지 올려 보세요.', test: (g) => (g.gear ?? 1) >= MAX_GEAR },
  { id: 'boss-frost', name: '얼어붙은 왕좌', desc: '15층의 보스 서리 거인을 쓰러뜨려 보세요.', test: (g) => seenMon(g).includes(13) },
  { id: 'boss-dragon', name: '종말을 넘어', desc: '20층의 보스 종말의 용을 쓰러뜨려 보세요.', test: (g) => seenMon(g).includes(14) },
  { id: 'event-1', name: '축제의 손님', desc: '축제나 기념일의 이벤트 과제를 마쳐 보세요.', test: (g) => (g.events ?? []).length >= 1 },
  { id: 'rod-max', name: '낚시 명인', desc: '낚싯대를 4단계까지 올려 보세요.', test: (g) => (g.rod ?? 1) >= 4 },
  { id: 'craft-1', name: '첫 수공품', desc: '재료로 꾸미기 소품을 만들어 보세요.', test: (g) => (g.ownedProps ?? []).some((p) => p >= 17) },
  { id: 'my-shop', name: '내 가게', desc: '마을에 내 상점을 열어 보세요.', test: (g) => !!g.shop },
  { id: 'town-grow', name: '커지는 마을', desc: '시장 거리나 새 주택가를 마을에 세워 보세요.', test: (g) => (g.town?.market ?? 0) > 0 || (g.town?.homes ?? 0) > 0 },
  { id: 'rider', name: '탈것의 주인', desc: '탈것을 하나 가져 보세요.', test: (g) => (g.mounts ?? []).length >= 1 },
  { id: 'married', name: '평생의 인연', desc: '히로인과 결혼해 마을의 집에서 함께 살아 보세요.', test: (g) => (g.love?.stage ?? 0) >= 6 },
];
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-trade', name: '첫 거래', desc: '주식을 처음 사 보세요.', test: (g) => g.trades.some((t) => t.side === 'buy') },
  { id: 'take-profit', name: '이익 실현', desc: '평단보다 비싸게 팔아 이익을 남겨 보세요.', test: (g) => g.trades.some((t) => t.side === 'sell' && (t.pnl ?? 0) > 0) },
  { id: 'first-dividend', name: '첫 배당금', desc: '배당일(3·6·9·12월 30일)에 주식을 들고 있어 보세요.', test: (g) => g.trades.some((t) => t.side === 'div') },
  { id: 'spread', name: '분산 보유', desc: '서로 다른 다섯 길드의 주식을 동시에 가져 보세요.', test: (g) => Object.keys(g.holdings).length >= 5 },
  { id: 'all-sectors', name: '모든 업종', desc: '다섯 업종의 주식을 한 번씩 가져 보세요.', test: (g) => new Set(Object.keys(g.holdings).map((id) => cfgSector(id))).size >= 5 },
  { id: 'meet', name: '첫 만남', desc: '히로인과 처음 이야기해 보세요.', test: (g) => Object.keys(g.bond).length >= 1 },
  { id: 'meet-all', name: '다섯 친구', desc: '다섯 히로인 모두와 이야기해 보세요.', test: (g) => Object.keys(g.bond).length >= 5 },
  { id: 'bond-max', name: '단짝', desc: '한 히로인의 이야기를 끝까지(4일) 들어 보세요.', test: (g) => Object.values(g.bond).some((b) => b.pts >= 4) },
  { id: 'worth-12k', name: '밑천 불리기', desc: '총자산이 36,000 마나를 넘어 보세요.', test: (g) => worthClosed(g) >= 36000 },
  { id: 'named', name: '이름을 얻다', desc: '닉네임을 지어 상인 장부에 이름을 올리세요.', test: (g) => validNick(g.nick) },
  { id: 'trades-20', name: '단골 상인', desc: '거래를 20번 해 보세요.', test: (g) => g.trades.filter((t) => t.side !== 'div').length >= 20 },
  { id: 'rain-trade', name: '비 오는 날의 장사', desc: '비나 눈이 오는 날에 거래해 보세요.', test: (g) => g.trades.some((t) => t.side !== 'div' && ['rain', 'snow'].includes(weatherKind(t.day))) },
  { id: 'rank-5', name: '장터의 다섯 손가락', desc: '상인 순위 5위 안에 들어 보세요.', test: (g) => g.trades.length > 0 && rankOf(g) <= 5 },
  { id: 'rank-1', name: '왕국 제일의 상인', desc: '상인 순위 1위에 올라 보세요.', test: (g) => g.trades.length > 0 && rankOf(g) === 1 },
  { id: 'story-done', name: '마음을 나눈 사이', desc: '한 히로인의 여덟 번째 이야기까지 들어 보세요.', test: (g) => Object.values(g.bond).some((b) => b.pts >= 8) },
  { id: 'streak-3', name: '사흘째 단골', desc: '사흘 연속으로 마을에 들러 보세요.', test: (g) => g.streak.n >= 3 },
  { id: 'streak-7', name: '일주일의 약속', desc: '일주일 연속으로 마을에 들러 보세요.', test: (g) => g.streak.n >= 7 },
  { id: 'gift-5', name: '마음을 건네는 사람', desc: '히로인에게 선물을 다섯 번 건네 보세요.', test: (g) => Object.values(g.bond).reduce((a, b) => a + (b.gifts ?? 0), 0) >= 5 },
  { id: 'quest-10', name: '소식통', desc: '일일 의뢰를 열 번 맞혀 보세요.', test: (g) => g.questCorrect >= 10 },
  { id: 'worth-20k', name: '왕국의 상인', desc: '총자산이 60,000 마나를 넘어 보세요.', test: (g) => worthClosed(g) >= 60000 },
  ...LIFE_ACHIEVEMENTS,
];
const rankOf = (g: Pick<Game, 'cash' | 'holdings' | 'market' | 'nick'> & { loan?: Loan | null }) => ranking(g.market, { nick: g.nick, worth: worthOf(g) }).findIndex((r) => r.me) + 1;
const cfgSector = (id: string) => DEFAULT_CONFIG.stocks.find((s) => s.id === id)?.sectorId ?? id;

interface Game {
  /** 시장은 저장하지 않는다: (세계 시드, 날짜)로 언제든 같은 모습이 계산된다 */
  market: MarketState;
  trades: Trade[];
  cash: number;
  holdings: Record<string, Holding>;
  /** 스토리에서 초기 자본을 받았는지 (처음엔 마나가 0) */
  granted: boolean;
  tutStep: number;
  tutBaseDay: number;
  /** 연습용 "시간 감기"로 현실보다 앞서간 일수 (0이면 현실과 나란히 흐른다) */
  skipDays: number;
  /** 마지막으로 확인한 게임 날짜: 자리를 비운 동안의 요약에 쓴다 */
  lastSeenDay: number;
  /** 도트 캐릭터 꾸미기 (피부·눈·머리·옷·소품) */
  look: Look;
  /** 시작할 때 캐릭터 꾸미기를 마쳤는지 */
  looked: boolean;
  /** 닉네임(2~8자). 순위표에 보인다 */
  nick: string;
  setNick: (v: string) => void;
  setLooked: (v: boolean) => void;
  setLook: (patch: Partial<Look>) => void;
  /** 히로인 호감도: pts = 이야기를 들은 날 수, day = 마지막으로 대화한 게임 날짜 */
  bond: Record<string, { pts: number; day: number; cut?: boolean; /** 마지막으로 선물한 게임 날짜와 총 선물 횟수 */ gift?: number; gifts?: number }>;
  /** 히로인과 대화를 시작한다. 오늘 처음이면 호감이 오르고 다음 이야기가 열린다. 반환: 대화 전 호감(pts)과 오늘 처음인지 */
  talkHeroine: (id: string) => { pts: number; fresh: boolean };
  /** 8번째 이야기 완주 컷을 봤다고 기록 */
  markCut: (id: string) => void;
  /** 히로인에게 선물(하루 한 번): 마나를 쓰고 반응 대사를 돌려준다. 이야기 진행은 앞당기지 않는다 */
  giveGift: (id: string) => { error: string } | { line: string };
  /** 배당을 이 게임 날짜까지 정산했다(접속하지 않은 사이의 배당일도 빠짐없이 지급하려고 저장한다) */
  paidDay: number;
  /** 정산하지 않은 날들의 배당을 지급한다(접속 직후 한 번) */
  settleDividends: () => void;
  /** 마을·소품·선물에 영구히 쓴 마나 합계(HUD의 시작 자금 대비 손익에서 제외해 보여 주려고) */
  spent: number;
  /** 마나로 산 소품 번호(영구) */
  ownedProps: number[];
  /** 마을 일과: 오늘 채집한 곳, 가진 재료 */
  gather: { day: number; done: number[]; /** 오늘 줍기 횟수(귀한 것 판정용) */ n?: number };
  /** 마나 은행 대출(없으면 null) */
  loan: Loan | null;
  /** 던전 기록: 만난 몬스터 도감, 얻은 던전 재료, 가진 소모품 */
  dlog: { seen: number[]; mats: Record<string, number>; items: { potion: number; charm: number } };
  /** 활동 수입: 오늘 납품·낚시로 번 마나와 낚시 횟수, 도감, 낚싯대 레벨, 지금까지 번 합계 */
  act: { day: number; sold: number; fished: number; casts: number; dove: number; tries: number };
  gear: number;
  fishLog: Record<string, number>;
  rod: number;
  earned: number;
  mats: Record<string, number>;
  /** 마나로 산 눈·머리·옷 모양("hair:3" 같은 키, 영구) */
  ownedLooks: string[];
  buyLook: (kind: LookKind, i: number) => string | null;
  buyProp: (prop: number) => string | null;
  gatherAt: (spot: number, perfect?: boolean) => string | null;
  sellMat: (kind: MatKind, n: number) => string;
  fishCast: (score?: number) => string;
  startDive: () => string | null;
  dungeonCollect: (add: { kind?: number; mats?: Record<string, number>; potion?: number }) => void;
  craftItem: (id: ItemId) => string | null;
  useItem: (id: ItemId) => boolean;
  craftDProp: (prop: number) => string | null;
  finishDive: (cleared: number, bosses: number) => string;
  buyGear: () => string | null;
  buyRod: () => string | null;
  borrowLoan: (amount: number) => string | null;
  repayLoan: (amount: number) => string | null;
  accrueLoan: () => void;
  craftProp: (prop: number) => string | null;
  /** 구호 지원을 마지막으로 받은 게임 날짜 */
  lastRelief: number;
  claimRelief: () => boolean;
  /** 마을 시설 기부: 시설 id → 단계(0~3). 마나를 영구히 쓰고 마을에 장식이 늘어난다(시세·거래와 무관) */
  town: Record<string, number>;
  donate: (id: string) => string | null;
  /** 내 상점(수입 없음): 이름과 단계(1~4), 없으면 null */
  shop: { name: string; lv: number } | null;
  /** 히로인 인연: 평생 한 명(되돌릴 수 없음), 단계(0 선택·1~4 데이트·5 약속·6 결혼), 마지막으로 진행한 날 */
  love: { id: string; stage: number; day: number } | null;
  /** 탈것: 가진 것(1 말·2 마차·3 하늘 빗자루)과 지금 타는 것(0은 걸어 다님) */
  mounts: number[];
  mount: number;
  buyMount: (k: number) => string | null;
  rideMount: (k: number) => void;
  chooseLove: (id: string) => string | null;
  loveStep: () => { error: string } | { scene: Scene; title: string };
  openShop: (name: string) => string | null;
  upgradeShop: () => string | null;
  /** 분기 목표: 이번 분기에 나눈 히로인 이야기 횟수, 이미 칭호를 준 목표, 얻은 칭호와 쓰는 칭호 */
  qtalk: { key: number; n: number };
  goalDone: string[];
  titles: string[];
  activeTitle: string | null;
  claimTitles: () => string[];
  /** 오늘의 모험 목표를 모두 채운 날 수(마지막으로 채운 날과 누적) */
  daily: { last: number; n: number };
  checkDaily: () => boolean;
  /** 던전 RPG: 경험치·클래스(없으면 처음 고른다)·스킬 랭크·장착 스킬·마지막으로 클래스를 바꾼 날 */
  dun: { xp: number; cls: Cls | null; ranks: Record<string, number>; slots: string[]; swapDay: number; /** 성당에서 받은 직업 */ owned: Cls[]; /** 직업 후보를 정하는 저장 시드 */ seed: number; /** 성당에서 켜 둔 부 직업(없으면 null). 주 직업 하나 + 부 직업 하나까지 동시에 쓴다 */ sub: Cls | null };
  chooseCls: (c: Cls) => string | null;
  /** 성당: 문턱에 닿았을 때 후보 3개 중 하나를 받는다 */
  grantCls: (c: Cls) => string | null;
  /** 성당: 부 직업을 켜거나(다른 받은 직업) 끈다(null) */
  setSub: (c: Cls | null) => string | null;
  learnSkill: (id: string) => string | null;
  toggleSlot: (id: string) => void;
  addXp: (n: number) => void;
  /** 주간 도전: 이번 주 기록과 마친 주 수 */
  weekly: { stat: WeekStat; n: number; last: number };
  checkWeekly: () => boolean;
  /** 축제·기념일 이벤트 과제를 마친 이벤트 키들 */
  events: string[];
  checkEvent: () => string | null;
  /** 입문 과제: 끝낸 과제 수(순서대로), 기록이 맞으면 자동 완료하고 완료한 과제 이름을 돌려준다 */
  starter: number;
  checkStarter: () => string[];
  setTitle: (t: string | null) => void;
  /** 접속 연속 기록: 마지막으로 접속한 게임 날짜와 연속 일수(연습용 시간 감기 중에는 세지 않는다) */
  streak: { last: number; n: number };
  touchVisit: () => void;
  /** 월간 결산용: 건국력의 달이 처음 관측된 때의 총자산(달 키 → 마나). 최근 24개월 */
  worthLog: Record<string, number>;
  logWorth: () => string | null;
  /** 일일 의뢰: 그날 고른 보기와 지금까지 맞힌 총 개수 */
  quest: { day: number; ans: Record<string, number> };
  questCorrect: number;
  answerQuest: (qid: string, option: number) => boolean | null;
  /** 서버 모드: 연결하면 지갑·거래·예약을 서버가 진실로 가진다. 규칙이 같아 화면은 로컬과 똑같이 즉시 반응하고 서버에 되풀이해 보낸다 */
  server: ServerConn | null;
  localBackup: { cash: number; holdings: Record<string, Holding>; trades: Trade[]; orders: Order[]; fired: Fired[] } | null;
  connectServer: (url: string) => Promise<string | null>;
  /** 가입 직후 한 번만 보여 주는 복구 코드(저장하지 않는다) */
  recoveryCode: string | null;
  /** 기기를 바꿨거나 토큰을 잃었을 때: 닉네임+복구 코드로 서버 계정을 되찾는다 */
  recoverServer: (url: string, nick: string, code: string) => Promise<string | null>;
  disconnectServer: () => void;
  /** 서버 계정으로 로컬 지갑을 한 번 가져온다(서버가 거래 기록을 처음부터 다시 돌려 검증, 어긋나면 거절) */
  importLocalToServer: () => Promise<string | null>;
  syncFromServer: () => Promise<void>;
  orders: Order[];
  fired: Fired[];
  placeOrder: (id: string, side: 'buy' | 'sell' | 'alert', qty: number, limit: number, above?: boolean) => string | null;
  cancelOrder: (uid: number) => void;
  /** 업적: id → 달성한 게임 날짜 */
  achv: Record<string, number>;
  /** 새로 달성한 업적을 기록하고 그 id 목록을 돌려준다 */
  checkAchievements: () => string[];
  selected: string;
  /** 같은 종목을 다시 눌러도 시트가 열리도록 누를 때마다 증가 */
  pickSeq: number;
  select: (id: string) => void;
  /** 실패 시 사유를 돌려준다 */
  buy: (id: string, qty: number) => string | null;
  sell: (id: string, qty: number) => string | null;
  /** 현실 시간에 맞춰 시장을 따라잡는다. 진행한 일수를 돌려준다 */
  syncToNow: () => number;
  /** 연습용: 하루를 앞당긴다 */
  fastForward: (days?: number) => void;
  /** 현실 시간으로 되돌린다 */
  resetClock: () => void;
  setLastSeen: (day: number) => void;
  grantCapital: () => void;
  setTutStep: (step: number, baseDay?: number) => void;
  reset: () => void;
}

/** 서버 모드면 같은 동작을 서버에도 보낸다. 서버의 답(진실)으로 지갑을 맞추고, 실패하면 서버 상태를 다시 받는다 */
function mirror(method: string, path: string, body: unknown) {
  const c = useGame.getState().server;
  if (!c) return;
  call<ServerMe>(c, method, path, body)
    .then((me) => useGame.setState({ cash: me.cash, holdings: me.holdings, trades: me.trades, orders: me.orders, fired: me.fired }))
    .catch(() => void useGame.getState().syncFromServer());
}

/** UI·체결이 읽는 시장: 오늘 가격은 지금 15분 슬롯의 값이다(진짜 종가는 밖으로 나가지 않는다) */
const view = (m: MarketState) => liveMarket(m, Date.now());

export const useGame = create<Game>()(
  persist(
    (set, get) => ({
      market: view(marketAtDay(todayIdx())),
      cash: 0,
      holdings: {},
      trades: [],
      granted: false,
      tutStep: 0,
      tutBaseDay: 0,
      skipDays: 0,
      lastSeenDay: todayIdx(),
      look: DEFAULT_LOOK,
      looked: false,
      nick: '',
      setNick: (v) => set({ nick: cleanNick(v) }),
      setLooked: (v) => set({ looked: v }),
      setLook: (patch) => set((g) => ({ look: { ...g.look, ...patch } })),
      spent: 0,
      ownedLooks: [],
      buyLook: (kind, i) => {
        const g = get(), price = LOOK_PRICE[kind]?.[i], key = lookKey(kind, i);
        if (price === undefined) return '살 수 없는 모양이에요';
        if (g.server) return '서버 모드에서는 살 수 없어요';
        if (g.ownedLooks.includes(key)) return '이미 가지고 있어요';
        if (g.cash < price) return `마나가 모자라요(${price} 필요)`;
        set({ cash: round2(g.cash - price), spent: g.spent + price, ownedLooks: [...g.ownedLooks, key] });
        return null;
      },
      ownedProps: [],
      gather: { day: -1, done: [] },
      mats: {},
      loan: null,
      act: { day: -1, sold: 0, fished: 0, casts: 0, dove: 0, tries: 0 },
      fishLog: {},
      rod: 1,
      gear: 1,
      earned: 0,
      dlog: { seen: [], mats: {}, items: { potion: 0, charm: 0 } },
      dungeonCollect: ({ kind, mats = {}, potion = 0 }) => {
        const g = get(), dl = g.dlog, m = { ...dl.mats };
        for (const [k, n] of Object.entries(mats)) m[k] = (m[k] ?? 0) + n;
        if (kind !== undefined) m[lootOf(kind)] = (m[lootOf(kind)] ?? 0) + (specialOf(g.market.day).id === 'migration' ? 2 : 1); // 몬스터 대이동의 날엔 두 개씩
        set({ dlog: { seen: kind !== undefined && !dl.seen.includes(kind) ? [...dl.seen, kind] : dl.seen, mats: m, items: { ...dl.items, potion: Math.min(ITEM_LIMIT, dl.items.potion + potion) } } });
      },
      craftItem: (id) => {
        const g = get(), dl = g.dlog, it = ITEMS[id];
        if (g.server) return '서버 모드에서는 만들 수 없어요';
        if (dl.items[id] >= ITEM_LIMIT) return `${it.name}은(는) ${ITEM_LIMIT}개까지 가질 수 있어요`;
        if (Object.entries(it.cost).some(([k, n]) => (dl.mats[k] ?? 0) < n)) return '재료가 모자라요';
        const m = { ...dl.mats }; for (const [k, n] of Object.entries(it.cost)) m[k] -= n;
        set({ dlog: { ...dl, mats: m, items: { ...dl.items, [id]: dl.items[id] + 1 } } });
        return null;
      },
      useItem: (id) => {
        const dl = get().dlog; if (dl.items[id] <= 0) return false;
        set({ dlog: { ...dl, items: { ...dl.items, [id]: dl.items[id] - 1 } } }); return true;
      },
      craftDProp: (prop) => {
        const g = get(), r = CRAFT_D[prop], dl = g.dlog;
        if (!r) return '만들 수 없는 소품이에요';
        if (g.server) return '서버 모드에서는 만들 수 없어요';
        if (g.ownedProps.includes(prop)) return '이미 가지고 있어요';
        if (Object.entries(r).some(([k, n]) => (dl.mats[k] ?? 0) < n)) return '재료가 모자라요';
        const m = { ...dl.mats }; for (const [k, n] of Object.entries(r)) m[k] -= n;
        set({ dlog: { ...dl, mats: m }, ownedProps: [...g.ownedProps, prop] });
        return null;
      },
      startDive: () => {
        const g = get(), day = g.market.day;
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        const a = g.act.day === day ? g.act : { day, sold: 0, fished: 0, casts: 0, dove: 0, tries: 0 };
        set({ act: { ...a, tries: a.tries + 1 }, weekly: bump(g, (w) => ({ ...w, tries: w.tries + 1 })) });
        return null;
      },
      finishDive: (cleared, bosses) => {
        const g = get(), day = g.market.day;
        const a = g.act.day === day ? g.act : { day, sold: 0, fished: 0, casts: 0, dove: 0, tries: 0 };
        const target = Math.min(rewardFor(cleared, bosses), DIVE_CAP), room = Math.min(ACTIVITY_CAP - a.sold - a.fished - a.dove, target - a.dove), gain = Math.max(0, room);
        set({ weekly: bump(g, (w) => ({ ...w, best: Math.max(w.best, cleared) })) });
        if (gain > 0) set({ cash: round2(g.cash + gain), earned: g.earned + gain, act: { ...a, dove: a.dove + gain } });
        return gain > 0 ? `${cleared}층까지 깼어. ${gain} 마나를 받았어요` : cleared > 0 ? `${cleared}층까지 깼어. 오늘 받을 몫은 이미 채웠어요` : '이번에는 한 층도 못 깼어. 받은 마나는 없어요';
      },
      buyGear: () => {
        const g = get(), next = g.gear + 1, price = GEAR_PRICE[next];
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        if (price === undefined) return '더 좋은 장비가 없어요';
        if (g.cash < price) return `마나가 모자라요(${price} 필요)`;
        set({ cash: round2(g.cash - price), spent: g.spent + price, gear: next });
        return null;
      },
      sellMat: (kind, n) => {
        const g = get(), day = g.market.day;
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        const a = g.act.day === day ? g.act : { day, sold: 0, fished: 0, casts: 0, dove: 0, tries: 0 };
        const left = Math.min(SELL_CAP - a.sold, ACTIVITY_CAP - a.sold - a.fished - a.dove), price = SELL_PRICE[kind];
        const units = Math.min(n, g.mats[kind] ?? 0, Math.floor(left / price));
        if ((g.mats[kind] ?? 0) <= 0) return '넘길 재료가 없어요';
        if (units <= 0) return '오늘 넘길 수 있는 몫을 다 채웠어요';
        const gain = units * price;
        set({ cash: round2(g.cash + gain), earned: g.earned + gain, mats: { ...g.mats, [kind]: (g.mats[kind] ?? 0) - units }, act: { ...a, sold: a.sold + gain } });
        return `${matName(kind, day)} ${units}개를 넘기고 ${gain} 마나를 받았어요`;
      },
      fishCast: (score = 3) => {
        const g = get(), day = g.market.day;
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        const a = g.act.day === day ? g.act : { day, sold: 0, fished: 0, casts: 0, dove: 0, tries: 0 };
        const c = catchOf(day, a.casts, g.rod), season = fantasyDate(day).season;
        const name = c.kind === 'fish' ? FISH_NAMES[season][c.level - 1] : c.name, key = c.kind === 'fish' ? fishKey(season, c.level) : c.key;
        const base = { ...a, casts: a.casts + 1 };
        // 물건: 마나 값어치가 없다. 타이밍이 완전히 빗나가지 않아야 건진다
        if (c.kind === 'item') {
          if (score < 1) { set({ act: base, weekly: bump(g, (w) => ({ ...w, casts: w.casts + 1 })) }); return `${josa(name, '이가')} 걸렸다가 놓쳤어요. 마나는 없어요`; }
          const keep = KEEP_ITEMS.includes(c.id);
          set({ act: base, weekly: bump(g, (w) => ({ ...w, casts: w.casts + 1 })), fishLog: { ...g.fishLog, [key]: (g.fishLog[key] ?? 0) + 1 }, mats: keep ? { ...g.mats, [c.id]: (g.mats[c.id] ?? 0) + 1 } : g.mats });
          return `${josa(name, '을를')} 건졌어요${c.id === 'bottle' ? `. ${letterOf(day, a.casts)}` : keep ? ' (소품 재료로 쓸 수 있어요)' : ''}. 마나는 없어요`;
        }
        // 물고기·생물: 하루 40 마나(활동 합계 상한 안)까지는 값 그대로, 그 뒤는 4분의 1만 받는다
        const pay = fishPayout(c.value, score), room = Math.max(0, Math.min(FISH_CAP - a.fished, ACTIVITY_CAP - a.sold - a.fished - a.dove)), full = Math.min(pay, room), over = Math.floor((pay - full) * FISH_OVER_RATE), gain = full + over;
        set({ cash: round2(g.cash + gain), earned: g.earned + gain, weekly: bump(g, (w) => ({ ...w, casts: w.casts + 1 })), act: { ...base, fished: a.fished + full }, fishLog: { ...g.fishLog, [key]: (g.fishLog[key] ?? 0) + 1 } });
        return `${josa(name, '을를')} 낚아 ${gain} 마나에 넘겼어요${over > 0 && full < pay ? ' (오늘 많이 낚아서 값이 줄었어요)' : ''}`;
      },
      buyRod: () => {
        const g = get(), next = g.rod + 1, price = ROD_PRICE[next];
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        if (price === undefined) return '더 좋은 낚싯대가 없어요';
        if (g.cash < price) return `마나가 모자라요(${price} 필요)`;
        set({ cash: round2(g.cash - price), spent: g.spent + price, rod: next });
        return null;
      },
      borrowLoan: (amount) => {
        const g = get();
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        const r = borrow(g.cash, g.loan, g.market.day, worthOf(g), amount);
        if (typeof r === 'string') return r;
        set({ cash: r.cash, loan: r.loan });
        return null;
      },
      repayLoan: (amount) => {
        const g = get();
        if (!g.loan) return '빌린 돈이 없어요';
        const r = repay(g.cash, g.loan, amount);
        if (typeof r === 'string') return r;
        set({ cash: r.cash, loan: r.loan });
        return null;
      },
      accrueLoan: () => {
        const g = get(), r = accrue(g.cash, g.loan, g.market.day);
        if (r.loan !== g.loan) set({ cash: r.cash, loan: r.loan, spent: round2(g.spent + r.paid) }); // 낸 이자는 영구 소비
      },
      gatherAt: (spot, perfect = false) => {
        const g = get(), sp = SPOTS[spot], day = g.market.day;
        if (!sp) return null;
        const done = g.gather.day === day ? g.gather.done : [];
        const n = yieldOf(sp.kind, day);
        const cnt = g.gather.day === day ? g.gather.n ?? 0 : 0, rare = rareFind(day, spot, cnt) ? RARE[sp.kind] : null;
        set({ weekly: bump(g, (w) => ({ ...w, gathers: w.gathers + 1 })), gather: { day, done: done.includes(spot) ? done : [...done, spot], n: cnt + 1 }, mats: { ...g.mats, [sp.kind]: (g.mats[sp.kind] ?? 0) + n, ...(rare ? { [rare.id]: (g.mats[rare.id] ?? 0) + 1 } : {}) } });
        return `${perfect ? '상등품 ' : ''}${matName(sp.kind, day)} ${n}개를 주웠어요${rare ? `. 드물게 ${josa(rare.name, '을를')} 찾았어요` : ''}`;
      },
      craftProp: (prop) => {
        const g = get(), r = CRAFT[prop];
        if (!r) return '만들 수 없는 소품이에요';
        if (g.server) return '서버 모드에서는 만들 수 없어요';
        if (g.ownedProps.includes(prop)) return '이미 가지고 있어요';
        const need = Object.entries(r) as [MatKind, number][];
        if (need.some(([k, n]) => (g.mats[k] ?? 0) < n)) return '재료가 모자라요';
        const mats = { ...g.mats };
        for (const [k, n] of need) mats[k] = (mats[k] ?? 0) - n;
        set({ mats, ownedProps: [...g.ownedProps, prop] });
        return null;
      },
      buyProp: (prop) => {
        const g = get(), price = PROP_PRICE[prop];
        if (price === undefined) return '살 수 없는 소품이에요';
        if (g.server) return '서버 모드에서는 살 수 없어요';
        if (g.ownedProps.includes(prop)) return '이미 가지고 있어요';
        if (g.cash < price) return `마나가 모자라요(${price} 필요)`;
        set({ cash: round2(g.cash - price), spent: g.spent + price, ownedProps: [...g.ownedProps, prop] });
        return null;
      },
      lastRelief: -9999,
      claimRelief: () => {
        const g = get();
        if (!g.granted || g.server || !reliefDue(worthOf(g), g.market.day, g.lastRelief)) return false;
        set({ cash: round2(g.cash + RELIEF_AMOUNT), lastRelief: g.market.day });
        return true;
      },
      town: {},
      donate: (id) => {
        const g = get(), f = FACILITIES.find((x) => x.id === id);
        if (!f) return '없는 시설이에요';
        if (g.server) return '서버 모드에서는 기부할 수 없어요';
        const tier = g.town[id] ?? 0;
        if (f.need && g.spent < f.need) return `지금까지 ${f.need.toLocaleString('ko-KR')} 마나를 써야 열려요`;
        if (tier >= MAX_TIER) return '이미 가장 높은 단계예요';
        const price = f.tiers[tier];
        if (g.cash < price) return `마나가 모자라요(${price} 필요)`;
        set({ cash: round2(g.cash - price), spent: g.spent + price, town: { ...g.town, [id]: tier + 1 } });
        return null;
      },
      mounts: [],
      mount: 0,
      buyMount: (k) => {
        const g = get(), price = MOUNT_PRICE[k];
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        if (!price) return '살 수 없어요';
        if (g.mounts.includes(k)) return '이미 가지고 있어요';
        if (g.cash < price) return `마나가 모자라요(${price} 필요)`;
        set({ cash: round2(g.cash - price), spent: g.spent + price, mounts: [...g.mounts, k], mount: k });
        return null;
      },
      rideMount: (k) => { const g = get(); if (k === 0 || g.mounts.includes(k)) set({ mount: k }); },
      love: null,
      chooseLove: (id) => {
        const g = get();
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        if (g.love) return '이미 평생의 인연을 정했어요';
        if (!LOVE[id]) return '없는 사람이에요';
        if ((g.bond[id]?.pts ?? 0) < LOVE_NEED_PTS) return '여덟 번째 이야기까지 들어야 해요';
        set({ love: { id, stage: 0, day: -1 } });
        return null;
      },
      loveStep: () => {
        const g = get(), l = g.love;
        if (g.server) return { error: '서버 모드에서는 쓸 수 없어요' };
        if (!l) return { error: '먼저 인연을 정해야 해요' };
        if (l.stage >= STAGE.married) return { error: '이미 함께 살고 있어요' };
        if (l.day === g.market.day) return { error: '오늘은 이미 함께 시간을 보냈어요. 내일 또 만나요' };
        const cost = stepCost(l.stage);
        if (g.cash < cost) return { error: `마나가 모자라요(${cost} 필요)` };
        const s = LOVE[l.id], scene: Scene = l.stage < 4 ? s.dates[l.stage] : { place: l.stage === 4 ? '반지를 건네는 자리' : '결혼식', lines: l.stage === 4 ? s.proposal : s.wedding };
        set({ cash: round2(g.cash - cost), spent: g.spent + cost, love: { ...l, stage: l.stage + 1, day: g.market.day } });
        return { scene, title: l.stage < 4 ? `${l.stage + 1}번째 데이트` : l.stage === 4 ? '약속' : '결혼식' };
      },
      shop: null,
      openShop: (name) => {
        const g = get(), n = cleanShop(name);
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        if (g.shop) return '이미 가게가 있어요';
        if (g.spent < SHOP_NEED) return `지금까지 ${SHOP_NEED.toLocaleString('ko-KR')} 마나를 써야 열려요`;
        if (!validShop(n)) return '가게 이름은 2~10자로 지어 주세요';
        if (g.cash < SHOP_PRICES[0]) return `마나가 모자라요(${SHOP_PRICES[0]} 필요)`;
        set({ cash: round2(g.cash - SHOP_PRICES[0]), spent: g.spent + SHOP_PRICES[0], shop: { name: n, lv: 1 } });
        return null;
      },
      upgradeShop: () => {
        const g = get(), sh = g.shop;
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        if (!sh) return '먼저 가게를 열어야 해요';
        if (sh.lv >= SHOP_MAX) return '가게를 더 키울 수 없어요';
        const price = SHOP_PRICES[sh.lv];
        if (g.cash < price) return `마나가 모자라요(${price} 필요)`;
        set({ cash: round2(g.cash - price), spent: g.spent + price, shop: { ...sh, lv: sh.lv + 1 } });
        return null;
      },
      qtalk: { key: -1, n: 0 },
      goalDone: [],
      titles: [],
      activeTitle: null,
      dun: { xp: 0, cls: null, ranks: {}, slots: [], swapDay: -1, owned: [], seed: newSeed(), sub: null },
      chooseCls: (c) => {
        const g = get(), d = g.dun;
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        if (d.cls === c) return null;
        if (!d.owned.includes(c)) return '성당에서 받은 직업만 고를 수 있어요';
        const sub = d.sub === c ? null : d.sub;
        set({ dun: { ...d, cls: c, sub, slots: validSlots(c, d.ranks, [...defaultSlots(c), ...d.slots.filter((id) => !defaultSlots(c).includes(id))], sub), swapDay: d.swapDay } });
        return null;
      },
      grantCls: (c) => {
        const g = get(), d = g.dun;
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        if (!grantReady(g.spent, d.owned)) return '아직 직업을 받을 수 없어요';
        if (!grantChoices(d.seed, d.owned).includes(c)) return '후보에 없는 직업이에요';
        set({ dun: { ...d, owned: [...d.owned, c], cls: d.cls ?? c, slots: d.cls ? d.slots : validSlots(c, d.ranks, defaultSlots(c), null) } });
        return null;
      },
      setSub: (c) => {
        const g = get(), d = g.dun;
        if (g.server) return '서버 모드에서는 쓸 수 없어요';
        if (c !== null && g.spent < SUB_NEED) return `마나를 ${SUB_NEED.toLocaleString()} 이상 쓰면 부 직업을 켤 수 있어요`;
        if (c !== null && (!d.owned.includes(c) || c === d.cls)) return '부 직업으로 켤 수 없는 직업이에요';
        set({ dun: { ...d, sub: c, slots: d.cls ? validSlots(d.cls, d.ranks, d.slots, c) : d.slots } });
        return null;
      },
      learnSkill: (id) => {
        const g = get(), d = g.dun, sk = SKILL_BY_ID[id];
        if (!sk || !d.cls) return '배울 수 없는 스킬이에요';
        if (!d.owned.includes(sk.cls)) return '받지 못한 직업의 스킬이에요';
        if (sk.cls !== d.cls && sk.cls !== d.sub) return '성당에서 켜 둔 직업의 스킬만 배울 수 있어요';
        const r = skillRank(d.ranks, id);
        if (r >= MAX_RANK) return '이미 가장 높은 랭크예요';
        if (freePoints(levelOf(d.xp).lvl, d.ranks) <= 0) return '스킬 포인트가 없어요(레벨이 오르면 생겨요)';
        const ranks = { ...d.ranks, [id]: r + 1 };
        set({ dun: { ...d, ranks, slots: validSlots(d.cls, ranks, d.slots.includes(id) ? d.slots : [...d.slots, id], d.sub) } });
        return null;
      },
      toggleSlot: (id) => {
        const d = get().dun; if (!d.cls || !SKILL_BY_ID[id] || skillRank(d.ranks, id) < 1 || (SKILL_BY_ID[id].cls !== d.cls && SKILL_BY_ID[id].cls !== d.sub && !d.slots.includes(id))) return;
        const slots = d.slots.includes(id) ? d.slots.filter((x) => x !== id) : validSlots(d.cls, d.ranks, [...d.slots, id], d.sub);
        set({ dun: { ...d, slots } });
      },
      addXp: (n) => set((g) => ({ dun: { ...g.dun, xp: g.dun.xp + Math.max(0, Math.floor(n)) } })),
      weekly: { stat: freshWeek(-1, 0), n: 0, last: -1 },
      checkWeekly: () => {
        const g = get(); if (!g.granted || g.server) return false;
        const k = weekOf(g.market.day), stat = g.weekly.stat.k === k ? g.weekly.stat : freshWeek(k, g.dlog.seen.length);
        if (stat !== g.weekly.stat) set({ weekly: { ...g.weekly, stat } });
        if (g.weekly.last === k || !weeklyGoals(k, g.dlog.seen.length >= MONSTER_NAMES.length).every((x) => x.have(stat, g.dlog.seen.length) >= x.target)) return false;
        const n = g.weekly.n + 1, fresh = WEEKLY_TITLES.filter(([need]) => need === n).map(([, t]) => t);
        set({ weekly: { stat, n, last: k }, titles: [...g.titles, ...fresh.filter((t) => !g.titles.includes(t))], activeTitle: g.activeTitle ?? fresh[0] ?? null });
        return true;
      },
      events: [],
      checkEvent: () => {
        const g = get(), ev = eventOf(g.market.day); if (!g.granted || g.server || !ev || g.events.includes(ev.key)) return null;
        const a = g.act.day === g.market.day ? g.act : { casts: 0, tries: 0 }, have = { fish: a.casts, gather: g.gather.day === g.market.day ? g.gather.n ?? 0 : 0, dive: a.tries };
        if (!EVENT_TASKS.every((t) => have[t.id] >= t.need)) return null;
        const title = eventTitle(ev);
        set({ events: [...g.events, ev.key].slice(-40), titles: g.titles.includes(title) ? g.titles : [...g.titles, title], activeTitle: g.activeTitle ?? title });
        return ev.name;
      },
      starter: 0,
      checkStarter: () => {
        const g = get(); if (!g.granted || g.server) return [];
        let i = g.starter, cash = g.cash, earned = g.earned; const done: string[] = [];
        let paid = STARTER.slice(0, i).reduce((x, t) => x + t.reward, 0); // 과제 보상은 활동 수입 판정에서 뺀다
        while (i < STARTER.length && STARTER[i].test({ ...g, earned: earned - paid })) { cash = round2(cash + STARTER[i].reward); earned += STARTER[i].reward; paid += STARTER[i].reward; done.push(STARTER[i].text); i++; }
        if (!done.length) return [];
        const fin = i >= STARTER.length && g.starter < STARTER.length;
        set({ starter: i, cash, earned, ...(fin ? { titles: g.titles.includes(STARTER_TITLE) ? g.titles : [...g.titles, STARTER_TITLE], activeTitle: g.activeTitle ?? STARTER_TITLE } : {}) });
        return done;
      },
      daily: { last: -1, n: 0 },
      checkDaily: () => {
        const g = get();
        if (!g.granted || g.server || g.daily.last === g.market.day || !allDailyDone(g)) return false;
        const n = g.daily.n + 1, fresh = DAILY_TITLES.filter(([need]) => need === n).map(([, t]) => t);
        set({ daily: { last: g.market.day, n }, titles: [...g.titles, ...fresh.filter((t) => !g.titles.includes(t))], activeTitle: g.activeTitle ?? fresh[0] ?? null });
        return true;
      },
      claimTitles: () => {
        const g = get(); if (!g.granted) return [];
        const q = quarterOf(g.market.day), goals = goalsFor(g, q), fresh: string[] = [], done = [...g.goalDone];
        for (const x of goals) if (x.done && !done.includes(`${q}:${x.id}`)) { done.push(`${q}:${x.id}`); fresh.push(x.title); }
        if (goals.every((x) => x.done) && !done.includes(`${q}:all`)) { done.push(`${q}:all`); fresh.push(allTitle(q)); }
        if (!fresh.length) return [];
        const titles = [...g.titles, ...fresh.filter((t) => !g.titles.includes(t))];
        set({ goalDone: done.slice(-60), titles, activeTitle: g.activeTitle ?? fresh[0] });
        return fresh;
      },
      setTitle: (t) => set((g) => ({ activeTitle: t === null || g.titles.includes(t) ? t : g.activeTitle })),
      streak: { last: -1, n: 0 },
      touchVisit: () => {
        const g = get(); if (!g.granted || g.skipDays > 0) return;
        const d = g.market.day, { last, n } = g.streak;
        if (d === last) return;
        set({ streak: { last: d, n: d === last + 1 ? n + 1 : 1 } });
      },
      worthLog: {},
      logWorth: () => {
        const g = get(); if (!g.granted) return null;
        const k = monthKey(g.market.day), keys = Object.keys(g.worthLog).map(Number);
        if (String(k) in g.worthLog) return null;
        const log: Record<string, number> = { ...g.worthLog, [k]: Math.round(worthClosed(g)) };
        for (const old of Object.keys(log).sort((a, b) => Number(a) - Number(b)).slice(0, Math.max(0, Object.keys(log).length - 24))) delete log[old];
        set({ worthLog: log });
        return keys.length ? String(Math.max(...keys)) : null; // 지난 기록이 있으면 "지난달 결산" 알림용으로 그 키를 돌려준다
      },
      quest: { day: -1, ans: {} },
      questCorrect: 0,
      answerQuest: (qid, option) => {
        const g = get(), q = questsFor(g.market).find((x) => x.id === qid);
        const cur = g.quest.day === g.market.day ? g.quest.ans : {};
        if (!q || qid in cur) return null; // 없는 의뢰이거나 이미 답했다
        const right = option === q.answer;
        set({ quest: { day: g.market.day, ans: { ...cur, [qid]: option } }, ...(right ? { questCorrect: g.questCorrect + 1, ...(g.server ? {} : { cash: round2(g.cash + QUEST_REWARD) }) } : {}) });
        return right;
      },
      server: null,
      localBackup: null,
      connectServer: async (url) => {
        const g = get();
        if (g.server) return '이미 서버에 연결돼 있어요';
        if (g.skipDays > 0) return '연습용 시간 감기를 끄고(달력에서 현실 시간으로) 연결하세요';
        try {
          const r = await call<{ token: string; recoveryCode: string; player: ServerMe }>({ url }, 'POST', '/api/register', { nick: g.nick });
          set({ recoveryCode: r.recoveryCode, server: { url, token: r.token }, localBackup: { cash: g.cash, holdings: g.holdings, trades: g.trades, orders: g.orders, fired: g.fired }, cash: r.player.cash, holdings: r.player.holdings, trades: r.player.trades, orders: r.player.orders, fired: r.player.fired, paidDay: r.player.day });
          return null;
        } catch (e) { return (e as Error).message || '연결하지 못했어요'; }
      },
      importLocalToServer: async () => {
        const g = get(), c = g.server, b = g.localBackup;
        if (!c || !b) return '서버에 연결돼 있어야 해요';
        if (g.loan) return '대출 중에는 가져올 수 없어요';
        try {
          const me = await call<ServerMe>(c, 'POST', '/api/import', { cash: b.cash, holdings: b.holdings, trades: b.trades, questCorrect: g.questCorrect });
          set({ cash: me.cash, holdings: me.holdings, trades: me.trades, orders: me.orders, fired: me.fired, paidDay: me.day });
          return null;
        } catch (e) { return (e as Error).message || '가져오지 못했어요'; }
      },
      recoveryCode: null,
      recoverServer: async (url, nick, code) => {
        const g = get();
        if (g.server) return '이미 서버에 연결돼 있어요';
        if (g.skipDays > 0) return '연습용 시간 감기를 끄고 연결하세요';
        try {
          const r = await call<{ token: string; player: ServerMe }>({ url }, 'POST', '/api/recover', { nick, code });
          set({ server: { url, token: r.token }, localBackup: { cash: g.cash, holdings: g.holdings, trades: g.trades, orders: g.orders, fired: g.fired }, cash: r.player.cash, holdings: r.player.holdings, trades: r.player.trades, orders: r.player.orders, fired: r.player.fired, paidDay: r.player.day, nick: r.player.nick, recoveryCode: null });
          return null;
        } catch (e) { return (e as Error).message || '복구하지 못했어요'; }
      },
      disconnectServer: () => set((g) => ({ server: null, localBackup: null, recoveryCode: null, ...(g.localBackup ?? {}) })),
      syncFromServer: async () => {
        const c = get().server; if (!c) return;
        try { const me = await call<ServerMe>(c, 'GET', '/api/me'); set({ cash: me.cash, holdings: me.holdings, trades: me.trades, orders: me.orders, fired: me.fired, paidDay: me.day }); } catch { /* 오프라인이면 다음에 */ }
      },
      orders: [],
      fired: [],
      placeOrder: (id, side, qty, limit, above) => {
        const { market, orders, holdings } = get(), p = market.prices[id];
        if (!(limit > 0)) return '희망 가격을 입력하세요';
        if (side === 'alert') { if (above ? limit <= p : limit >= p) return above ? '지금 시세보다 높은 가격을 적어 주세요' : '지금 시세보다 낮은 가격을 적어 주세요'; }
        else if (!Number.isInteger(qty) || qty <= 0) return '수량을 확인하세요';
        if (side === 'buy' && limit >= p) return '지금 시세보다 낮은 가격을 적어야 예약이 돼요';
        if (side === 'sell' && limit <= p) return '지금 시세보다 높은 가격을 적어야 예약이 돼요';
        if (side === 'sell' && (holdings[id]?.qty ?? 0) < qty) return '보유 수량이 부족해요';
        if (orders.length >= MAX_ORDERS) return `예약은 ${MAX_ORDERS}건까지 할 수 있어요`;
        mirror('POST', '/api/orders', { id, side, qty, limit, above });
        set({ orders: [...orders, { uid: Date.now() + orders.length, id, side, qty: side === 'alert' ? 0 : qty, limit: round2(limit), day: market.day, slot: slotIndexAt(Date.now()), ...(side === 'alert' ? { above: !!above } : {}) }] });
        return null;
      },
      cancelOrder: (uid) => { mirror('DELETE', '/api/orders', { uid }); set((g) => ({ orders: g.orders.filter((o) => o.uid !== uid) })); },
      paidDay: todayIdx(),
      settleDividends: () => {
        const g = get();
        if (g.market.day - 1 <= g.paidDay) { get().accrueLoan(); return; }
        set((s) => ({ ...(s.granted ? withFired(s.fired, payDividends(s.cash, s.holdings, s.trades, marketAtDay(s.market.day), s.paidDay, s.market.day, s.orders, Date.now(), s.loan?.principal ?? 0)) : {}), paidDay: Math.max(s.paidDay, s.market.day - 1) }));
        get().accrueLoan();
      },
      achv: {},
      checkAchievements: () => {
        const g = get();
        if (!g.granted) return [];
        const fresh = ACHIEVEMENTS.filter((a) => !(a.id in g.achv) && a.test(g)).map((a) => a.id);
        if (fresh.length) set({ achv: { ...g.achv, ...Object.fromEntries(fresh.map((id) => [id, g.market.day])) } });
        return fresh;
      },
      bond: {},
      giveGift: (id) => {
        const g = get(), h = HEROINES[id], b = g.bond[id];
        if (!h) return { error: '없는 사람이에요' };
        if (g.server) return { error: '서버 모드에서는 선물할 수 없어요' };
        if (!b) return { error: '먼저 이야기를 나눠 보세요' };
        if (b.gift === g.market.day) return { error: '오늘은 이미 선물했어요' };
        if (g.cash < h.gift.price) return { error: `마나가 모자라요(${h.gift.price} 필요)` };
        set({ cash: round2(g.cash - h.gift.price), spent: g.spent + h.gift.price, bond: { ...g.bond, [id]: { ...b, gift: g.market.day, gifts: (b.gifts ?? 0) + 1 } } });
        return { line: h.gift.lines[((b.gifts ?? 0)) % h.gift.lines.length] };
      },
      markCut: (id) => set((g) => (g.bond[id] ? { bond: { ...g.bond, [id]: { ...g.bond[id], cut: true } } } : {})),
      talkHeroine: (id) => {
        const { bond, market } = get();
        const b = bond[id] ?? { pts: 0, day: -1 };
        const fresh = b.day !== market.day;
        if (fresh) set((g) => { const q = quarterOf(market.day); return { bond: { ...bond, [id]: { ...b, pts: b.pts + 1, day: market.day } }, qtalk: { key: q, n: (g.qtalk.key === q ? g.qtalk.n : 0) + 1 } }; });
        return { pts: b.pts, fresh };
      },
      selected: DEFAULT_CONFIG.stocks[0].id,
      pickSeq: 0,
      select: (id) => set((g) => ({ selected: id, pickSeq: g.pickSeq + 1 })),
      buy: (id, qty) => {
        const { market, cash, holdings } = get();
        const r = buyShares({ cash, holdings }, id, qty, market.prices[id]);
        if (typeof r === 'string') return r;
        const owe = get().loan?.principal ?? 0;
        if (owe > 0 && r.cash < owe) return `빌린 돈 ${Math.round(owe).toLocaleString('ko-KR')} 마나 아래로는 살 수 없어요`;
        set((g) => ({ cash: r.cash, holdings: r.holdings, trades: [...g.trades, { day: market.day, id, side: 'buy' as const, qty, price: market.prices[id], fee: r.fee }].slice(-200) }));
        mirror('POST', '/api/buy', { id, qty });
        return null;
      },
      sell: (id, qty) => {
        const { market, cash, holdings } = get();
        const r = sellShares({ cash, holdings }, id, qty, market.prices[id]);
        if (typeof r === 'string') return r;
        set((g) => ({ cash: r.cash, holdings: r.holdings, trades: [...g.trades, { day: market.day, id, side: 'sell' as const, qty, price: market.prices[id], pnl: r.pnl, fee: r.fee }].slice(-200) }));
        mirror('POST', '/api/sell', { id, qty });
        return null;
      },
      syncToNow: () => {
        const { market, skipDays } = get();
        const target = todayIdx() + skipDays;
        let m = marketAtDay(market.day); // 진짜 종가 시장(같은 날짜면 언제나 같다)
        if (market.day >= target) { // 같은 날이면 15분 슬롯이 바뀌었는지만 본다
          const v = view(m);
          if (DEFAULT_CONFIG.stocks.some((x) => v.prices[x.id] !== market.prices[x.id]) || get().orders.length) {
            set((g) => ({ market: v, ...(g.granted ? withFired(g.fired, payDividends(g.cash, g.holdings, g.trades, m, g.paidDay, m.day, g.orders, Date.now(), g.loan?.principal ?? 0)) : {}), paidDay: Math.max(g.paidDay, m.day - 1) }));
          }
          return 0;
        }
        while (m.day < target) m = nextDay(m);
        const v = view(m);
        set((g) => ({ market: v, ...withFired(g.fired, payDividends(g.cash, g.holdings, g.trades, m, g.paidDay, m.day, g.orders, Date.now(), g.loan?.principal ?? 0)), paidDay: Math.max(g.paidDay, m.day - 1) }));
        get().accrueLoan();
        return target - market.day;
      },
      fastForward: (days = 1) => {
        if (get().server) return; // 서버 모드는 현실 시간만 쓴다
        let m = marketAtDay(get().market.day);
        for (let i = 0; i < days; i++) m = nextDay(m);
        const v = view(m);
        set((g) => ({ market: v, skipDays: g.skipDays + days, ...withFired(g.fired, payDividends(g.cash, g.holdings, g.trades, m, g.paidDay, m.day, g.orders, Date.now(), g.loan?.principal ?? 0)), paidDay: Math.max(g.paidDay, m.day - 1) }));
        get().accrueLoan();
      },
      resetClock: () => set({ market: view(marketAtDay(todayIdx())), skipDays: 0, lastSeenDay: todayIdx() }),
      setLastSeen: (day) => set({ lastSeenDay: day }),
      grantCapital: () => set((g) => (g.granted ? g : { granted: true, cash: round2(g.cash + START_CASH), lastSeenDay: g.market.day })),
      setTutStep: (step, baseDay) => set((g) => ({ tutStep: step, tutBaseDay: baseDay ?? g.tutBaseDay })),
      reset: () => set({ market: view(marketAtDay(todayIdx())), cash: 0, holdings: {}, granted: false, looked: false, spent: 0, ownedLooks: [], ownedProps: [], gather: { day: -1, done: [] }, mats: {}, loan: null, shop: null, love: null, mounts: [], mount: 0, daily: { last: -1, n: 0 }, starter: 0, weekly: { stat: freshWeek(-1, 0), n: 0, last: -1 }, events: [], dun: { xp: 0, cls: null, ranks: {}, slots: [], swapDay: -1, owned: [], seed: newSeed(), sub: null }, dlog: { seen: [], mats: {}, items: { potion: 0, charm: 0 } }, act: { day: -1, sold: 0, fished: 0, casts: 0, dove: 0, tries: 0 }, fishLog: {}, rod: 1, gear: 1, earned: 0, lastRelief: -9999, town: {}, qtalk: { key: -1, n: 0 }, goalDone: [], titles: [], activeTitle: null, streak: { last: -1, n: 0 }, worthLog: {}, quest: { day: -1, ans: {} }, questCorrect: 0, server: null, localBackup: null, orders: [], fired: [], bond: {}, achv: {}, trades: [], paidDay: todayIdx(), tutStep: 0, tutBaseDay: 0, skipDays: 0, lastSeenDay: todayIdx() }),
    }),
    {
      name: 'mana-market-v1',
      version: 28, // 28: 부 직업(dun.sub) /  27: 직업은 성당에서 받는다(owned·seed) /  26: 클래스 6종·교차 장착·슬롯 5칸 / 25: 25: dun(던전 경험치·클래스·스킬) / 24: 24: weekly·events(주간 도전·이벤트) / 23: 23: starter(입문 과제) / 22: 22: 튜토리얼 8단계(생활 탭) / 21: 21: daily(오늘의 모험 목표 달성 일수) / 20: mounts·mount(탈것) / 19: love(히로인 인연) / 18: shop(내 상점) / 17: dlog(던전 재료·소모품·도감) / 16: act.tries(던전 하루 2회) / 15: act·fishLog·rod·earned(납품·낚시) / 14: loan(마나 은행) / 13: gather·mats(마을 일과) / 12: ownedLooks(눈·머리·옷 한정 모양) / 11: spent(영구 소비 합계) / 10: 마을 기부(town) / 9: 분기 목표·칭호(qtalk, goalDone, titles, activeTitle) / 8: streak(연속 접속) / 7: worthLog(월간 결산) / 6: bond.cut(완주 컷) / 5: 일일 의뢰(quest, questCorrect) 추가 — 없던 값은 merge가 기본값으로 채운다
      // 플레이어 데이터만 저장한다. 시장은 불러올 때 날짜로부터 다시 계산한다
      partialize: (g) => ({ cash: g.cash, holdings: g.holdings, trades: g.trades, granted: g.granted, tutStep: g.tutStep, tutBaseDay: g.tutBaseDay, skipDays: g.skipDays, lastSeenDay: g.lastSeenDay, selected: g.selected, look: g.look, looked: g.looked, nick: g.nick, bond: g.bond, achv: g.achv, spent: g.spent, ownedLooks: g.ownedLooks, ownedProps: g.ownedProps, gather: g.gather, mats: g.mats, loan: g.loan, shop: g.shop, love: g.love, mounts: g.mounts, mount: g.mount, daily: g.daily, starter: g.starter, weekly: g.weekly, events: g.events, dun: g.dun, dlog: g.dlog, act: g.act, fishLog: g.fishLog, rod: g.rod, gear: g.gear, earned: g.earned, lastRelief: g.lastRelief, town: g.town, qtalk: g.qtalk, goalDone: g.goalDone, titles: g.titles, activeTitle: g.activeTitle, streak: g.streak, worthLog: g.worthLog, quest: g.quest, questCorrect: g.questCorrect, orders: g.orders, fired: g.fired, server: g.server, localBackup: g.localBackup, paidDay: g.paidDay }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Game>;
        // 깨진 저장(숫자·객체가 아닌 값)이면 새 게임으로 시작한다: 시작조차 못 하는 것보다 낫다
        if (typeof p.cash !== 'number' || !p.holdings || typeof p.holdings !== 'object' || Array.isArray(p.holdings)) return current;
        const skipDays = p.skipDays ?? 0;
        const mk = marketAtDay(todayIdx() + skipDays);
        return { ...current, ...p, selected: DEFAULT_CONFIG.stocks.some((x) => x.id === p.selected) ? (p.selected as string) : current.selected, paidDay: p.paidDay ?? mk.day, look: { ...DEFAULT_LOOK, ...(p.look ?? {}) }, looked: p.looked ?? p.granted ?? false, nick: typeof p.nick === 'string' ? cleanNick(p.nick) : '', spent: typeof p.spent === 'number' ? p.spent : 0, ownedLooks: Array.isArray(p.ownedLooks) ? p.ownedLooks.filter((k) => typeof k === 'string') : [], ownedProps: Array.isArray(p.ownedProps) ? p.ownedProps.filter((n) => typeof n === 'number') : [], gather: p.gather && typeof p.gather.day === 'number' && Array.isArray(p.gather.done) ? p.gather : { day: -1, done: [] }, dun: p.dun && typeof p.dun.xp === 'number' ? { xp: Math.max(0, Math.floor(p.dun.xp)), cls: CLS_LIST.includes(p.dun.cls as Cls) ? (p.dun.cls as Cls) : null, ranks: p.dun.ranks && typeof p.dun.ranks === 'object' ? Object.fromEntries(Object.entries(p.dun.ranks).filter(([k, v]) => SKILL_BY_ID[k] && typeof v === 'number' && v >= 0 && v <= MAX_RANK)) : {}, slots: Array.isArray(p.dun.slots) ? p.dun.slots.filter((x) => typeof x === 'string' && SKILL_BY_ID[x]).slice(0, SLOT_COUNT) : [], swapDay: typeof p.dun.swapDay === 'number' ? p.dun.swapDay : -1, owned: ownedOf(p.dun), sub: subOf(p.dun), seed: typeof (p.dun as { seed?: number }).seed === 'number' ? (p.dun as { seed: number }).seed : newSeed() } : { xp: 0, cls: null, ranks: {}, slots: [], swapDay: -1, owned: [], seed: newSeed(), sub: null }, weekly: p.weekly && p.weekly.stat && typeof p.weekly.stat.k === 'number' && typeof p.weekly.n === 'number' && typeof p.weekly.last === 'number' ? { stat: { k: p.weekly.stat.k, casts: Number(p.weekly.stat.casts) || 0, gathers: Number(p.weekly.stat.gathers) || 0, tries: Number(p.weekly.stat.tries) || 0, best: Number(p.weekly.stat.best) || 0, seen0: Number(p.weekly.stat.seen0) || 0 }, n: Math.max(0, Math.floor(p.weekly.n)), last: p.weekly.last } : { stat: freshWeek(-1, 0), n: 0, last: -1 }, events: Array.isArray(p.events) ? p.events.filter((x) => typeof x === 'string').slice(-40) : [], starter: typeof p.starter === 'number' && p.starter >= 0 && p.starter <= STARTER.length ? Math.floor(p.starter) : 0, daily: p.daily && typeof p.daily.last === 'number' && typeof p.daily.n === 'number' && p.daily.n >= 0 ? { last: p.daily.last, n: Math.floor(p.daily.n) } : { last: -1, n: 0 }, mounts: Array.isArray(p.mounts) ? [...new Set(p.mounts.filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_MOUNT))] : [], mount: typeof p.mount === 'number' && Array.isArray(p.mounts) && p.mounts.includes(p.mount) ? p.mount : 0, love: p.love && typeof p.love.id === 'string' && LOVE[p.love.id] && typeof p.love.stage === 'number' && p.love.stage >= 0 && p.love.stage <= STAGE.married && typeof p.love.day === 'number' ? { id: p.love.id, stage: Math.floor(p.love.stage), day: p.love.day } : null, shop: p.shop && typeof p.shop.name === 'string' && typeof p.shop.lv === 'number' && p.shop.lv >= 1 && p.shop.lv <= SHOP_MAX ? { name: cleanShop(p.shop.name), lv: Math.floor(p.shop.lv) } : null, dlog: p.dlog && Array.isArray(p.dlog.seen) && p.dlog.mats && typeof p.dlog.mats === 'object' && p.dlog.items ? { seen: p.dlog.seen.filter((n) => typeof n === 'number'), mats: Object.fromEntries(Object.entries(p.dlog.mats).filter(([, v]) => typeof v === 'number' && v >= 0)), items: { potion: Math.min(ITEM_LIMIT, Math.max(0, Number(p.dlog.items.potion) || 0)), charm: Math.min(ITEM_LIMIT, Math.max(0, Number(p.dlog.items.charm) || 0)) } } : { seen: [], mats: {}, items: { potion: 0, charm: 0 } }, act: p.act && typeof p.act.day === 'number' && typeof p.act.sold === 'number' && typeof p.act.fished === 'number' && typeof p.act.casts === 'number' ? { day: p.act.day, sold: p.act.sold, fished: p.act.fished, casts: p.act.casts, dove: typeof p.act.dove === 'number' ? p.act.dove : 0, tries: typeof (p.act as { tries?: number }).tries === 'number' ? (p.act as { tries: number }).tries : 0 } : { day: -1, sold: 0, fished: 0, casts: 0, dove: 0, tries: 0 }, fishLog: p.fishLog && typeof p.fishLog === 'object' && !Array.isArray(p.fishLog) ? p.fishLog : {}, gear: typeof p.gear === 'number' && p.gear >= 1 && p.gear <= MAX_GEAR ? p.gear : 1, rod: typeof p.rod === 'number' && p.rod >= 1 && p.rod <= MAX_ROD ? p.rod : 1, earned: typeof p.earned === 'number' && p.earned >= 0 ? p.earned : 0, loan: p.loan && typeof p.loan.principal === 'number' && p.loan.principal > 0 && typeof p.loan.cap === 'number' && typeof p.loan.paidInterest === 'number' && typeof p.loan.paidDay === 'number' ? p.loan : null, mats: p.mats && typeof p.mats === 'object' && !Array.isArray(p.mats) ? Object.fromEntries(Object.entries(p.mats).filter(([, v]) => typeof v === 'number' && v >= 0)) : {}, lastRelief: typeof p.lastRelief === 'number' ? p.lastRelief : -9999, town: p.town && typeof p.town === 'object' && !Array.isArray(p.town) ? p.town : {}, qtalk: p.qtalk && typeof p.qtalk.n === 'number' && typeof p.qtalk.key === 'number' ? p.qtalk : { key: -1, n: 0 }, goalDone: Array.isArray(p.goalDone) ? p.goalDone : [], titles: Array.isArray(p.titles) ? p.titles : [], activeTitle: typeof p.activeTitle === 'string' ? p.activeTitle : null, streak: p.streak && typeof p.streak.n === 'number' && typeof p.streak.last === 'number' ? p.streak : { last: -1, n: 0 }, worthLog: p.worthLog && typeof p.worthLog === 'object' ? p.worthLog : {}, quest: p.quest && typeof p.quest.day === 'number' && p.quest.ans ? p.quest : { day: -1, ans: {} }, questCorrect: typeof p.questCorrect === 'number' ? p.questCorrect : 0, server: p.server && typeof p.server.url === 'string' && typeof p.server.token === 'string' ? p.server : null, localBackup: p.localBackup ?? null, orders: Array.isArray(p.orders) ? p.orders : [], fired: Array.isArray(p.fired) ? p.fired : [], bond: p.bond ?? {}, achv: p.achv ?? {}, trades: p.trades ?? [], skipDays, market: view(mk) };
      },
      migrate: (old, version) => {
        const o = old as Record<string, unknown>;
        if (version < 2) { o.granted = true; o.tutStep = TUT_LEN; o.tutBaseDay = 0; }
        migrateTutStep(o, version);
        if (version < 3) {
          // 예전 저장은 무작위 시장이었다: 보유 주식을 매수 금액만큼 현금으로 돌려주고 새 세계에서 시작한다
          const hs = (o.holdings ?? {}) as Record<string, Holding>;
          o.cash = round2(Number(o.cash ?? 0) + Object.values(hs).reduce((a, h) => a + h.cost, 0));
          o.holdings = {};
          o.skipDays = 0;
          o.lastSeenDay = todayIdx();
          delete o.market;
        }
        return o as unknown as Game;
      },
    },
  ),
);

export const netWorth = (g: Pick<Game, 'cash' | 'holdings' | 'market'> & { loan?: Loan | null }) =>
  g.cash - (g.loan?.principal ?? 0) + Object.entries(g.holdings).reduce((a, [id, h]) => a + h.qty * g.market.prices[id], 0);

/** 과거 어느 날 기준의 총자산 (자리를 비운 사이 얼마나 변했는지 계산할 때) */
export const netWorthAt = (g: Pick<Game, 'cash' | 'holdings' | 'market'> & { loan?: Loan | null }, day: number) =>
  g.cash - (g.loan?.principal ?? 0) + Object.entries(g.holdings).reduce((a, [id, h]) => a + h.qty * (g.market.history[id][Math.min(day, g.market.history[id].length - 1)] ?? g.market.prices[id]), 0);
