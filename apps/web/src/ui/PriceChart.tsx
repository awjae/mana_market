import type { NewsItem } from '@mana/engine';
import { useId, useRef, useState } from 'react';
import { dayLabel } from '../calendar';
import { fmt, pct } from '../format';
import { ChangeChip } from './bits';

const W = 400, H = 150, ML = 6, MR = 64, MT = 12, MB = 18;
const UP = '#f0455a', DOWN = '#2d6cff', INK = '#35244a';

interface Props {
  series: number[];          // 종가 (마지막이 오늘)
  lastDay: number;           // 오늘의 날짜
  stockId: string;
  avg?: number;              // 내 평균 매수가
  news: NewsItem[];          // 이 종목과 관련된 소식
  range: number;
  setRange: (n: number) => void;
}

/**
 * 직관적인 시세 차트
 * - 기간 시작가를 기준선으로 두고, 그 위는 빨강·아래는 파랑 스크린톤으로 칠한다 (벌었는지 한눈에)
 * - 선 끝에 현재가 태그, 오른쪽에 가격 눈금, 최고·최저 표시
 * - 내 평단선, 소식(공시 !, 소문 ?)이 난 날 표시
 * - 손가락/마우스를 올리면 그날 가격과 전일 대비
 */
export function PriceChart({ series, lastDay, stockId, avg, news, range, setRange }: Props) {
  const today = range === 1; // 오늘 보기: 점 하나가 15분 슬롯(0시부터), 소식 표시·날짜 라벨 대신 시각을 쓴다
  const slotLabel = (i: number) => (i === 0 ? '어제 마감' : `${Math.floor((i - 1) / 4)}시 ${String(((i - 1) % 4) * 15).padStart(2, '0')}분`);
  const uid = useId().replace(/:/g, '');
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = series.length;
  const base = series[0], last = series[n - 1];
  const up = last >= base;
  const col = up ? UP : DOWN;

  const vals = [...series, ...(avg ? [avg] : [])];
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo || hi * 0.02) * 0.1;
  lo -= pad; hi += pad;
  const x = (i: number) => ML + (i / Math.max(1, n - 1)) * (W - ML - MR);
  const y = (v: number) => MT + (1 - (v - lo) / (hi - lo)) * (H - MT - MB);
  const yb = y(base);
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M${pts.join(' L')}`;
  const area = `M${x(0)},${yb} L${pts.join(' L')} L${x(n - 1)},${yb} Z`;

  const ticks = [hi - pad, (hi + lo) / 2, lo + pad];
  const iMax = series.indexOf(Math.max(...series)), iMin = series.indexOf(Math.min(...series));

  // 소식이 난 날: 선 위에 표시 (같은 날은 공시 우선)
  const marks = new Map<number, 'disclosure' | 'rumor'>();
  for (const nw of news) {
    if (today || !nw.targetStockIds.includes(stockId)) continue;
    const i = nw.day - (lastDay - (n - 1));
    if (i < 0 || i > n - 1) continue;
    if (marks.get(i) !== 'disclosure') marks.set(i, nw.kind);
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - ML) / (W - ML - MR)) * (n - 1)))));
  };
  const hv = hover ?? n - 1;
  const hChg = hv > 0 ? series[hv] / series[hv - 1] - 1 : 0;
  const tagW = 50, tagX = x(n - 1) + 7;

  return (
    <div className="panel-flat px-2 pb-1.5 pt-1.5">
      <div className="mb-1 flex items-center justify-between">
        <div className="seg">{[1, 10, 20, 60].map((r) => <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r === 60 ? '전체' : r === 1 ? '오늘' : `${r}일`}</button>)}</div>
        <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink2">
          {today ? '어제 마감보다' : `${n - 1}일 전보다`} <ChangeChip r={last / base - 1} big />
        </div>
      </div>

      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block w-full select-none" style={{ touchAction: 'none' }}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} onPointerUp={(e) => e.pointerType === 'touch' && setTimeout(() => setHover(null), 1200)}>
        <defs>
          <pattern id={`u${uid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.25" fill={UP} opacity=".62" /></pattern>
          <pattern id={`d${uid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.25" fill={DOWN} opacity=".62" /></pattern>
          <clipPath id={`a${uid}`}><rect x="0" y="0" width={W} height={yb} /></clipPath>
          <clipPath id={`b${uid}`}><rect x="0" y={yb} width={W} height={H} /></clipPath>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={ML} x2={W - MR} y1={y(t)} y2={y(t)} stroke={INK} strokeOpacity=".14" strokeDasharray="3 4" />
            <text x={W - MR + 6} y={y(t) + 3.5} fontSize="10.5" fontWeight="700" fill={INK} opacity=".6">{fmt(t)}</text>
          </g>
        ))}

        {/* 벌었으면 빨강, 잃었으면 파랑 스크린톤 */}
        <path d={area} fill={`url(#u${uid})`} clipPath={`url(#a${uid})`} />
        <path d={area} fill={`url(#d${uid})`} clipPath={`url(#b${uid})`} />
        <line x1={ML} x2={W - MR} y1={yb} y2={yb} stroke={INK} strokeWidth="1.3" strokeDasharray="5 3" opacity=".7" />
        <text x={ML + 2} y={yb - 4} fontSize="10" fontWeight="800" fill={INK} opacity=".75">{today ? '어제 마감' : `${n - 1}일 전`} {fmt(base)}</text>

        {avg && (
          <g>
            <line x1={ML} x2={W - MR} y1={y(avg)} y2={y(avg)} stroke="#d99a00" strokeWidth="1.8" strokeDasharray="2 3" />
            <rect x={W - MR - 62} y={y(avg) - 8} width="60" height="15" rx="2" fill="#fff3c2" stroke="#d99a00" />
            <text x={W - MR - 32} y={y(avg) + 3} fontSize="10" fontWeight="800" textAnchor="middle" fill="#8a5a00">내 평단 {fmt(avg)}</text>
          </g>
        )}

        <path d={line} fill="none" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />

        {/* 최고·최저 */}
        {[iMax, iMin].filter((i, k, a) => a.indexOf(i) === k && Math.abs(i - (n - 1)) > 2).map((i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(series[i])} r="3.2" fill="#fff" stroke={INK} strokeWidth="1.6" />
            <text x={x(i)} y={y(series[i]) + (i === iMax ? -8 : 15)} fontSize="10" fontWeight="800" textAnchor="middle" fill={INK}>{i === iMax ? '최고 ' : '최저 '}{fmt(series[i])}</text>
          </g>
        ))}

        {/* 소식이 난 날 */}
        {[...marks].map(([i, k]) => (
          <g key={i} transform={`translate(${x(i)} ${y(series[i])})`}>
            <line y1="-3" y2="-11" stroke={INK} strokeWidth="1.5" />
            <circle cy="-18" r="8" fill={k === 'disclosure' ? '#ffc13b' : '#d9c9ff'} stroke={INK} strokeWidth="1.6" />
            <text y="-14" fontSize="11" fontWeight="900" textAnchor="middle" fill={INK}>{k === 'disclosure' ? '!' : '?'}</text>
          </g>
        ))}

        {/* 현재가 태그 */}
        <circle cx={x(n - 1)} cy={y(last)} r="5.5" fill={col} stroke={INK} strokeWidth="2" />
        <path d={`M${tagX - 3},${y(last)} l4,-5 v10 z`} fill={col} stroke={INK} strokeWidth="1.2" />
        <rect x={tagX} y={y(last) - 10} width={tagW} height="20" rx="2" fill={col} stroke={INK} strokeWidth="2" />
        <text x={tagX + tagW / 2} y={y(last) + 4.5} fontSize="12" textAnchor="middle" fill="#fff" style={{ fontFamily: 'var(--font-num)' }}>{fmt(last)}</text>

        {/* 손가락/마우스를 올린 날 */}
        {hover !== null && (
          <g>
            <line x1={x(hv)} x2={x(hv)} y1={MT} y2={H - MB} stroke={INK} strokeWidth="1.2" strokeDasharray="3 2" />
            <circle cx={x(hv)} cy={y(series[hv])} r="4.5" fill="#fff" stroke={INK} strokeWidth="2.2" />
            <g transform={`translate(${Math.min(Math.max(x(hv) - 62, ML), W - MR - 124)} ${MT - 2})`}>
              <rect width="124" height="34" rx="2" fill="#fff" stroke={INK} strokeWidth="2" />
              <text x="8" y="14" fontSize="10.5" fontWeight="700" fill={INK} opacity=".7">{today ? slotLabel(hv) : dayLabel(lastDay - (n - 1 - hv))}</text>
              <text x="8" y="28" fontSize="13" fill={INK} style={{ fontFamily: 'var(--font-num)' }}>{fmt(series[hv])}</text>
              <text x="116" y="28" fontSize="11" fontWeight="800" textAnchor="end" fill={hChg > 0 ? UP : hChg < 0 ? DOWN : INK}>{hv > 0 ? `${hChg >= 0 ? '▲' : '▼'}${pct(Math.abs(hChg)).replace('+', '')}` : ''}</text>
            </g>
          </g>
        )}
        <text x={x(0)} y={H - 4} fontSize="10" fontWeight="700" fill={INK} opacity=".55">{today ? '어제' : dayLabel(lastDay - (n - 1))}</text>
        <text x={x(n - 1)} y={H - 4} fontSize="10" fontWeight="700" textAnchor="end" fill={INK} opacity=".55">오늘</text>
      </svg>

      <div className="flex flex-wrap gap-x-3 px-1 pt-0.5 text-[10.5px] font-bold text-ink2">
        <span><i className="mr-1 inline-block h-2 w-3 align-middle" style={{ background: 'radial-gradient(circle,#f0455a 1.2px,transparent 1.6px) 0 0/4px 4px' }} />시작가보다 높음</span>
        <span><i className="mr-1 inline-block h-2 w-3 align-middle" style={{ background: 'radial-gradient(circle,#2d6cff 1.2px,transparent 1.6px) 0 0/4px 4px' }} />낮음</span>
        {avg && <span><i className="mr-1 inline-block h-0 w-3 align-middle border-t-2 border-dotted border-[#d99a00]" />내 평단</span>}
      </div>
    </div>
  );
}
