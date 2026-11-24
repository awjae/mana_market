import { DEFAULT_CONFIG } from './config';
import { KST_OFFSET_MS } from './calendar';
import { regimeAt } from './regimes';
import { daySeed, gauss, mulberry32 } from './rng';
import type { EngineConfig, MarketState } from './types';

/**
 * 일중 시세: 하루의 시가(전날 종가 + 공시 갭)에서 종가까지를 15분 슬롯 96개로 걷는 결정적 브라운 다리.
 * - 종가(`history[day]`)는 일 단위 엔진이 이미 정한 값이고 바뀌지 않는다(그래서 과거 시세·골든 테스트가 그대로다).
 * - 일중 경로는 (시드, 날짜, 종목)의 해시로만 만든 별도 난수라 모든 플레이어가 같은 시각에 같은 값을 본다.
 * - 시가는 장 마감 후 공시를 자정 갭으로 먼저 반영하므로, 낮 동안의 움직임은 예측할 수 없다(마팅게일에 가깝다).
 * - 24시간 연속(폐장 없음), KST 기준. 슬롯 값은 계단식 고정가다.
 */
export const INTRADAY_VERSION = 1;
export const SLOTS = 96, SLOT_MS = 900_000, DAY_MS = 86_400_000;

/** 지금이 KST 하루 중 몇 번째 15분 슬롯인지(0~95) */
export const slotIndexAt = (ms: number) => Math.floor(((((ms + KST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS) / SLOT_MS);
/** 다음 슬롯 경계까지 남은 ms */
export const msUntilNextSlot = (ms: number) => SLOT_MS - ((((ms + KST_OFFSET_MS) % SLOT_MS) + SLOT_MS) % SLOT_MS);

const round2 = (x: number) => Math.round(x * 100) / 100;
const cache = new Map<string, number[]>();
const strHash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** 그날 종목의 노드 97개: [0]=시가, [96]=종가. 노드 k가 슬롯 k의 가격이다(96은 마감값). `m.history`/`m.opens`에 그날이 있어야 한다 */
export function dayNodes(m: MarketState, id: string, day: number, cfg: EngineConfig = DEFAULT_CONFIG): number[] {
  const open = m.opens[id]?.[day], close = m.history[id]?.[day];
  const key = `${m.seed}:${day}:${id}:${open}:${close}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (open === undefined || close === undefined) return [close ?? open ?? 0];
  const s = cfg.stocks.find((x) => x.id === id)!, regime = regimeAt(m.seed, day);
  // 종목의 "남는" 일변동: 시장·업종·종목 노이즈를 합친 크기
  const sigma = Math.sqrt((cfg.marketVol * regime.vol) ** 2 + (s.beta * cfg.sectorVol) ** 2 + s.idioVol ** 2) * cfg.intradayVol;
  const r = mulberry32(daySeed(m.seed, day) ^ strHash(`intraday:${id}`));
  const W: number[] = [0];
  for (let k = 1; k <= SLOTS; k++) W.push(W[k - 1] + gauss(r) / Math.sqrt(SLOTS));
  const lo = Math.max(cfg.priceFloor, Math.min(open, close) * (1 - cfg.maxDailyMove)), hi = Math.max(open, close) * (1 + cfg.maxDailyMove);
  const lnO = Math.log(open), lnC = Math.log(close), out: number[] = [];
  for (let k = 0; k <= SLOTS; k++) {
    const bridge = W[k] - (k / SLOTS) * W[SLOTS];
    out.push(k === 0 ? open : k === SLOTS ? close : Math.min(hi, Math.max(lo, round2(Math.exp(lnO + (lnC - lnO) * (k / SLOTS) + sigma * bridge)))));
  }
  if (cache.size > 4000) cache.clear();
  cache.set(key, out);
  return out;
}

/** 어느 날 어느 슬롯의 가격(슬롯 0~95; 96이면 종가). 첫날(0일)은 하루 종일 시작가 */
export const quoteAt = (m: MarketState, id: string, day: number, slot: number, cfg: EngineConfig = DEFAULT_CONFIG) =>
  day === 0 ? m.history[id][0] : dayNodes(m, id, day, cfg)[Math.min(SLOTS, Math.max(0, slot))];

/** 지금 시각의 시장 뷰: 오늘 항목의 가격(`prices`, `history` 마지막, `index`)을 현재 슬롯 값으로 바꾼다.
 *  UI와 체결은 이 뷰를 읽는다. 진짜 종가는 원본 `m`에만 있고 UI에 새지 않는다 */
export function liveMarket(m: MarketState, ms: number, cfg: EngineConfig = DEFAULT_CONFIG): MarketState {
  if (m.day === 0) return m;
  const slot = slotIndexAt(ms);
  const prices: Record<string, number> = {}, history: Record<string, number[]> = {};
  for (const s of cfg.stocks) {
    prices[s.id] = quoteAt(m, s.id, m.day, slot, cfg);
    history[s.id] = [...m.history[s.id].slice(0, -1), prices[s.id]];
  }
  const avg = cfg.stocks.reduce((a, s) => a + prices[s.id] / s.startPrice, 0) / cfg.stocks.length;
  return { ...m, prices, history, index: [...m.index.slice(0, -1), round2(1000 * avg)] };
}

/** 어제까지 확정된 종가만 담은 뷰(오늘 가격은 뺀다): 의뢰·월간 결산·업적처럼 일중에 흔들리면 안 되는 곳에 쓴다 */
export function closedMarket(m: MarketState): MarketState {
  if (m.day === 0) return m;
  const history: Record<string, number[]> = {}, prices: Record<string, number> = {}, opens: Record<string, number[]> = {};
  for (const id of Object.keys(m.history)) { history[id] = m.history[id].slice(0, -1); opens[id] = m.opens[id].slice(0, -1); prices[id] = history[id][history[id].length - 1]; }
  return { ...m, day: m.day - 1, prices, history, opens, index: m.index.slice(0, -1) };
}
