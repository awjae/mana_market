/** 소식을 보고 산 이득 재기: `npx tsx scripts/news-edge.ts [seeds] [days]`
 *  D일 정오(슬롯 48)에 소식의 대상 종목을 사서 ① D+1 시가 ② D+3 정오에 판다. 순수익은 왕복 수수료 0.4%를 뺀 값, 초과는 같은 구간 전체 종목 평균과의 차이.
 *  "공시를 읽으면 거의 이긴다"가 남아 있는지 보는 지표(가격 규칙은 바꾸지 않는다). */
import { DEFAULT_CONFIG as cfg, createMarket, nextDay, quoteAt, type MarketState } from '../src';

const seeds = Number(process.argv[2] ?? 40), days = Number(process.argv[3] ?? 300), FEE = 0.004;
const stat: Record<string, { n: number; net: number[]; ex: number[] }> = {};
const add = (k: string, net: number, ex: number) => { const s = (stat[k] ??= { n: 0, net: [], ex: [] }); s.n++; s.net.push(net); s.ex.push(ex); };
const exits: [string, number, number][] = [['D+1 시가', 1, 0], ['D+3 정오', 3, 48]];
let newsDays = 0, rumorDays = 0, goodRumorDays = 0, disc = 0;
for (let sd = 1; sd <= seeds; sd++) {
  let m: MarketState = createMarket(sd * 7919, cfg);
  for (let d = 0; d < days + 3; d++) m = nextDay(m, cfg);
  for (let d = 1; d <= days; d++) {
    const today = m.newsLog.filter((n) => n.day === d && n.targetStockIds.length);
    if (today.length) newsDays++;
    if (today.some((n) => n.kind === 'rumor')) rumorDays++;
    if (today.some((n) => n.kind === 'rumor' && n.tone === 'good')) goodRumorDays++;
    disc += today.filter((n) => n.kind === 'disclosure').length;
    const ret = (id: string, h: number, slot: number) => quoteAt(m, id, d + h, slot, cfg) / quoteAt(m, id, d, 48, cfg) - 1;
    for (const [label, h, slot] of exits) {
      const all = cfg.stocks.reduce((a, s) => a + ret(s.id, h, slot), 0) / cfg.stocks.length;
      for (const n of today) for (const id of n.targetStockIds) {
        const r = ret(id, h, slot);
        add(`${n.kind === 'rumor' ? '소문' : '공시'} ${n.tone} | ${label}`, r - FEE, r - all);
      }
    }
  }
}
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length, f = (x: number) => (x * 100).toFixed(2).padStart(7) + '%';
console.log(`시드 ${seeds}, ${days}일. 대상이 있는 소식이 나온 날 ${(newsDays / (seeds * days) * 100).toFixed(0)}%`);
console.log(`길드가 지목된 소문이 있는 날 ${(rumorDays / (seeds * days) * 100).toFixed(1)}% (좋은 소문 ${(goodRumorDays / (seeds * days) * 100).toFixed(1)}%), 하루 평균 공시 ${(disc / (seeds * days)).toFixed(2)}건`);
for (const k of Object.keys(stat).sort()) { const s = stat[k]; console.log(`${k.padEnd(28)} 건수 ${String(s.n).padStart(6)}  순수익 평균 ${f(avg(s.net))}  초과 ${f(avg(s.ex))}  이익 비율 ${(s.net.filter((x) => x > 0).length / s.n * 100).toFixed(0)}%`); }
