import { fantasyDate } from '@mana/engine';

/** 축제·기념일 이벤트: 건국력의 연말 축제 5일과 기념일 7일. 이날은 낚시에 축제 물고기가, 던전 3층에 축제 도깨비가 나오고 생활 탭에 이벤트 과제가 열린다.
 *  날짜로 정해지는 결정적 값이다(마나 보상 없음, 칭호만). */
export interface GameEvent { id: string; name: string; /** 이 이벤트가 열리는 해 포함 키 */ key: string }
export function eventOf(day: number): GameEvent | null {
  const d = fantasyDate(day);
  if (d.festival) return { id: `fest-${d.dayOfYear - 360}`, name: d.festival, key: `${d.year}:fest-${d.dayOfYear - 360}` };
  if (d.holiday) return { id: `hol-${d.month}-${d.day}`, name: d.holiday.name, key: `${d.year}:hol-${d.month}-${d.day}` };
  return null;
}
/** 이벤트 참가 칭호 */
export const eventTitle = (e: GameEvent) => `${e.name}의 손님`;
/** 이벤트 과제(오늘 기록으로 센다): 낚시 3번·채집 3번·던전 1번 */
export const EVENT_TASKS = [
  { id: 'fish', text: '낚시 3번 하기', need: 3 }, { id: 'gather', text: '채집 3번 하기', need: 3 }, { id: 'dive', text: '던전에 1번 들어가기', need: 1 },
] as const;
/** 이벤트 날 낚시에 걸리는 축제 물고기(값은 비싼 물고기와 같고 이름만 이벤트 이름을 딴다) */
export const EVENT_FISH_VALUE = 25;
