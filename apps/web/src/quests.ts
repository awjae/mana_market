import { DEFAULT_CONFIG as cfg, closedMarket, type MarketState } from '@mana/engine';
import { change } from './format';
import { hash } from './scene/hash';

/** 일일 의뢰: 오늘의 시세·소식에서 사실을 확인하는 퀴즈. 정답은 엔진 데이터로만 정해지고(날짜 해시로 질문·보기 고정) 매매 권유와 무관하다 */
export interface Quest { id: string; text: string; options: string[]; answer: number }
export const QUEST_REWARD = 30; // 정답 1개당 마나. 하루 최대 3개 = 90 (총자산 1만 대비 1% 미만이라 매매 판단을 왜곡하지 않는다)

const tickers = cfg.stocks.map((s) => s.id);
const nameOf = (id: string) => cfg.stocks.find((s) => s.id === id)?.name ?? id;
const secName = (id: string) => cfg.sectors.find((s) => s.id === id)?.name ?? id;

/** 정답 하나 + 보기 3개(날짜로 고정된 순서) */
function pick<T>(correct: T, pool: T[], day: number, salt: number): { options: T[]; answer: number } {
  const wrong = pool.filter((x) => x !== correct).sort((a, b) => hash(day, pool.indexOf(a), salt) - hash(day, pool.indexOf(b), salt)).slice(0, 3);
  const all = [correct, ...wrong].sort((a, b) => hash(day, String(a).length * 31 + pool.indexOf(a), salt + 9) - hash(day, String(b).length * 31 + pool.indexOf(b), salt + 9));
  return { options: all, answer: all.indexOf(correct) };
}

type Maker = (m: MarketState) => Quest | null;
const MAKERS: Maker[] = [
  (m) => { // 어제보다 가장 많이 오른 길드
    const best = [...tickers].sort((a, b) => change(m.history[b]) - change(m.history[a]))[0], p = pick(best, tickers, m.day, 1);
    return { id: 'top-up', text: '어제 하루 가장 많이 오른 길드는?', options: p.options.map((t) => `${t} ${nameOf(t)}`), answer: p.answer };
  },
  (m) => { // 가장 많이 내린
    const best = [...tickers].sort((a, b) => change(m.history[a]) - change(m.history[b]))[0], p = pick(best, tickers, m.day, 2);
    return { id: 'top-down', text: '어제 하루 가장 많이 내린 길드는?', options: p.options.map((t) => `${t} ${nameOf(t)}`), answer: p.answer };
  },
  (m) => { // 시세가 가장 높은
    const best = [...tickers].sort((a, b) => m.prices[b] - m.prices[a])[0], p = pick(best, tickers, m.day, 3);
    return { id: 'top-price', text: '어제 마감 때 한 주 시세가 가장 높은 길드는?', options: p.options.map((t) => `${t} ${nameOf(t)}`), answer: p.answer };
  },
  (m) => { // 오늘 가장 강한 업종
    const avg = (sid: string) => { const ids = cfg.stocks.filter((s) => s.sectorId === sid).map((s) => s.id); return ids.reduce((a, id) => a + change(m.history[id]), 0) / ids.length; };
    const sec = cfg.sectors.map((s) => s.id), best = [...sec].sort((a, b) => avg(b) - avg(a))[0], p = pick(best, sec, m.day, 4);
    return { id: 'top-sector', text: '어제 평균 등락이 가장 좋은 업종은?', options: p.options.map(secName), answer: p.answer };
  },
  (m) => { // 최근 3일 안에 공시가 난 길드
    const ids = [...new Set([...m.news, ...m.newsLog.filter((n) => n.day >= m.day - 3)].filter((n) => n.kind === 'disclosure').flatMap((n) => n.targetStockIds))];
    if (!ids.length) return null;
    const hit = ids[Math.floor(hash(m.day, 7, 5) * ids.length)], pool = tickers.filter((t) => t === hit || !ids.includes(t));
    if (pool.length < 4) return null;
    const p = pick(hit, pool, m.day, 5);
    return { id: 'disclosed', text: '최근 사흘 안에 공시가 난 길드는?', options: p.options.map((t) => `${t} ${nameOf(t)}`), answer: p.answer };
  },
];

/** 오늘의 의뢰 3개(질문 종류는 날짜로 정해진다) */
export function questsFor(m: MarketState): Quest[] {
  const order = MAKERS.map((_, i) => i).sort((a, b) => hash(m.day, a, 41) - hash(m.day, b, 41));
  const out: Quest[] = [], c = { ...closedMarket(m), day: m.day }; // 낮 동안 흔들리는 가격이 아니라 확정된 종가로 묻는다(답이 하루 종일 같다)
  for (const i of order) { const q = MAKERS[i](c); if (q) out.push(q); if (out.length === 3) break; }
  return out;
}
