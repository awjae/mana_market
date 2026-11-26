import type { PlaceId } from './places';

/** 입문 과제: 새로 시작한 사람이 "다음에 뭘 하지?"를 느끼지 않게 순서대로 이어지는 13개 과제(주식 4·활동 9). 하나를 마치면 작은 보상(일회성, 합계 2,600 마나)과 다음 과제가 나온다.
 *  기록이 맞으면 자동으로 완료된다. 전망·권유 없이 사실만 안내한다 */
export interface StarterState {
  fishLog: Record<string, number>; mats: Record<string, number>; earned: number; dlog: { seen: number[] }; ownedProps: number[];
  bond: Record<string, { pts: number }>; town: Record<string, number>; shop: { lv: number } | null; trades: { side: string; lim?: boolean }[];
  questCorrect: number; holdings: Record<string, unknown>; orders: unknown[];
}
export interface StarterTask { id: string; text: string; hint: string; place?: PlaceId; reward: number; test: (g: StarterState) => boolean }
const matSum = (g: StarterState) => (g.mats.plant ?? 0) + (g.mats.fruit ?? 0) + (g.mats.stone ?? 0);
export const STARTER: StarterTask[] = [
  { id: 'trade', text: '길드에서 첫 주식을 사 보세요', hint: '길드 건물 앞에서 Enter(터치는 버튼)로 거래 장부를 열어요.', reward: 100, test: (g) => g.trades.some((t) => t.side === 'buy') },
  { id: 'quest', text: '소식 탭 아래 의뢰에서 퀴즈를 하나 맞혀 보세요', hint: '소식 탭 맨 아래의 의뢰는 오늘의 소식과 시세로 푸는 사실 확인 문제예요. 정답 하나에 30 마나를 받아요.', reward: 100, test: (g) => g.questCorrect >= 1 },
  { id: 'fish', text: '부두에서 낚시를 한 번 해 보세요', hint: '항구 부두 끝에서 E키(터치는 버튼). 찌가 움직일 때 맞춰 눌러요.', place: 'fish', reward: 100, test: (g) => Object.keys(g.fishLog).length >= 1 },
  { id: 'gather', text: '채집점에서 재료를 3개 모아 보세요', hint: '덤불·풀숲·바위틈 앞에서 E키. 몇 번이고 할 수 있어요.', place: 'gather0', reward: 150, test: (g) => matSum(g) >= 3 },
  { id: 'sell', text: '모은 재료를 넘겨 마나를 받아 보세요', hint: '생활 탭의 "활동과 작업대"에서 재료 넘기기를 눌러요.', reward: 150, test: (g) => g.earned >= 25 },
  { id: 'dive', text: '동굴에 들어가 몬스터를 한 마리 쓰러뜨려 보세요', hint: '광장 위쪽 동굴 입구에서 E키. 몬스터가 다음 행동을 알려 줘요.', place: 'dive', reward: 200, test: (g) => g.dlog.seen.length >= 1 },
  { id: 'craft', text: '재료로 꾸미기 소품을 만들어 보세요', hint: '내 정보 탭의 꾸미기에서 "수공품 만들기"를 열어요.', reward: 200, test: (g) => g.ownedProps.some((p) => p >= 17) },
  { id: 'dex', text: '몬스터를 세 종류 만나 보세요', hint: '던전은 층마다 몬스터가 달라요. 도감은 생활 탭에서 볼 수 있어요.', place: 'dive', reward: 250, test: (g) => g.dlog.seen.length >= 3 },
  { id: 'spread', text: '서로 다른 길드 세 곳의 주식을 가져 보세요', hint: '업종이 다른 길드에서 사면 한 곳이 움직여도 다른 곳은 덜 흔들려요. 사실일 뿐 권유가 아니에요.', reward: 300, test: (g) => Object.keys(g.holdings).length >= 3 },
  { id: 'order', text: '예약 주문을 한 번 걸어 보세요', hint: '거래 장부 아래 "예약 주문"에서 원하는 가격을 정해 두면 15분마다 확인해 닿으면 체결돼요.', reward: 200, test: (g) => g.orders.length > 0 || g.trades.some((t) => t.lim) },
  { id: 'town', text: '마을 가꾸기에 한 번 마나를 써 보세요', hint: '생활 탭의 "마을 가꾸기"를 펼쳐 시설 하나에 기부해요. 쓴 마나는 돌아오지 않아요.', reward: 300, test: (g) => Object.values(g.town).some((n) => n >= 1) },
  { id: 'story', text: '히로인과 네 번째 이야기까지 나눠 보세요', hint: '하루에 한 번씩 히로인에게 말을 걸어요. 네 번째 날엔 소품 선물이 있어요.', place: 'h-lisel', reward: 250, test: (g) => Object.values(g.bond).some((b) => b.pts >= 4) },
  { id: 'shop', text: '마을에 내 상점을 열어 보세요', hint: '쓴 마나가 3,000이 되면 "내 상점"에서 이름을 지어 개업할 수 있어요.', reward: 300, test: (g) => !!g.shop },
];
export const STARTER_TITLE = '모험 입문자';
export const STARTER_TOTAL = STARTER.reduce((a, t) => a + t.reward, 0);
