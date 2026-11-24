import { marketAtDay } from '@mana/engine';
import { describe, expect, it } from 'vitest';
import { cleanNick, ranking, RIVALS, validNick } from './social';

describe('social', () => {
  it('닉네임 규칙', () => {
    expect(cleanNick('  아  리아가나다라마바사  ')).toBe('아 리아가나다라');
    expect(validNick('a')).toBe(false);
    expect(validNick('아리')).toBe(true);
  });
  it('순위표: 결정적이고 총자산 내림차순, 나 포함, 합류 전 라이벌은 없음', () => {
    const m = marketAtDay(200);
    const a = ranking(m, { nick: '나', worth: 10000 }), b = ranking(m, { nick: '나', worth: 10000 });
    expect(a).toEqual(b);
    expect(a.filter((r) => r.me)).toHaveLength(1);
    for (let i = 1; i < a.length; i++) expect(a[i - 1].worth).toBeGreaterThanOrEqual(a[i].worth);
    expect(a.length).toBe(RIVALS.filter((r) => r.join <= 200).length + 1);
    expect(a.every((r) => r.worth > 0)).toBe(true);
    console.log(a.map((r) => Math.round(r.worth)).join(' '));
  });
});
