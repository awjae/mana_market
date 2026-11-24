/**
 * 5층 도트 캐릭터: 피부 · 눈 · 머리 · 옷 · 소품. 16×21 격자(머리가 크고 몸이 작은 치비 비율).
 * 층마다 도트 모양(문자 격자)은 그대로 두고 팔레트만 갈아 끼운다.
 * 격자 문자: a 주색 · b 그늘 · c 포인트(머리=밝은 결, 옷=장식) · d 먹선 · h 하이라이트 · p 볼터치 · e 장화 · 그 밖은 소품 고정색.
 * 윤곽선은 합성한 실루엣에서 자동으로 만든다.
 */
export const GW = 16, GH = 21; // 머리를 크게, 몸은 작게(치비): 머리 12줄 + 몸 9줄
export interface Layer { y: number; rows: string[] }

export interface Look { skin: number; eyeShape: number; eyeColor: number; hairShape: number; hairColor: number; clothesShape: number; clothesColor: number; prop: number; propColor: number }
export const DEFAULT_LOOK: Look = { skin: 0, eyeShape: 0, eyeColor: 0, hairShape: 0, hairColor: 0, clothesShape: 0, clothesColor: 0, prop: 4, propColor: 0 };

export const SKINS = ['#ffe3cf', '#f8cba9', '#e2a37a', '#b9774f', '#7e4b31', '#d6ecff'];
export const EYE_COLORS = ['#7a6cff', '#3fb8ff', '#3ec47a', '#ff6b8a', '#ffb23b', '#35244a'];
export const HAIR_COLORS = ['#ff9a3c', '#f4d35e', '#8a5a35', '#3a2748', '#ff8fb8', '#6fd0ff', '#e8e8f4', '#b06cff'];
export const CLOTHES_COLORS: [string, string][] = [['#3ea36b', '#ffd25a'], ['#4a6cff', '#ffffff'], ['#d94f5c', '#ffd25a'], ['#7a4ad8', '#ffd25a'], ['#2f3a4f', '#ff8fb8'], ['#e8e0cf', '#5a7ad8']];
export const EYE_NAMES = ['동그란 눈', '또렷한 눈', '웃는 눈', '졸린 눈', '큰 눈', '윙크', '고양이 눈'];
export const HAIR_NAMES = ['트윈테일', '단발', '긴 머리', '포니테일', '올림머리', '보브컷', '곱슬머리'];
export const CLOTHES_NAMES = ['모험가 튜닉', '마법사 로브', '경갑', '드레스', '중갑', '후드 망토', '상인 조끼', '선원복', '왕실 예복', '별무늬 로브', '음유시인 옷', '도적 망토', '무도회 드레스', '농부 멜빵옷'];
export const PROP_NAMES = ['없음', '마법사 모자', '베레모', '왕관', '리본', '안경', '붉은 머리띠', '선원 모자', '밀짚모자', '별 머리핀', '은빛 머리장식', '고양이 귀', '토끼 귀', '천사 고리', '악마 뿔', '꽃 화관', '해적 두건', '풀잎 관', '들꽃 머리핀', '도토리 모자', '슬라임 모자', '해골 머리장식', '왕의 관', '심연의 뿔', '진주 머리핀', '해적 금화 머리장식', '소라 머리핀', '달빛 약초 화관', '황금 열매 머리핀', '수정 머리장식', '서리 거인의 관', '용의 뿔 머리띠', '축제 가면'];
/** 마나로 살 수 있는 한정 소품(번호 → 가격). 사면 영구히 내 것이다 */
/** 마나로 사는 한정 모양(눈·머리·옷): 품이 많이 든 모양과 인기 있는 모양. 번호 → 가격. 안 적힌 번호는 무료 */
export type LookKind = 'eye' | 'hair' | 'clothes';
export const LOOK_PRICE: Record<LookKind, Record<number, number>> = {
  eye: { 4: 1000, 5: 800, 6: 1500 },
  hair: { 3: 1000, 4: 800, 6: 1200 },
  clothes: { 3: 1500, 4: 2000, 7: 1200, 8: 3000, 9: 2000, 10: 1800, 11: 2200, 12: 2800, 13: 1200 },
};
export const lookKey = (kind: LookKind, i: number) => `${kind}:${i}`;
export const LOOK_COUNT: Record<LookKind, number> = { eye: 7, hair: 7, clothes: 14 };
/** 지금 고를 수 있는 번호들: 무료 + 산 것(+ 이미 쓰고 있는 것) */
export const usableLooks = (kind: LookKind, owned: string[], current?: number) =>
  Array.from({ length: LOOK_COUNT[kind] }, (_, i) => i).filter((i) => LOOK_PRICE[kind][i] === undefined || owned.includes(lookKey(kind, i)) || i === current);
