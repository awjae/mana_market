/** 주민의 소식 반응: 이미 공개된 소식(소식 탭의 공시·소문)에 대한 직업별 감상과, 이미 마감된 어제의 시세 사실만 말한다.
 *  규칙: 앞날의 방향·크기·진위를 말하지 않는다. 소문엔 어조를 붙이지 않고 "소문일 뿐"으로만 받는다(소문의 tone·templateId·pending·effects·opens는 읽지 않는다). */
export type Group = 'arms' | 'farm' | 'magic' | 'money' | 'plain';
export const GROUP_OF: Record<string, Group> = {
  guard: 'arms', smith: 'arms', soldier: 'arms', miner: 'arms', farmer: 'farm', shepherd: 'farm', mage: 'magic', alchemist: 'magic',
  merchant: 'money', sailor: 'money', noble: 'money', clerk: 'money', villager: 'plain',
};
type Tone = 'good' | 'bad' | 'mixed';
/** 공시(확정된 일)에 대한 직업 관점의 감상 */
export const REACT_D: Record<Group, Record<Tone, string[]>> = {
  arms: { good: ['우리 쪽엔 반가운 소식이야.', '대장간에서도 이야기가 많겠군.'], bad: ['우리 쪽엔 걱정스러운 소식이군.', '병영에서도 말이 많겠어.'], mixed: ['좋고 나쁜 면이 다 있군.', '우리 쪽에선 의견이 갈리겠어.'] },
  farm: { good: ['밭에서도 반가워할 소식이네.', '이런 소식은 일손에 힘이 나지.'], bad: ['밭일하는 사람들은 걱정이겠어.', '이런 소식엔 한숨이 나오네.'], mixed: ['농사꾼들은 말이 갈리겠어.', '좋은 면도 나쁜 면도 있네.'] },
  magic: { good: ['탑에서도 반길 만한 소식이군.', '마나가 설레는 소식이야.'], bad: ['탑에서도 걱정이 돌겠군.', '마나가 어수선해지는 소식이야.'], mixed: ['마법사들도 의견이 갈리겠지.', '해석이 분분한 소식이군.'] },
  money: { good: ['장부에 적을 만한 반가운 소식이네.', '장터에서도 화제가 되겠군.'], bad: ['장터에서도 걱정이 돌겠군.', '장부 보는 손이 무거워지겠어.'], mixed: ['장터에서도 말이 갈리겠어.', '한쪽으로만 읽히진 않는군.'] },
  plain: { good: ['마을엔 반가운 소식이네요.', '듣기 좋은 소식이에요.'], bad: ['마을엔 걱정스러운 소식이네요.', '듣기 무거운 소식이에요.'], mixed: ['좋고 나쁜 면이 섞인 소식이에요.', '다들 생각이 다르겠어요.'] },
};
/** 소문에 대한 반응: 호재·악재를 가리지 않고 "아직 소문일 뿐"이라는 태도만 */
export const REACT_R = ['소문은 소문일 뿐이지.', '확인된 건 아니래.', '공시가 나와야 믿겠어.', '귓속말이니 걸러 들어.', '아직은 이야기일 뿐이야.'];

/** 어제(마감된 날)의 등락 사실. 종가 기록만 읽고 원인은 단정하지 않는다 */
export function movedYesterday(history: Record<string, number[]>, ids: string[], min = 0.04): { id: string; pct: number } | null {
  let best: { id: string; pct: number } | null = null;
  for (const id of ids) {
    const h = history[id]?.slice(0, -1); // 마지막(오늘, 일중 값)은 뺀다
    if (!h || h.length < 2) continue;
    const pct = h[h.length - 1] / h[h.length - 2] - 1;
    if (Math.abs(pct) >= min && (!best || Math.abs(pct) > Math.abs(best.pct))) best = { id, pct };
  }
  return best;
}
export const movedLine = (m: { id: string; pct: number }) => `어제 ${m.id}가 ${Math.round(Math.abs(m.pct) * 100)}% ${m.pct > 0 ? '올랐대' : '내렸대'}.`;
