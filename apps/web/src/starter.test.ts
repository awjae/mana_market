import { describe, expect, it } from 'vitest';
import { STARTER, STARTER_TOTAL, type StarterState } from './starter';
import { placesFor } from './places';

const none: StarterState = { fishLog: {}, mats: {}, earned: 0, dlog: { seen: [] }, ownedProps: [], bond: {}, town: {}, shop: null, trades: [], questCorrect: 0, holdings: {}, orders: [] };
describe('입문 과제', () => {
  it('13개, 보상 합계 2,600 마나, 처음엔 아무것도 완료되지 않았다', () => {
    expect(STARTER).toHaveLength(13); expect(STARTER_TOTAL).toBe(2600);
    expect(STARTER.filter((t) => t.test(none))).toHaveLength(0);
    expect(new Set(STARTER.map((t) => t.id)).size).toBe(13);
  });
  it('기록이 맞으면 각 과제가 완료된다', () => {
    const t = (id: string) => STARTER.find((x) => x.id === id)!;
    expect(t('trade').test({ ...none, trades: [{ side: 'buy' }] })).toBe(true);
    expect(t('fish').test({ ...none, fishLog: { 'c:crab': 1 } })).toBe(true);
    expect(t('gather').test({ ...none, mats: { plant: 2, fruit: 1 } })).toBe(true); expect(t('gather').test({ ...none, mats: { plant: 2 } })).toBe(false);
    expect(t('sell').test({ ...none, earned: 25 })).toBe(true);
    expect(t('dive').test({ ...none, dlog: { seen: [0] } })).toBe(true); expect(t('dex').test({ ...none, dlog: { seen: [0, 1] } })).toBe(false); expect(t('dex').test({ ...none, dlog: { seen: [0, 1, 2] } })).toBe(true);
    expect(t('craft').test({ ...none, ownedProps: [17] })).toBe(true); expect(t('story').test({ ...none, bond: { a: { pts: 4 } } })).toBe(true);
    expect(t('quest').test({ ...none, questCorrect: 1 })).toBe(true);
    expect(t('spread').test({ ...none, holdings: { a: 1, b: 1 } })).toBe(false); expect(t('spread').test({ ...none, holdings: { a: 1, b: 1, c: 1 } })).toBe(true);
    expect(t('order').test({ ...none, orders: [{}] })).toBe(true); expect(t('order').test({ ...none, trades: [{ side: 'buy', lim: true }] })).toBe(true);
    expect(t('town').test({ ...none, town: { lamps: 1 } })).toBe(true); expect(t('shop').test({ ...none, shop: { lv: 1 } })).toBe(true);
  });
  it('걸어갈 장소가 있는 과제는 실제 장소 id를 쓴다', () => {
    const ids = placesFor({ shop: null, love: null }).map((p) => p.id);
    for (const t of STARTER) if (t.place) expect(ids).toContain(t.place);
  });
  it('하루 안에 끝낼 수 없는 과제(히로인 4번째 이야기)는 주식·활동 과제 뒤, 마지막 상점 과제 앞에 있다', () => {
    const ids = STARTER.map((t) => t.id);
    expect(ids.indexOf('story')).toBe(ids.indexOf('shop') - 1); expect(ids.indexOf('story')).toBeGreaterThan(ids.indexOf('town'));
  });
});
