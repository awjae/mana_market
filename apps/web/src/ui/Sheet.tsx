import { useRef, useState, type ReactNode } from 'react';
import { NAV_H, type Size } from './layout';

/** 드래그로 닫기/절반/전체를 오가는 하단 시트 */
export function Sheet({ size, setSize, halfH, fullH, children }: { size: Size; setSize: (s: Size) => void; halfH: number; fullH: number; children: ReactNode }) {
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef(0), base = useRef(0), k = useRef(1);
  const target = size === 'closed' ? 0 : size === 'half' ? halfH : fullH;
  const height = drag === null ? target : Math.max(0, Math.min(fullH, base.current - drag));

  return (
    <div className="page absolute inset-x-0 z-20 flex flex-col overflow-hidden"
      style={{ bottom: NAV_H - 14, height: height + 14, paddingBottom: 14, transition: drag === null ? 'height .3s cubic-bezier(.3,.9,.3,1)' : 'none', visibility: height < 4 && drag === null ? 'hidden' : 'visible', borderBottom: 0 }}>
      <div className="grab flex shrink-0 touch-none justify-center py-2.5" title="끌어서 높이 조절 · 클릭하면 확대/축소"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.parentElement!.getBoundingClientRect(); k.current = r.height / (e.currentTarget.parentElement!.offsetHeight || 1); start.current = e.clientY; base.current = target; setDrag(0); }}
        onPointerMove={(e) => drag !== null && setDrag((e.clientY - start.current) / k.current)}
        onPointerCancel={() => setDrag(null)}
        onPointerUp={() => {
          if (drag === null) return;
          const h = height;
          setDrag(null);
          if (Math.abs(drag) < 4) return setSize(size === 'half' ? 'full' : 'half'); // 탭
          setSize(h < halfH * 0.5 ? 'closed' : h < (halfH + fullH) / 2 ? 'half' : 'full');
        }}>
        <span className="h-[5px] w-14 -skew-x-[20deg] rounded-[1px] bg-ink" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-7">{children}</div>
    </div>
  );
}
