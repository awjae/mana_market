import { fantasyDate } from './calendar';
import { DEFAULT_CONFIG } from './config';
import type { EngineConfig } from './types';

/** 업종별 분기 배당률(주가 대비) 기본값: 금융이 가장 후하고 마법이 가장 짜다 */
const BASE: Record<string, number> = { finance: 0.009, farm: 0.007, arms: 0.006, trade: 0.005, magic: 0.003 };

/** 종목별 분기 배당률: 업종 기본값에 종목마다 ±몇 할 다르게(티커로 정해져 항상 같다) */
export function dividendYield(stockId: string, cfg: EngineConfig = DEFAULT_CONFIG): number {
  const s = cfg.stocks.find((x) => x.id === stockId);
  if (!s) return 0;
  const k = (s.id.charCodeAt(0) + s.id.charCodeAt(s.id.length - 1)) % 5;
  return (BASE[s.sectorId] ?? 0.005) * (0.85 + k * 0.075);
}

/** 배당일: 3·6·9·12월 30일(분기 끝). 연말 축제일은 아니다. 그날 아침 시가 기준으로 지급된다 */
export const isDividendDay = (day: number) => { const d = fantasyDate(day); return !d.festival && d.day === 30 && d.month % 3 === 0; };

/** 그날 한 주당 배당금(배당일이 아니면 0), 소수 둘째 자리까지 */
export const dividendPerShare = (stockId: string, day: number, price: number, cfg: EngineConfig = DEFAULT_CONFIG) =>
  isDividendDay(day) ? Math.round(price * dividendYield(stockId, cfg) * 100) / 100 : 0;
