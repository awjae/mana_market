import type { Season } from '@mana/engine';
import { EVENT_FISH_VALUE, eventOf } from './events';
import { specialOf } from './special';
import { weatherKind } from './calendar';
import { hash } from './scene/hash';
import type { MatKind } from './gather';

/** 활동 수입(디렉터 초안 수치): 채집물 납품(고정가)과 낚시. 시세와 무관하고 결과는 날짜·날씨·계절로 정해진다(뽑기 아님).
 *  하루 상한: 납품 30·낚시 40·합계 120. 낸 마나는 `earned`로 따로 세어 HUD의 시작 자금 대비 손익에서 뺀다 */
export const SELL_PRICE: Record<MatKind, number> = { plant: 5, fruit: 6, stone: 8 };
export const SELL_CAP = 30, FISH_CAP = 40, ACTIVITY_CAP = 120; // 활동 횟수는 제한이 없고, 하루에 받는 마나만 상한이 있다
export const FISH_VALUE = [4, 8, 14, 25];
export const ROD_PRICE: Record<number, number> = { 2: 600, 3: 1500, 4: 3500 };
export const MAX_ROD = 4;
export const FISH_NAMES: Record<Season, string[]> = {
  봄: ['붕어', '잉어', '은어', '벚꽃 송어'], 여름: ['피라미', '메기', '쏘가리', '비단 잉어'],
  가을: ['동자개', '숭어', '연어', '단풍 잉어'], 겨울: ['빙어', '꺽지', '산천어', '서리 철갑상어'],
};
export const fishKey = (season: Season, tier: number) => `${season}:${tier}`;

/** 오늘 cast번째(0부터) 낚시의 어종 등급(1~4). 낚싯대 레벨이 상한이고, 4등급은 비 오는 날 낚싯대 4일 때만 */
export function fishTier(day: number, cast: number, rod: number): number {
  const r = hash(day, cast, 77);
  let t = r < 0.4 ? 1 : r < 0.75 ? 2 : r < 0.95 ? 3 : 4;
  if (t === 4 && weatherKind(day) !== 'rain') t = 3;
  return Math.min(t, rod);
}

/** 던전(결정적 턴제, `dungeon.ts`): 하루 2번 들어가고 마나는 그날 가장 좋은 기록만큼만 받는다(하루 40). 장비 단계가 스탯을 정한다 */
export const DIVE_CAP = 40;
export const GEAR_PRICE: Record<number, number> = { 2: 800, 3: 2000, 4: 4500 };
export const MAX_GEAR = 4; // 마나로 사는 장비 단계는 기본 스탯 바닥만 정한다(성장은 레벨·스킬·유물). 예전에 5·6단계를 산 저장은 그대로 인정한다

/** ── 미니게임 판정(순수): 찌 게이지가 0~1 사이를 왕복하고, 중앙(0.5) 구간에서 멈추면 정확도 점수 0~3 ── */
export const triangle = (t: number) => { const x = ((t % 2) + 2) % 2; return x < 1 ? x : 2 - x; };
/** 눌렀을 때의 위치 → 점수(3 정확·2 좋음·1 아쉬움·0 빗나감). zone = 성공 구간의 반폭 */
export const judgeTiming = (pos: number, zone: number): 0 | 1 | 2 | 3 => { const d = Math.abs(pos - 0.5); return d <= zone * 0.35 ? 3 : d <= zone * 0.7 ? 2 : d <= zone ? 1 : 0; };
/** 낚시 난이도: 어종 등급이 높을수록 빠르고 좁다. 같은 날 같은 회차는 같은 패턴(실력으로 익히는 구조) */
export const fishDifficulty = (tier: number, day: number, cast: number, easy = false) => ({
  speed: 0.5 + 0.16 * tier + hash(day, cast, 35) * 0.12,
  zone: (0.17 - 0.02 * tier) * (easy ? 1.7 : 1),
  biteMs: 900 + Math.floor(hash(day, cast, 33) * 2200),
});
/** 낚시 보상: 점수 2 이상이면 값 전부, 1 이하면 절반(내림). 등급은 그대로 */
export const fishPayout = (value: number, score: number) => (score >= 2 ? value : Math.floor(value / 2));
/** 채집 반짝임 3곳(0~8칸 중): 날짜·채집점으로 고정 */
export const sparkleCells = (day: number, spot: number): number[] => {
  const out: number[] = [];
  for (let i = 0; out.length < 3; i++) { const c = Math.floor(hash(day, spot * 7 + i, 36) * 9); if (!out.includes(c)) out.push(c); }
  return out;
};

