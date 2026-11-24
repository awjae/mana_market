import { useEffect, useState } from 'react';
import { HeroPortrait, type Mood } from '../scene/Hero';

export const HERO_NAME = '아리아';
export interface Line { id: number; text: string; mood: Mood }

/** 만화 말풍선 대화: 초상화 + 꼬리 달린 풍선 + 타자 효과. 탭하면 닫히고, 잠시 뒤 저절로 사라진다 */
export function Dialogue({ line, bottom, onClose }: { line: Line | null; bottom: number; onClose: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!line) return;
    setN(0);
    const len = line.text.length;
    const t = setInterval(() => setN((v) => { if (v + 1 >= len) clearInterval(t); return Math.min(len, v + 1); }), 24);
    return () => clearInterval(t);
  }, [line?.id]);
  const done = !!line && n >= line.text.length;
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onClose, 3800);
    return () => clearTimeout(t);
  }, [done, line?.id]);
  if (!line) return null;

  return (
    <div key={line.id} className="dlg pointer-events-none absolute inset-x-0 z-[35]" style={{ bottom }}>
      <div className="pointer-events-none absolute -left-3 bottom-0 z-0 h-[158px] w-[158px]"><HeroPortrait mood={line.mood} className="port h-full w-full" /></div>
      <button onClick={onClose} className="pointer-events-auto relative z-10 ml-[118px] mr-2.5 block min-h-[74px] w-[calc(100%-128px)] border-[2.5px] border-ink bg-white px-4 pb-3 pt-[22px] text-left shadow-[4px_4px_0_#35244a]" style={{ borderRadius: '18px 18px 18px 3px' }}>
        {/* 말풍선 꼬리: 초상화 쪽으로 */}
        <span className="absolute -left-[13px] bottom-3 h-0 w-0 border-y-[8px] border-r-[13px] border-y-transparent border-r-ink" />
        <span className="absolute -left-[8px] bottom-[14.5px] h-0 w-0 border-y-[6px] border-r-[10px] border-y-transparent border-r-white" />
        <span className="absolute -top-3 left-3 bg-ink px-2.5 py-px font-display text-[12px] text-white [clip-path:polygon(0_0,100%_0,93%_100%,0_100%)]">{HERO_NAME}</span>
        <p className="m-0 min-h-[36px] pr-3 text-[13px] font-bold leading-relaxed">{line.text.slice(0, n)}</p>
        {done && <span className="caret absolute bottom-1.5 right-3 text-[11px] text-pink">▼</span>}
      </button>
    </div>
  );
}
