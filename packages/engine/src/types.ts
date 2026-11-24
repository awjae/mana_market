export type Scope = 'stock' | 'sector' | 'kingdom';
export type Tone = 'good' | 'bad' | 'mixed';

export interface Sector { id: string; name: string }

export interface Stock {
  id: string;
  name: string;
  sectorId: string;
  startPrice: number;
  /** 업종 요인에 대한 민감도 */
  beta: number;
  /** 종목 고유 일일 노이즈 표준편차 */
  idioVol: number;
}

/** to: 'target' = 이벤트 대상(종목 또는 업종), 'all' = 전 종목, {sector} = 해당 업종 */
export interface ImpactRule {
  to: 'target' | 'all' | { sector: string };
  /** 부호 있는 기본 충격(비율). 실제 충격 = magnitude × 이벤트 강도 */
  magnitude: number;
  /** 이 확률로 방향이 반대가 된다 (업종별로 불확실한 영향) */
  flipChance?: number;
}

export interface EventTemplate {
  id: string;
  scope: Scope;
  tone: Tone;
  weight: number;
  /** sector scope일 때 대상이 될 수 있는 업종 */
  sectors?: string[];
  impacts: ImpactRule[];
  /** 발생 후 며칠간의 충격 배율. [1, .5, .25] = 여진, [1.3, -.5, -.3] = 과잉 반응 후 되돌림 */
  schedule: number[];
  /** 공시 전에 소문이 먼저 나올 확률 */
  rumorChance: number;
  /** 소문이 실제 사건으로 이어질 확률 (나머지는 헛소문) */
  rumorAccuracy: number;
  rumorLead: [number, number];
  disclosure: string;
  rumor: string;
}

export interface EngineConfig {
  stocks: Stock[];
  sectors: Sector[];
  templates: EventTemplate[];
  drift: number;
  marketVol: number;
  /** 시장 흐름의 자기상관(0~1) */
  marketPhi: number;
  sectorVol: number;
  maxDailyMove: number;
  /** 일중 경로의 진폭 배율(종목 잔차 변동에 곱한다) */
  intradayVol: number;
  priceFloor: number;
  /** 하루에 범위별로 이벤트가 추첨될 확률 */
  eventChance: Record<Scope, number>;
  /** 강도 = min + (max-min) × u^power. power가 클수록 큰 이벤트가 드물다 */
  scale: { min: number; max: number; power: number };
}

export interface ActiveEffect {
  eventId: string;
  stockIds: string[];
  magnitude: number;
  schedule: number[];
  age: number;
}

export interface PendingEvent {
  templateId: string;
  targetId?: string;
  scale: number;
  fireDay: number;
}

/** 가격 영향 크기는 담지 않는다 (유저는 방향만 추측) */
export interface NewsItem {
  day: number;
  kind: 'disclosure' | 'rumor';
  templateId: string;
  scope: Scope;
  tone: Tone;
  text: string;
  /** 주 대상 종목들 (kingdom 혼합 이벤트는 첫 번째 규칙의 대상) */
  targetStockIds: string[];
}

export interface MarketState {
  seed: number;
  day: number;
  marketFactor: number;
  prices: Record<string, number>;
  history: Record<string, number[]>;
  /** 날짜별 시가(전날 종가 × 그날 반영되는 이벤트 갭). history와 같은 길이. 일중 경로의 출발점 */
  opens: Record<string, number[]>;
  index: number[];
  effects: ActiveEffect[];
  pending: PendingEvent[];
  /** 오늘(장 마감 후) 나온 뉴스. 가격에는 다음 날 시가부터 반영된다 */
  news: NewsItem[];
  newsLog: NewsItem[];
}
