import { DEFAULT_CONFIG as cfg } from '@mana/engine';
import type { ReactNode } from 'react';
import { pct } from '../format';

export const SECTOR_COLOR: Record<string, string> = {
  arms: '#ff7b6b', farm: '#6fcf4a', magic: '#a57cff', trade: '#3fb0ff', finance: '#ffb42e',
};
export const sectorOf = (stockId: string) => cfg.stocks.find((s) => s.id === stockId)!.sectorId;

/** 업종색 이름표: 납작한 색면 + 먹선 */
export function TickerBadge({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-[2px] border-[1.5px] border-ink font-display text-ink ${size === 'sm' ? 'h-[20px] px-1.5 text-[10.5px]' : 'h-[28px] px-2 text-[13px]'}`}
      style={{ background: SECTOR_COLOR[sectorOf(id)] }}>{id}</span>
  );
}

export function ChangeChip({ r, big }: { r: number; big?: boolean }) {
  const up = r > 0, down = r < 0;
  return (
    <span className={`chipx ${big ? '!text-[13px] !leading-[22px]' : ''}`} style={{ background: up ? '#ffe3e7' : down ? '#e0ebff' : '#ece8f4', color: up ? '#b81f38' : down ? '#1c49b8' : '#7a7090' }}>
      {up ? '▲' : down ? '▼' : '–'}{pct(Math.abs(r)).replace('+', '')}
    </span>
  );
}

/** 큰 움직임만 붓글씨 의성어로 외친다 */
export function moveWord(r: number) {
  const a = Math.abs(r);
  if (a < 0.03) return null;
  return r > 0 ? (a >= 0.05 ? '대폭등!' : '급등!') : a >= 0.05 ? '대폭락!' : '급락!';
}

/** 섹션 제목: 형광펜처럼 그은 밑줄 한 줄 */
export function Title({ ko, right }: { ko: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="head m-0 isolate">{ko}</h2>
      {right}
    </div>
  );
}

export function Spark({ data, w = 64, h = 24 }: { data: number[]; w?: number; h?: number }) {
  const lo = Math.min(...data), hi = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - lo) / (hi - lo || 1)) * (h - 6)}`).join(' ');
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={up ? '#f0455a' : '#2d6cff'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type IconName = 'trade' | 'news' | 'assets' | 'market' | 'coin' | 'close' | 'walk' | 'life' | 'me';
const paths: Record<IconName, ReactNode> = {
  trade: <><path d="M5 20V11M12 20V4M19 20v-6" strokeWidth="3.2" strokeLinecap="round" /><circle cx="5" cy="8" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="10.5" r="1.6" fill="currentColor" stroke="none" /></>,
  news: <><rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2.4" /><path d="M8 9h8M8 13h8M8 16.5h4.5" strokeWidth="2.2" strokeLinecap="round" /></>,
  assets: <><path d="M6 9h12l1.6 9a2 2 0 0 1-2 2.4H6.4a2 2 0 0 1-2-2.4z" strokeWidth="2.4" strokeLinejoin="round" /><path d="M9 9c0-2.8 1.4-5 3-5s3 2.2 3 5" strokeWidth="2.4" strokeLinecap="round" /><circle cx="12" cy="14.5" r="2.2" strokeWidth="2" /></>,
  market: <><rect x="4" y="4" width="7" height="7" rx="1.5" strokeWidth="2.4" /><rect x="13" y="4" width="7" height="7" rx="1.5" strokeWidth="2.4" /><rect x="4" y="13" width="7" height="7" rx="1.5" strokeWidth="2.4" /><rect x="13" y="13" width="7" height="7" rx="1.5" strokeWidth="2.4" /></>,
  coin: <><circle cx="12" cy="12" r="8.5" strokeWidth="2.4" /><path d="M12 7.5l1.6 3.2 3.5.5-2.5 2.5.6 3.5L12 15.5l-3.2 1.7.6-3.5-2.5-2.5 3.5-.5z" fill="currentColor" stroke="none" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" strokeWidth="2.8" strokeLinecap="round" />,
  life: <><path d="M12 3l2.4 5.2 5.6.7-4.2 3.8 1.2 5.5L12 15.4 7 18.2l1.2-5.5L4 8.9l5.6-.7z" strokeWidth="2.2" strokeLinejoin="round" /><path d="M12 20.5v-2" strokeWidth="2.4" strokeLinecap="round" /></>,
  me: <><circle cx="12" cy="9" r="4.2" strokeWidth="2.4" /><path d="M4.5 20.5c1-4 4-5.5 7.5-5.5s6.5 1.5 7.5 5.5" strokeWidth="2.4" strokeLinecap="round" /></>,
  walk: <><circle cx="12" cy="5" r="2.2" fill="currentColor" stroke="none" /><path d="M12 8v6l-3 5M12 14l3 5M8 11l4-2 4 2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></>,
};
export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">{paths[name]}</svg>;
}

export function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-7 text-center">
      <svg width="56" height="56" viewBox="0 0 64 64"><circle cx="32" cy="34" r="22" fill="#fff" stroke="#35244a" strokeWidth="2.5" /><path d="M22 32q3-3 6 0M36 32q3-3 6 0" stroke="#35244a" strokeWidth="2.5" fill="none" strokeLinecap="round" /><path d="M27 43q5 4 10 0" stroke="#35244a" strokeWidth="2.5" fill="none" strokeLinecap="round" /><ellipse cx="20" cy="40" rx="4" ry="2.5" fill="#ff8fb8" /><ellipse cx="44" cy="40" rx="4" ry="2.5" fill="#ff8fb8" /></svg>
      <div className="font-display text-[16px]">{title}</div>
      <div className="text-[12px] font-bold text-ink2">{sub}</div>
    </div>
  );
}
