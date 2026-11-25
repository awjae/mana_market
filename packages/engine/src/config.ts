import { SECTORS, STOCKS, TEMPLATES } from './data';
import type { EngineConfig } from './types';

/** 밸런스는 여기서만 조정한다 */
export const DEFAULT_CONFIG: EngineConfig = {
  stocks: STOCKS,
  sectors: SECTORS,
  templates: TEMPLATES,
  drift: 0.00035,
  marketVol: 0.016,
  marketPhi: 0.2,
  sectorVol: 0.011,
  maxDailyMove: 0.15,
  intradayVol: 1.3,
  priceFloor: 1,
  eventChance: { stock: 0.38, sector: 0.19, kingdom: 0.05 },
  scale: { min: 0.5, max: 3, power: 3 },
};
