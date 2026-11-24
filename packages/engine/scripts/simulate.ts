// 사용: npm run sim -- [--days 100] [--seeds 20]
import { DEFAULT_CONFIG as cfg, createMarket, nextDay, type MarketState } from '../src';

const arg = (name: string, def: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : def;
};
const days = arg('days', 100);
const seeds = arg('seeds', 20);

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));
const pct = (x: number, d = 2) => (Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : '-');
const rets = (h: number[]) => h.slice(1).map((p, i) => p / h[i] - 1);

const runs: MarketState[] = [];
for (let seed = 1; seed <= seeds; seed++) {
  let s = createMarket(seed);
  for (let d = 0; d < days; d++) s = nextDay(s);
  runs.push(s);
}

console.log(`\n=== ${days}일 × ${seeds}시드 시뮬레이션 ===\n`);

console.log('종목별 (시드 평균)');
console.log('종목  업종        누적수익률  일변동성  최저/최고(배)');
for (const st of cfg.stocks) {
  const total = runs.map((s) => s.prices[st.id] / st.startPrice - 1);
  const vol = runs.map((s) => sd(rets(s.history[st.id])));
  const lo = Math.min(...runs.flatMap((s) => s.history[st.id])) / st.startPrice;
  const hi = Math.max(...runs.flatMap((s) => s.history[st.id])) / st.startPrice;
  const sector = cfg.sectors.find((x) => x.id === st.sectorId)!.name;
  console.log(
    `${st.id}  ${sector.padEnd(8)}  ${pct(mean(total)).padStart(9)}  ${pct(mean(vol)).padStart(7)}  ${lo.toFixed(2)} / ${hi.toFixed(2)}`,
  );
}

const all = runs.flatMap((s) => Object.values(s.history).flatMap(rets));
const sorted = [...all].sort((a, b) => a - b);
console.log('\n일일 변동률 분포');
console.log(
  `평균 ${pct(mean(all), 3)} | 표준편차 ${pct(sd(all))} | 1% ${pct(sorted[Math.floor(all.length * 0.01)])} | 99% ${pct(sorted[Math.floor(all.length * 0.99)])} | 최소 ${pct(sorted[0])} | 최대 ${pct(sorted[sorted.length - 1])}`,
);
console.log(`|변동| > 5%: ${pct(all.filter((x) => Math.abs(x) > 0.05).length / all.length)}, > 10%: ${pct(all.filter((x) => Math.abs(x) > 0.1).length / all.length)}`);

const idx = runs.map((s) => s.index[s.index.length - 1] / s.index[0] - 1);
console.log(`\n왕국 종합지수 ${days}일 수익률: 평균 ${pct(mean(idx))}, 범위 ${pct(Math.min(...idx))} ~ ${pct(Math.max(...idx))}`);

console.log('\n이벤트 영향 (공시일 d 이후 주 대상 종목의 방향 보정 수익률 평균, 일반 변동 포함)');
console.log('템플릿              공시  소문   d+1      d+2      d+3      d+4');
for (const t of cfg.templates) {
  const dir = Math.sign(t.impacts[0].magnitude);
  const log = runs.flatMap((s) => s.newsLog.map((n) => ({ s, n }))).filter((x) => x.n.templateId === t.id);
  const disc = log.filter((x) => x.n.kind === 'disclosure');
  const rumors = log.filter((x) => x.n.kind === 'rumor').length;
  const cols = [1, 2, 3, 4].map((k) => {
    const v = disc.flatMap(({ s, n }) =>
      n.targetStockIds.filter(() => n.day + k <= s.day).map((id) => dir * (s.history[id][n.day + k] / s.history[id][n.day + k - 1] - 1)),
    );
    return pct(mean(v)).padStart(7);
  });
  console.log(`${t.id.padEnd(18)}  ${String(disc.length).padStart(4)}  ${String(rumors).padStart(4)}  ${cols.join('  ')}`);
}
console.log('\n(d+2 이후가 양수면 여진, d+2/d+3이 음수면 과잉 반응 되돌림)\n');