/** ── 낚시로 건지는 것: 물고기(계절·등급), 생물(게·새우·가재·바다거북), 물건(장화·병 속 편지·진주 등) ──
 *  무엇이 물렸는지는 (날짜, 회차, 낚싯대 단계)로 정해지는 결정적 값이다(뽑기 아님). 물건은 마나 값어치가 없고 수집·소품 재료로만 쓴다 */
export type CatchKind = 'fish' | 'creature' | 'item' | 'event';
export interface Catch { kind: CatchKind; id: string; name: string; value: number; /** 미니게임 난이도(1~4) */ level: number; /** 도감 키 */ key: string }
export const CREATURES = [
  { id: 'crab', name: '게', value: 4, rod: 1, level: 1 }, { id: 'shrimp', name: '새우', value: 6, rod: 1, level: 1 },
  { id: 'crayfish', name: '가재', value: 10, rod: 2, level: 2 }, { id: 'turtle', name: '바다거북', value: 20, rod: 3, level: 3 },
];
export const FOUND_ITEMS = [
  { id: 'boot', name: '낡은 장화', rod: 1 }, { id: 'bottle', name: '병 속 편지', rod: 1 }, { id: 'key', name: '녹슨 열쇠', rod: 1 }, { id: 'shell', name: '소라 껍데기', rod: 1 },
  { id: 'pearl', name: '진주', rod: 2 }, { id: 'coin', name: '해적 금화', rod: 2 }, { id: 'chest', name: '작은 보물상자', rod: 3 },
];
/** 소품 재료로 쌓이는 물건(나머지는 도감에만 등록된다) */
export const KEEP_ITEMS = ['shell', 'pearl', 'coin'];
export const CATCH_LABEL: Record<string, string> = { shell: '소라 껍데기', pearl: '진주', coin: '해적 금화', herb: '달빛 약초', goldfruit: '황금 열매', crystal: '수정 조각' };
/** 병 속 편지(이야기 한 줄, 매매 이야기 없음) */
export const LETTERS = [
  '"북쪽 등대지기는 오늘도 불을 켰습니다. 파도가 높아도 배는 돌아옵니다."', '"장터 빵집의 새 반죽은 호밀입니다. 이 편지를 읽은 분께 한 조각 드립니다."',
  '"항구의 갈매기는 사실 노래를 좋아합니다. 휘파람을 불어 보세요."', '"비 오는 날 부두 끝에서 보는 무지개는 이름이 따로 있답니다."',
  '"저는 오늘 처음 배를 탔습니다. 바다는 생각보다 훨씬 넓습니다."', '"모험가님, 동굴 입구 바위에는 이끼가 낀 쪽이 북쪽입니다."',
  '"아버지의 낡은 나침반을 이 병에 넣습니다. 누가 주우면 좋겠습니다."', '"별이 많은 밤엔 호수에 하늘이 한 번 더 뜹니다."',
];
export const FISH_OVER_RATE = 0.25; // 낚시 하루 상한(40)을 넘긴 뒤의 값: 4분의 1만 받는다(내림)
export const letterOf = (day: number, cast: number) => LETTERS[Math.floor(hash(day, cast, 80) * LETTERS.length)];

/** (날짜, 회차, 낚싯대)로 정해지는 오늘 cast번째 낚시의 결과 */
export function catchOf(day: number, cast: number, rod: number): Catch {
  const ev = eventOf(day);
  if (ev && hash(day, cast, 81) < 0.2) return { kind: 'event', id: `e:${ev.id}`, name: `${ev.name} 잉어`, value: EVENT_FISH_VALUE, level: 3, key: `e:${ev.id}` }; // 축제·기념일의 축제 물고기
  const r = hash(day, cast, 78), fishShare = specialOf(day).id === 'bigcatch' ? 0.35 : 0.6; // 풍어의 날엔 생물·물건이 두 배쯤
  if (r < fishShare) { const tier = fishTier(day, cast, rod); return { kind: 'fish', id: `t${tier}`, name: '', value: FISH_VALUE[tier - 1], level: tier, key: `t${tier}` }; }
  if (r < fishShare + (1 - fishShare) / 2) { const pool = CREATURES.filter((c) => c.rod <= rod), c = pool[Math.floor(hash(day, cast, 79) * pool.length)]; return { kind: 'creature', id: c.id, name: c.name, value: c.value, level: c.level, key: `c:${c.id}` }; }
  const pool = FOUND_ITEMS.filter((c) => c.rod <= rod), c = pool[Math.floor(hash(day, cast, 79) * pool.length)];
  return { kind: 'item', id: c.id, name: c.name, value: 0, level: 2, key: `i:${c.id}` };
}
