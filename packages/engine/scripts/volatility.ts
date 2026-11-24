/** 변동성 지표: `npx tsx scripts/volatility.ts [seeds] [days]` — |일일 변동| 분포, 종목 최대 낙폭, 지수 수익률, 업종 격차, 첫 60일 */
import { DEFAULT_CONFIG as cfg, createMarket, nextDay } from '../src';

const seeds = Number(process.argv[2] ?? 60), days = Number(process.argv[3] ?? 300);
let n = 0, gt5 = 0, gt10 = 0, n60 = 0, gt5_60 = 0;
const dds: number[] = [], idx: number[] = [], dd60: number[] = [], sec: Record<string, number[]> = {};
const ixMoves: number[] = [], ixDD: number[] = [];
let broke = 0, runs = 0, minPrice = Infinity;
for (let sd = 1; sd <= seeds; sd++) {
  let m = createMarket(sd * 7919, cfg);
  for (let d = 0; d < days; d++) m = nextDay(m, cfg);
  idx.push(m.index[m.index.length - 1] / m.index[0] - 1);
  { let pk = m.index[0], dd = 0; for (let i = 1; i < m.index.length; i++) { ixMoves.push(Math.abs(m.index[i] / m.index[i - 1] - 1)); pk = Math.max(pk, m.index[i]); dd = Math.min(dd, m.index[i] / pk - 1); } ixDD.push(dd); }
  for (const s of cfg.stocks) {
    const h = m.history[s.id]; runs++;
    let peak = h[0], dd = 0, peak60 = h[0], dd6 = 0;
    for (let i = 1; i < h.length; i++) {
      const r = Math.abs(h[i] / h[i - 1] - 1); n++; if (r > 0.05) gt5++; if (r > 0.1) gt10++;
      if (i <= 60) { n60++; if (r > 0.05) gt5_60++; }
      peak = Math.max(peak, h[i]); dd = Math.min(dd, h[i] / peak - 1);
      if (i <= 60) { peak60 = Math.max(peak60, h[i]); dd6 = Math.min(dd6, h[i] / peak60 - 1); }
      minPrice = Math.min(minPrice, h[i]);
    }
    dds.push(dd); dd60.push(dd6);
    if (h[h.length - 1] / h[0] - 1 <= -0.7) broke++;
    (sec[s.sectorId] ??= []).push(h[h.length - 1] / h[0] - 1);
  }
}
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`|변동|>5%: ${(gt5 / n * 100).toFixed(2)}%  >10%: ${(gt10 / n * 100).toFixed(2)}%  (첫 60일 >5%: ${(gt5_60 / n60 * 100).toFixed(2)}%)`);
console.log(`종목 300일 최대 낙폭 중앙값 ${(med(dds) * 100).toFixed(1)}%  첫 60일 최대 낙폭 중앙값 ${(med(dd60) * 100).toFixed(1)}% / 최악 ${(Math.min(...dd60) * 100).toFixed(1)}%`);
console.log(`지수 평균 ${(avg(idx) * 100).toFixed(1)}%  범위 ${(Math.min(...idx) * 100).toFixed(0)}% ~ ${(Math.max(...idx) * 100).toFixed(0)}%`);
console.log('업종 평균', Object.entries(sec).map(([k, v]) => `${k} ${(avg(v) * 100).toFixed(0)}%`).join('  '), '| −70% 이하 종목 비율', (broke / runs * 100).toFixed(1) + '%', '| 최저가', minPrice.toFixed(2));

const frac = (th: number) => (ixMoves.filter((x) => x > th).length / ixMoves.length * 100).toFixed(2) + '%';
console.log(`지수 일일 |변동| 평균 ${(avg(ixMoves) * 100).toFixed(2)}%  >1% ${frac(0.01)}  >2% ${frac(0.02)}  >3% ${frac(0.03)}  | 지수 300일 최대 낙폭 중앙값 ${(med(ixDD) * 100).toFixed(1)}%`);
