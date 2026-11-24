import { DEFAULT_CONFIG } from './config';
import { daySeed, gauss, mulberry32, pick, pickWeighted } from './rng';
import { regimeAt, regimeNews } from './regimes';
import type {
  ActiveEffect, EngineConfig, EventTemplate, ImpactRule, MarketState, NewsItem, PendingEvent, Scope,
} from './types';

export const INDEX_BASE = 1000;
const SCOPES: Scope[] = ['stock', 'sector', 'kingdom'];
const round2 = (x: number) => Math.round(x * 100) / 100;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function indexOf(prices: Record<string, number>, cfg: EngineConfig) {
  const avg = cfg.stocks.reduce((a, s) => a + prices[s.id] / s.startPrice, 0) / cfg.stocks.length;
  return round2(INDEX_BASE * avg);
}

export function createMarket(seed: number, cfg: EngineConfig = DEFAULT_CONFIG): MarketState {
  const prices: Record<string, number> = {};
  const history: Record<string, number[]> = {};
  for (const s of cfg.stocks) {
    prices[s.id] = s.startPrice;
    history[s.id] = [s.startPrice];
  }
  return {
    seed, day: 0, marketFactor: 0, prices, history, opens: Object.fromEntries(cfg.stocks.map((s) => [s.id, [s.startPrice]])), index: [INDEX_BASE],
    effects: [], pending: [], news: [], newsLog: [],
  };
}

/**
 * 하루 진행: (상태, 시드) → 다음 날 상태. 순수 함수.
 * 1) 전날 장 마감 후 나온 뉴스의 충격(effects)이 오늘 시가에 반영된다.
 * 2) 오늘 장 마감 후 새 뉴스(공시/소문)가 생기고, 그 충격은 내일 반영된다.
 */
export function step(state: MarketState, seed: number, cfg: EngineConfig = DEFAULT_CONFIG): MarketState {
  const rng = mulberry32(seed);
  const day = state.day + 1;

  // --- 가격 ---
  const regime = regimeAt(state.seed, day);
  const marketFactor = cfg.marketPhi * state.marketFactor + cfg.marketVol * regime.vol * gauss(rng);
  const sectorShock: Record<string, number> = {};
  for (const s of cfg.sectors) sectorShock[s.id] = cfg.sectorVol * gauss(rng);

  const eventShock: Record<string, number> = {};
  for (const e of state.effects) {
    const v = e.magnitude * (e.schedule[e.age] ?? 0);
    for (const id of e.stockIds) eventShock[id] = (eventShock[id] ?? 0) + v;
  }

  const prices: Record<string, number> = {};
  const history: Record<string, number[]> = {};
  const opens: Record<string, number[]> = {};
  for (const s of cfg.stocks) {
    // 시가: 전날 장 마감 후 공시의 충격은 자정 갭으로 먼저 반영된다(낮 동안의 움직임은 예측할 수 없게 남는다)
    const gap = clamp(eventShock[s.id] ?? 0, -cfg.maxDailyMove, cfg.maxDailyMove);
    opens[s.id] = [...state.opens[s.id], Math.max(cfg.priceFloor, round2(state.prices[s.id] * (1 + gap)))];
    const r = clamp(
      cfg.drift + regime.drift + marketFactor + s.beta * sectorShock[s.sectorId] + s.idioVol * gauss(rng) + (eventShock[s.id] ?? 0),
      -cfg.maxDailyMove, cfg.maxDailyMove,
    );
    prices[s.id] = Math.max(cfg.priceFloor, round2(state.prices[s.id] * (1 + r)));
    history[s.id] = [...state.history[s.id], prices[s.id]];
  }

  // --- 이벤트 ---
  const effects: ActiveEffect[] = state.effects
    .map((e) => ({ ...e, age: e.age + 1 }))
    .filter((e) => e.age < e.schedule.length);
  const pending: PendingEvent[] = [];
  const news: NewsItem[] = [];

  const stocksIn = (sectorId: string) => cfg.stocks.filter((s) => s.sectorId === sectorId).map((s) => s.id);
  const resolve = (rule: ImpactRule, tpl: EventTemplate, targetId?: string): string[] =>
    rule.to === 'all' ? cfg.stocks.map((s) => s.id)
    : rule.to === 'target' ? (tpl.scope === 'stock' ? [targetId!] : stocksIn(targetId!))
    : stocksIn(rule.to.sector);
  const targetName = (tpl: EventTemplate, targetId?: string) =>
    tpl.scope === 'stock' ? cfg.stocks.find((s) => s.id === targetId)!.name
    : tpl.scope === 'sector' ? cfg.sectors.find((s) => s.id === targetId)!.name
    : '왕국';
  const newsOf = (tpl: EventTemplate, kind: NewsItem['kind'], targetId?: string): NewsItem => ({
    day, kind, templateId: tpl.id, scope: tpl.scope, tone: tpl.tone,
    text: tpl[kind === 'rumor' ? 'rumor' : 'disclosure'].replace('{target}', targetName(tpl, targetId)),
    targetStockIds: resolve(tpl.impacts[0], tpl, targetId),
  });

  const fire = (tpl: EventTemplate, targetId: string | undefined, scale: number) => {
    for (const rule of tpl.impacts) {
      const flip = rule.flipChance && rng() < rule.flipChance ? -1 : 1;
      effects.push({
        eventId: tpl.id, stockIds: resolve(rule, tpl, targetId),
        magnitude: rule.magnitude * scale * flip, schedule: tpl.schedule, age: 0,
      });
    }
    news.push(newsOf(tpl, 'disclosure', targetId));
  };
  const tplOf = (id: string) => cfg.templates.find((t) => t.id === id)!;

  for (const p of state.pending) {
    if (p.fireDay <= day) fire(tplOf(p.templateId), p.targetId, p.scale);
    else pending.push(p);
  }

  for (const scope of SCOPES) {
    if (rng() >= cfg.eventChance[scope]) continue;
    const tpl = pickWeighted(rng, cfg.templates.filter((t) => t.scope === scope));
    const targetId =
      scope === 'stock' ? pick(rng, cfg.stocks).id
      : scope === 'sector' ? pick(rng, tpl.sectors ?? cfg.sectors.map((s) => s.id))
      : undefined;
    const { min, max, power } = cfg.scale;
    const scale = min + (max - min) * rng() ** power;

    if (rng() < tpl.rumorChance) {
      news.push(newsOf(tpl, 'rumor', targetId));
      const [lo, hi] = tpl.rumorLead;
      const lead = lo + Math.floor(rng() * (hi - lo + 1));
      if (rng() < tpl.rumorAccuracy) pending.push({ templateId: tpl.id, targetId, scale, fireDay: day + lead });
    } else {
      fire(tpl, targetId, scale);
    }
  }

  // 국면 전환 즈음의 힌트 소식(가격 영향은 이미 드리프트에 담겨 있다)
  const rn = regimeNews(state.seed, day);
  if (rn) news.push({ day, kind: rn.kind, templateId: rn.templateId, scope: 'kingdom', tone: rn.tone, text: rn.text, targetStockIds: [] }); // 시장 전체 소식: 특정 길드에 !/? 표시를 붙이지 않는다

  return {
    seed: state.seed, day, marketFactor, prices, history, opens,
    index: [...state.index, indexOf(prices, cfg)],
    effects, pending, news, newsLog: [...state.newsLog, ...news],
  };
}

/** 시장의 기본 시드와 날짜로 하루를 진행한다 */
export const nextDay = (state: MarketState, cfg: EngineConfig = DEFAULT_CONFIG) =>
  step(state, daySeed(state.seed, state.day), cfg);
