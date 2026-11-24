import { hash } from './regimeHash';

/**
 * 시장 국면: 평온 → 호황 → (버블 → 폭락)이 몇 달 간격으로 돌아온다. 날짜와 시드만으로 정해지는 순수 함수라
 * 모든 플레이어가 같은 국면을 산다. 국면 자체는 플레이어에게 직접 알리지 않고, 시작 즈음의 소문/공시로만 힌트를 준다.
 */
export type RegimeKind = 'calm' | 'boom' | 'bubble' | 'crash';
export interface Block { kind: RegimeKind; start: number; len: number; /** 평온 구간인데 호황 소문이 도는 "헛소문" 구간 */ falseAlarm: boolean }
export interface Regime { kind: RegimeKind; /** 구간 안에서의 진행(0~1) */ t: number; drift: number; vol: number; block: Block }

/** 국면 길이(일). 한국 플레이어는 며칠 안에 변화를 기대해서 몇 달짜리 국면은 너무 길다 → 열흘~보름 단위 */
const LEN: Record<RegimeKind, [number, number]> = { calm: [8, 16], boom: [8, 16], bubble: [8, 14], crash: [5, 10] };
/** 새 세계의 첫 평온 구간(신규를 위한 보호). 며칠이면 충분하다 */
export const FIRST_CALM = 7;
const cache = new Map<number, Block[]>();

/** 시드의 국면 구간 목록을 `day`를 덮을 때까지 만든다. 시작 첫 구간은 항상 평온(새 플레이어를 위해) */
export function blocksUpTo(seed: number, day: number): Block[] {
  const bl = cache.get(seed) ?? [{ kind: 'calm' as RegimeKind, start: 0, len: FIRST_CALM, falseAlarm: false }];
  cache.set(seed, bl);
  for (;;) {
    const last = bl[bl.length - 1];
    if (last.start + last.len > day) return bl;
    const i = bl.length, r = hash(seed, i, 91);
    // 버블 다음은 반드시 폭락. 그 밖에는 같은 국면이 연달아 오지 않고, 폭락 직후에는 버블이 바로 오지 않는다(몇 달은 숨 돌릴 틈)
    const W: Record<string, number> = { calm: 0.5, boom: 0.35, bubble: 0.15 };
    const allowed = (['calm', 'boom', 'bubble'] as const).filter((k) => k !== last.kind && !(last.kind === 'crash' && k === 'bubble'));
    let pickR = r * allowed.reduce((a2, k) => a2 + W[k], 0);
    const kind: RegimeKind = last.kind === 'bubble' ? 'crash' : allowed.find((k) => (pickR -= W[k]) < 0) ?? allowed[0];
    const [lo, hi] = LEN[kind];
    bl.push({ kind, start: last.start + last.len, len: lo + Math.floor(hash(seed, i, 92) * (hi - lo + 1)), falseAlarm: kind === 'calm' && hash(seed, i, 93) < 0.3 });
  }
}

/** 국면별 하루 드리프트·변동성 배수(구간 안 진행도 t에 따라 변한다) */
export function regimeAt(seed: number, day: number): Regime {
  const bl = blocksUpTo(seed, day);
  const block = bl.find((b) => day >= b.start && day < b.start + b.len)!;
  const t = (day - block.start) / block.len;
  switch (block.kind) {
    case 'boom': return { kind: 'boom', t, drift: 0.004, vol: 1.1, block };
    case 'bubble': return { kind: 'bubble', t, drift: 0.003 + 0.014 * t, vol: 1 + 0.5 * t, block };
    case 'crash': return { kind: 'crash', t, drift: -0.036 + 0.021 * t, vol: 1.9 - 0.7 * t, block };
    default: return { kind: 'calm', t, drift: 0, vol: 1.25, block };
  }
}

/** 국면 전환 즈음의 힌트 소식: [종류, 글, 확실성]. 같은 날 하나만 */
export function regimeNews(seed: number, day: number): { templateId: string; kind: 'rumor' | 'disclosure'; tone: 'good' | 'bad' | 'mixed'; text: string } | null {
  const bl = blocksUpTo(seed, day), b = bl.find((x) => day >= x.start && day < x.start + x.len)!;
  const at = day - b.start;
  if (at === 0) {
    if (b.kind === 'boom') return { templateId: 'regime_boom', kind: 'rumor', tone: 'good', text: '왕국 곳곳에서 경기가 살아난다는 소문이 돈다' };
    if (b.kind === 'bubble') return { templateId: 'regime_bubble', kind: 'rumor', tone: 'mixed', text: '금화 시장에 투기 열풍이 분다는 소문이 돈다' };
    if (b.kind === 'crash') return { templateId: 'regime_crash', kind: 'disclosure', tone: 'bad', text: '왕실 재무관, 시장 혼란에 대한 긴급 성명 발표' };
    if (b.falseAlarm) return { templateId: 'regime_false', kind: 'rumor', tone: 'good', text: '곧 큰 호황이 온다는 소문이 돌지만 근거는 불분명하다' };
  }
  if (b.kind === 'bubble' && at === Math.floor(b.len * 0.7)) return { templateId: 'regime_pop', kind: 'rumor', tone: 'bad', text: '시장이 너무 달아올랐다며 거품을 걱정하는 목소리가 나온다' };
  return null;
}