export const PROP_PRICE: Record<number, number> = { 11: 300, 12: 400, 13: 500, 14: 600, 15: 800, 16: 1000 };
/** 기본으로 고를 수 있는 소품 수(0~5). 그 뒤는 히로인과 친해져야 열린다 */
export const BASE_PROPS = 6;
/** 해금 소품 → 그 히로인(호감 pts 4 = 이야기를 끝까지 들음) */
export const PROP_UNLOCK: Record<number, string> = { 6: 'kaira', 7: 'mira', 8: 'sera', 9: 'noa', 10: 'lisel' };
export const UNLOCK_PTS = 4;
export const ACC_COLORS = ['#ff8fb8', '#ffc13b', '#4a6cff', '#3ea36b', '#d94f5c', '#7a4ad8', '#2f3a4f', '#e8e8f4'];

export const INK = '#35244a';
const BOOT = '#5a3a2a', BOOT2 = '#3d271c';

// ── 피부 ──
export const SKIN_LAYER: Layer[] = [
  { y: 3, rows: ['....aaaaaaaa....', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '....aaaaaaaa....', '......bbbb......'] },
  { y: 15, rows: ['...a........a...'] }, // 손
  { y: 18, rows: ['.....aa..aa.....'] }, // 다리
];

// ── 눈 ──
export const EYES: Layer[] = [
  { y: 8, rows: ['.....dd..dd.....', '.....ah..ha.....', '.....aa..aa.....', '....pp....pp....'] },
  { y: 8, rows: ['.....dd..dd.....', '.....ah..ha.....', '....pp....pp....'] },
  { y: 8, rows: ['.....dd..dd.....', '....d..d.d..d...', '....pp....pp....'] },
  { y: 8, rows: ['....ddd..ddd....', '.....aa..aa.....', '....pp....pp....'] }, // 졸린 눈: 눈꺼풀이 내려온다
  { y: 8, rows: ['....ddd..ddd....', '....ahh..hha....', '....aaa..aaa....', '...pp......pp...'] }, // 큰 눈: 크고 반짝인다
  { y: 8, rows: ['.....dd..dd.....', '.....ah..d..d...', '....pp....pp....'] }, // 윙크: 오른쪽 눈을 감는다
  { y: 8, rows: ['.....dd..dd.....', '....daa..aad....', '....pp....pp....'] }, // 고양이 눈: 바깥 끝이 올라간다
];

