import { hash } from './scene/hash';

/** 오늘의 특별 날: 매일 하나씩 바뀌는 생활 보너스(마나 보상 없음, 드롭·발견 확률만 바뀐다). 5일 중 4일꼴로 특별한 날이고, 어제와 같은 종류가 연달아 오지 않는다. */
export type SpecialId = 'bigcatch' | 'harvest' | 'migration' | 'merchant' | 'plain';
export interface Special { id: SpecialId; name: string; desc: string }
export const SPECIALS: Record<SpecialId, Special> = {
  bigcatch: { id: 'bigcatch', name: '풍어의 날', desc: '낚시에 생물과 물건이 두 배쯤 자주 걸려요.' },
  harvest: { id: 'harvest', name: '풍년의 날', desc: '채집에서 귀한 약초·열매·수정을 두 배 자주 찾아요.' },
  migration: { id: 'migration', name: '몬스터 대이동의 날', desc: '던전에서 몬스터를 쓰러뜨리면 재료를 두 개씩 남겨요.' },
  merchant: { id: 'merchant', name: '떠돌이 상인의 날', desc: '던전 층 사이마다 상인의 방이 하나씩 열려요.' },
  plain: { id: 'plain', name: '조용한 날', desc: '오늘은 특별한 일이 없어요. 하던 일을 천천히 해요.' },
};
const ORDER: SpecialId[] = ['bigcatch', 'harvest', 'migration', 'merchant', 'plain'];
const raw = (day: number): SpecialId => ORDER[Math.floor(hash(day, 3, 120) * ORDER.length)];
const cache = new Map<number, SpecialId>();
/** 어제 종류를 알아야 하므로 0일부터 이어서 계산해 기억해 둔다(몇 천 일이어도 반복문) */
export function specialOf(day: number): Special {
  let d = day; while (d > 0 && !cache.has(d)) d--;
  for (let i = d; i <= day; i++) {
    if (cache.has(i)) continue;
    let id = raw(i);
    if (i > 0 && id === cache.get(i - 1)) id = ORDER[(ORDER.indexOf(id) + 1 + Math.floor(hash(i, 4, 121) * 4)) % ORDER.length];
    cache.set(i, id);
  }
  return SPECIALS[cache.get(day)!];
}
