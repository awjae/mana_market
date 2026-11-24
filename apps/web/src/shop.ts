import { josa } from './josa';
import { hash } from './scene/hash';

/** 내 상점의 오늘 손님(수입 없음, 이야기만): 날짜와 상점 단계로 정해진다. 손님은 단계 수만큼 들르고, 진열 소품이 있으면 그 이야기를 한다 */
const WHO = ['마을 주민', '상인', '선원', '농부', '마법사', '경비병', '대장장이', '양치기'];
const LINES = ['가게를 한 바퀴 둘러보고 갔어요', '간판을 한참 올려다보다 갔어요', '이야기를 나누고 웃으며 돌아갔어요', '다음에 또 들르겠다고 했어요', '가게 앞에서 잠깐 쉬었다 갔어요'];
export const visitorsOf = (day: number, lv: number, props: string[]): string[] =>
  Array.from({ length: Math.min(3, lv) }, (_, i) => {
    const who = WHO[Math.floor(hash(day, i, 95) * WHO.length)], line = LINES[Math.floor(hash(day, i, 96) * LINES.length)];
    const item = props.length && hash(day, i, 97) < 0.5 ? props[Math.floor(hash(day, i, 98) * props.length)] : null;
    return item ? `${josa(who, '이가')} ${josa(item, '을를')} 구경하고 ${line.replace(/가게를 한 바퀴 둘러보고 갔어요|간판을 한참 올려다보다 갔어요/, '돌아갔어요')}` : `${josa(who, '이가')} ${line}`;
  });