// ── 머리: [뒤, 앞] ──
const FRONT: string[] = ['....aaaaaaaa....', '...aaaaaaaaaa...', '..aaaaccaaaaaa..', '..aaaaaaaaaaaa..', '...aa..aa..aa...', '...a........a...'];
export const HAIRS: { back: Layer; front: Layer }[] = [
  { // 트윈테일
    back: { y: 2, rows: ['....aaaaaaaa....', '...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '.aaa........aaa.', '.aab........baa.', '.aab........baa.', '.aab........baa.', '.aab........baa.', '.aab........baa.', '.aab........baa.', '..ab........ba..', '..bb........bb..', '...b........b...'] },
    front: { y: 1, rows: ['.......aa.......', ...FRONT] },
  },
  { back: { y: 2, rows: [] }, front: { y: 2, rows: FRONT } }, // 단발
  { // 긴 머리
    back: { y: 4, rows: ['..aaaaaaaaaaaa..', '..ab........ba..', '..ab........ba..', '..ab........ba..', '..ab........ba..', '..ab........ba..', '..ab........ba..', '..ab........ba..', '..ab........ba..', '..ab........ba..', '..ab........ba..', '..ab........ba..', '..bb........bb..', '...b........b...'] },
    front: { y: 2, rows: FRONT },
  },
  { // 포니테일: 오른쪽 아래로 꼬리가 늘어진다
    back: { y: 4, rows: ['.............aa.', '.............aaa', '.............aab', '.............aab', '.............ab.', '..............b.'] },
    front: { y: 2, rows: ['....aaaaaaaa....', '...aaaaaaaaaa...', '..aaaaccaaaaaa..', '..aaaaaaaaaaaa..', '...aa..aa..aa...'] },
  },
  { // 올림머리: 정수리에 둥근 쪽
    back: { y: 2, rows: [] },
    front: { y: 0, rows: ['.....aaaaaa.....', '.....aacaaa.....', '....aaaaaaaa....', '...aaaaaaaaaa...', '..aaaaccaaaaaa..', '..aaaaaaaaaaaa..', '...aa..aa..aa...', '...a........a...'] },
  },
  { // 보브컷: 턱선까지 내려오는 단발
    back: { y: 4, rows: ['..aaaaaaaaaaaa..', '..ab........ba..', '..ab........ba..', '..ab........ba..', '..ab........ba..', '..bb........bb..'] },
    front: { y: 2, rows: [...FRONT, '...a........a...', '...b........b...'] },
  },
  { // 곱슬머리: 풍성하게 부풀린 머리
    back: { y: 2, rows: ['...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '.aaaaaaaaaaaaaa.', '.aaaaaaaaaaaaaa.', '.aaaaaaaaaaaaaa.', '.aaa........aaa.', '.aab........baa.', '.aab........baa.', '..bb........bb..'] },
    front: { y: 1, rows: ['....aaaaaaaa....', '...aaaaaaaaaa...', '..aaaaccaaaaaa..', '..aaaaaaaaaaaa..', '..aaaaaaaaaaaa..', '..aaa..aa..aaa..'] },
  },
];

// ── 옷 ──
export const CLOTHES: Layer[] = [
  { y: 12, rows: [ // 모험가 튜닉: 어깨를 좁게, 짧은 몸통
    '....aaa..aaa....', '....aaaccaaa....', '....aaaaaaaa....', '....abaaaaba....', '.....cccccc.....', '.....aaaaaa.....', '................', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 마법사 로브
    '....aaa..aaa....', '....aaaccaaa....', '....aaaaaaaa....', '....abaaaaba....', '....aacccaaa....', '...aaaaaaaaaa...', '...bbbbbbbbbb...', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 경갑
    '...ccc....ccc...', '...aaccccccaa...', '....abccccba....', '....abaccaba....', '.....bbbbbb.....', '.....aaaaaa.....', '................', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 드레스: 치마가 넓게 퍼진다
    '....aaa..aaa....', '....aaaccaaa....', '....aaaaaaaa....', '....abaaaaba....', '....acccccca....', '...aaaaaaaaaa...', '..bbbbbbbbbbbb..', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 중갑: 큰 어깨 갑옷과 흉갑
    '..ccc......ccc..', '..aaccccccccaa..', '...abccccccba...', '....abccccba....', '....bbbbbbbb....', '....aaaaaaaa....', '................', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 후드 망토: 목을 감싸는 두건과 긴 망토
    '...aaaaaaaaaa...', '...aaaaccaaaa...', '...aaaaaaaaaa...', '...aabaaaabaa...', '...aaaaaaaaaa...', '...aabaaaabaa...', '...bbbbbbbbbb...', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 상인 조끼: 속옷 위에 조끼
    '....aaa..aaa....', '....acaaaaca....', '....acaaaaca....', '....acaaaaca....', '.....cccccc.....', '.....aaaaaa.....', '................', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 선원복: 넓은 깃과 줄무늬
    '....ccc..ccc....', '....aaccccaa....', '....aaaccaaa....', '....abaaaaba....', '.....cccccc.....', '.....aaaaaa.....', '................', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 왕실 예복: 금빛 깃과 가운데 장식이 있는 긴 코트
    '...cccc..cccc...', '...acccccccca...', '....aaaccaaa....', '....abaccaba....', '....aaaccaaa....', '...aaaaccaaaa...', '...bbbbccbbbb...', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 별무늬 로브: 별이 흩뿌려진 로브
    '....aaa..aaa....', '....aaaccaaa....', '....acaaaaca....', '....aaaacaaa....', '....acaaaaca....', '...aaaacaaaaa...', '...bbbbbbbbbb...', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 음유시인 옷: 어깨에서 허리로 가로지르는 띠
    '....aaa..aaa....', '....ccaaaaaa....', '....aaccaaaa....', '....aaaaccaa....', '....bbbbbbbb....', '....aaaaaaaa....', '................', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 도적 망토: 허리띠를 맨 긴 망토
    '...aaaaaaaaaa...', '...aabaaaabaa...', '...aaaaaaaaaa...', '...aabccccbaa...', '...aabaaaabaa...', '...aaaaaaaaaa...', '....bbbbbbbb....', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 무도회 드레스: 아주 넓은 치마
    '....aaa..aaa....', '....aaaccaaa....', '....aaaaaaaa....', '....acaaaaca....', '...aaacccaaaa...', '..aaaaaaaaaaaa..', '.aaabbbbbbbbaaa.', '....eee..eee....', '....fff..fff....'] },
  { y: 12, rows: [ // 농부 멜빵옷: 멜빵 달린 작업복
    '....aaa..aaa....', '....accaacca....', '....accaacca....', '....accaacca....', '.....bbbbbb.....', '.....aaaaaa.....', '................', '....eee..eee....', '....fff..fff....'] },
];

// ── 모자·악세사리 (머리 위에 겹쳐 그린다) ──
export const PROPS: Layer[] = [
  { y: 0, rows: [] },
  { y: 0, rows: [ // 마법사 모자
    '.......aa.......', '......aaaa......', '.....cccccc.....', '..aaaaaaaaaaaa..', '...bbbbbbbbbb...'] },
  { y: 0, rows: [ // 베레모
    '........c.......', '.....aaaaaa.....', '...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '...bbbbbbbbbb...'] },
  { y: 1, rows: [ // 왕관
    '....a..aa..a....', '....aaaaaaaa....', '....aacaacaa....'] },
  { y: 2, rows: [ // 리본
    '.........aaacaaa', '.........aa.c.aa'] },
  { y: 7, rows: [ // 안경
    '....aaaaaaaa....', '....a..aa..a....', '....a..aa..a....', '....a..aa..a....', '....aaaaaaaa....'] },
  { y: 4, rows: [ // 붉은 머리띠(카이라): 이마를 두르고 오른쪽에 매듭 꼬리
    '...aaaaaaaaaa...', '...bbbbbbbbbb.a.', '..............aa'] },
  { y: 1, rows: [ // 선원 모자(미라): 둥근 윗면 + 띠 + 챙
    '.....cccccc.....', '....cccccccc....', '...cccccccccc...', '...aaaaaaaaaa...', '..bbbbbbbbbbbb..'] },
  { y: 1, rows: [ // 밀짚모자(세라): 넓은 챙과 리본 띠
    '.....aaaaaa.....', '....aaaaaaaa....', '...cccccccccc...', '.aaaaaaaaaaaaaa.', 'bbbbbbbbbbbbbbbb'] },
  { y: 3, rows: [ // 별 머리핀(노아): 왼쪽 앞머리 위의 작은 별
    '...a............', '..aaa...........', '...a............'] },
  { y: 2, rows: [ // 은빛 머리장식(리젤): 이마 위의 가는 띠와 보석
    '....a..aa..a....', '....aaaaaaaa....', '.......cc.......'] },
  { y: 0, rows: [ // 고양이 귀(구매)
    '....a......a....', '...aaa....aaa...', '...aca....aca...'] },
  { y: 0, rows: [ // 토끼 귀(구매)
    '.....a....a.....', '....aca..aca....', '....aca..aca....'] },
  { y: 0, rows: [ // 천사 고리(구매)
    '.....aaaaaa.....', '....a......a....', '.....aaaaaa.....'] },
  { y: 0, rows: [ // 악마 뿔(구매)
    '...a........a...', '...aa......aa...', '....a......a....'] },
  { y: 2, rows: [ // 꽃 화관(구매)
    '...cacacacaca...'] },
  { y: 2, rows: [ // 해적 두건(구매): 매듭이 오른쪽으로
    '....aaaaaaaa....', '...aaaaaaaaaa...', '...bbbbbbbbbb.aa'] },
  { y: 2, rows: [ // 풀잎 관(수공품)
    '....a..cc..a....', '...aaaaaaaaaa...'] },
  { y: 3, rows: [ // 들꽃 머리핀(수공품)
    '...c............', '..cac...........', '...c............'] },
  { y: 1, rows: [ // 도토리 모자(수공품)
    '.......bb.......', '.....aaaaaa.....', '....bbbbbbbb....', '...bbbbbbbbbb...'] },
  { y: 0, rows: [ // 슬라임 모자(던전 재료)
    '.....aaaaaa.....', '...aaaaaaaaaa...', '..aaacaaaaaaa...', '...aaaaaaaaaa...'] },
  { y: 0, rows: [ // 해골 머리장식(던전 재료)
    '.....aaaaaa.....', '....aaaaaaaa....', '....acaaaaca....', '.....aaaaaa.....', '.....a.aa.a.....'] },
  { y: 0, rows: [ // 왕의 관(던전 재료)
    '..a..a.aa.a..a..', '..aa.aaaaaa.aa..', '...aaaaccaaaaa..', '...aaaaaaaaaaa..'] },
  { y: 3, rows: [ // 진주 머리핀(낚시)
    '...ca...........', '..caac..........', '...cc...........'] },
  { y: 1, rows: [ // 해적 금화 머리장식(낚시)
    '....a..a..a.....', '...aaa.aaa.aa...', '....a..a..a.....'] },
  { y: 3, rows: [ // 소라 머리핀(낚시)
    '................', '..........aa....', '.........aaca...', '..........aa....'] },
  { y: 2, rows: [ // 달빛 약초 화관(채집)
    '..a.a.cc.a.a....', '...aaaaaaaaa....'] },
  { y: 3, rows: [ // 황금 열매 머리핀(채집)
    '................', '.......aa.......', '......aaaa......', '.......aa.......'] },
  { y: 1, rows: [ // 수정 머리장식(채집)
    '.......c........', '......cac.......', '.....caaac......', '......aaa.......'] },
  { y: 0, rows: [ // 심연의 뿔(던전 재료)
    '..a..........a..', '..aa........aa..', '...aa......aa...', '...aac....caaa..'] },
  { y: 0, rows: [ // 서리 거인의 관(던전 심층)
    '.a..a..aa..a..a.', '.aa.aa.aa.aa.aa.', '..aaaaaaaaaaaa..', '..aacaaaacaaaa..'] },
  { y: 0, rows: [ // 용의 뿔 머리띠(던전 심층)
    '.a............a.', '.aa....cc....aa.', '..aa.aaaaaa.aa..', '...aaaaaaaaaa...'] },
  { y: 4, rows: [ // 축제 가면(축제 이벤트)
    '...aaaaaaaaaa...', '..aacaaaacaaaa..', '..aaaaaaaaaaaa..', '...a.aaaaaa.a...'] },
];

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
function mix(hex: string, to: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(hex), p(to)];
  return '#' + a.map((v, i) => lerp(v, b[i], t).toString(16).padStart(2, '0')).join('');
}
const pal = (main: string, accent?: string): Record<string, string> => ({ a: main, b: mix(main, '#3a2748', 0.28), c: accent ?? mix(main, '#ffffff', 0.4) });

export interface Cell { x: number; y: number; c: string }
/** 층 순서대로 겹쳐 격자를 만든다 (나중 층이 위). 윤곽선은 빈 칸 중 실루엣에 닿은 칸 */
/** back: 뒷모습(얼굴·눈·앞머리 없이 뒤통수와 뒷머리, 안경 없음). 위쪽으로 걸을 때 쓴다 */
export function composeLook(look: Look, back = false): { fill: Cell[]; line: Cell[] } {
  const grid = new Map<string, string>();
  const put = (l: Layer, p: Record<string, string>) =>
    l.rows.forEach((row, dy) => [...row].forEach((ch, x) => { if (ch !== '.' && p[ch]) grid.set(`${x},${l.y + dy}`, p[ch]); }));
  const hairP = pal(HAIR_COLORS[look.hairColor], mix(HAIR_COLORS[look.hairColor], '#ffffff', 0.45));
  const [cm, ca] = CLOTHES_COLORS[look.clothesColor];
  const eyeP = { a: EYE_COLORS[look.eyeColor], d: INK, h: '#ffffff', p: '#ff9bb8' };
  const clothesP = { ...pal(cm, ca), e: BOOT, f: BOOT2 };
  const hair = HAIRS[look.hairShape];
  put(hair.back, hairP);
  SKIN_LAYER.forEach((l) => put(l, pal(SKINS[look.skin])));
  if (back) {
    // 뒤통수: 얼굴 칸을 머리색으로 덮고, 아랫부분은 그늘, 가운데 윗부분에 결 하이라이트
    const head = SKIN_LAYER[0];
    head.rows.forEach((row, dy) => [...row].forEach((ch, x) => { if (ch === 'a') grid.set(`${x},${head.y + dy}`, dy >= 5 ? hairP.b : hairP.a); }));
    for (const x of [6, 7, 8]) grid.set(`${x},4`, hairP.c);
    const cl = CLOTHES[look.clothesShape];
    put({ y: cl.y, rows: cl.rows.map((r, i) => (i < 2 ? r.replace(/c/g, 'a') : r)) }, clothesP); // 목 장식(앞)은 뒤에선 안 보인다
    if (look.prop !== 5) put(PROPS[look.prop], pal(ACC_COLORS[look.propColor]));
  } else {
    put(CLOTHES[look.clothesShape], clothesP);
    put(EYES[look.eyeShape], eyeP);
    put(hair.front, hairP);
    put(PROPS[look.prop], pal(ACC_COLORS[look.propColor]));
  }
  const fill: Cell[] = [], line: Cell[] = [];
  const seen = new Set<string>();
  for (const [k, c] of grid) { const [x, y] = k.split(',').map(Number); fill.push({ x, y, c }); }
  for (const { x, y } of fill) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = `${x + dx},${y + dy}`;
    if (!grid.has(k) && !seen.has(k)) { seen.add(k); line.push({ x: x + dx, y: y + dy, c: INK }); }
  }
  return { fill, line };
}
