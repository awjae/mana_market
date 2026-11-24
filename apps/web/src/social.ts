import type { MarketState } from '@mana/engine';
import { hash } from './scene/hash';

/** 닉네임 규칙: 앞뒤 공백 제거, 한 줄, 2~8자 */
export const cleanNick = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 8);
export const validNick = (s: string) => cleanNick(s).length >= 2;

export interface Rival { id: string; name: string; title: string; style: 'steady' | 'trend' | 'contra' | 'focus'; join: number; }
export const STYLE_LINE: Record<Rival['style'], string[]> = {
  steady: ['나는 길드를 골고루 들고 있어. 한 곳에 몰아넣진 않아.', '느긋하게, 꾸준히. 장부는 매일 들여다보지.'],
  trend: ['요즘 시세가 오르는 길드를 눈여겨봐. 내 방식일 뿐이야.', '분위기를 타는 편이지. 틀릴 때도 많아.'],
  contra: ['남들이 팔 때 나는 한 번 더 살펴봐. 괜히 반대로 가는 버릇이야.', '내려간 길드부터 보게 되더라고.'],
  focus: ['한 길드에 집중하는 편이야. 마음 졸일 때도 많지.', '이것저것 들고 있으면 정신이 없어서 말이야.'],
};
export interface Rank { id: string; name: string; title: string; worth: number; me: boolean; style?: Rival['style']; week?: number; }

const NAMES: [string, string][] = [
  ['바르톨로', '떠돌이 행상'], ['에델가르트', '곡물 중개인'], ['쿠로', '그림자 상인'], ['폰 하이젠', '은행가의 아들'], ['미르카', '시장통 환전상'],
  ['돌고래 톰', '항구 거간꾼'], ['사슬의 렉스', '전직 용병'], ['향초 마담', '향신료 도매상'], ['늙은 오르페', '탑의 장부지기'], ['루미', '견습 연금술사'],
  ['철수염 간', '대장간 조합원'], ['베아트릭스', '보험 심사관'], ['달빛 하울', '야간 장사꾼'], ['핀', '심부름 소년'], ['그라지오', '귀족 집사'],
  ['낡은 모자 보', '노련한 상인'], ['세렌', '목장 상속녀'], ['야코프', '운하 선주'], ['틸다', '여관 안주인'], ['브란', '채석장 감독'],
];
/** 라이벌 상인(왕국이 만든 가상의 상인): 이름·합류일·투자 성향이 고정이라 모두에게 같다 */
export const RIVALS: Rival[] = NAMES.map(([name, title], i) => ({
  id: `r${i}`, name, title, join: Math.floor(hash(i, 1, 77) * 240),
  style: (['steady', 'trend', 'contra', 'focus'] as const)[Math.floor(hash(i, 2, 77) * 4)],
}));

const BOOK = 30000;
/** 라이벌 한 명의 오늘 총자산: 합류일에 1만 마나로 시작해 성향대로 며칠마다 다시 고른다. 시세 기록(history)만 쓰는 순수 계산 */
export function rivalWorth(r: Rival, m: MarketState, last = m.day): number {
  const ids = Object.keys(m.history);
  let cash = BOOK, hold: Record<string, number> = {};
  const px = (id: string, d: number) => m.history[id][Math.min(d, m.history[id].length - 1)];
  const value = (d: number) => cash + Object.entries(hold).reduce((a, [id, q]) => a + q * px(id, d), 0);
  const gap = 14 + Math.floor(hash(r.join, 3, 78) * 30);
  for (let d = r.join; d <= last; d += gap) {
    const w = value(d);
    const ret = (id: string) => px(id, d) / px(id, Math.max(0, d - 10)) - 1;
    const sorted = [...ids].sort((a, b) => ret(b) - ret(a));
    const pick = r.style === 'steady' ? ids : r.style === 'trend' ? sorted.slice(0, 3) : r.style === 'contra' ? sorted.slice(-3) : [ids[Math.floor(hash(r.join, d, 79) * ids.length)]];
    hold = {}; cash = 0;
    for (const id of pick) hold[id] = w / pick.length / px(id, d);
  }
  return value(last);
}

/** 순위표: 라이벌 20명과 나. 총자산 순 */
export function ranking(m: MarketState, me: { nick: string; worth: number; title?: string | null }): Rank[] {
  const rows: Rank[] = RIVALS.filter((r) => r.join <= m.day).map((r) => ({ id: r.id, name: r.name, title: r.title, worth: rivalWorth(r, m), me: false, style: r.style, week: r.join < m.day - 7 ? rivalWorth(r, m) / rivalWorth(r, m, m.day - 7) - 1 : undefined }));
  rows.push({ id: 'me', name: cleanNick(me.nick) || '이름 없는 상인', title: me.title || '나', worth: me.worth, me: true });
  return rows.sort((a, b) => b.worth - a.worth);
}
