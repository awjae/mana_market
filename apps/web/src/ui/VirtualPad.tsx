import { useEffect, useRef, useState } from 'react';
import { pad } from '../scene/input';
import { NAV_H } from './layout';

const SIZE = 116, MAX = 34, DEAD = 11;

/** 폰용 가상 패드(조이스틱): 엄지로 밀면 그 방향(8방향)으로 걷는다. 방향키와 같은 이동에 합쳐진다 */
export function VirtualPad({ lift = 0 }: { lift?: number }) {
  const base = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const [t, setT] = useState({ x: 0, y: 0 });

  const reset = () => { active.current = false; pad.x = 0; pad.y = 0; setT({ x: 0, y: 0 }); };
  useEffect(() => reset, []); // 사라질 때 입력을 비운다

  const move = (clientX: number, clientY: number) => {
    const r = base.current!.getBoundingClientRect(), k = r.width / SIZE; // 무대 배율 보정
    const dx = (clientX - (r.left + r.width / 2)) / k, dy = (clientY - (r.top + r.height / 2)) / k;
    const d = Math.hypot(dx, dy), m = Math.min(d, MAX), ux = d ? dx / d : 0, uy = d ? dy / d : 0;
    setT({ x: ux * m, y: uy * m });
    if (d < DEAD) { pad.x = 0; pad.y = 0; return; }
    // 8방향으로 붙인다 (손가락이 조금 흔들려도 곧게 걷도록)
    const a = Math.round(Math.atan2(uy, ux) / (Math.PI / 4)) * (Math.PI / 4);
    pad.x = Math.round(Math.cos(a) * 1000) / 1000; pad.y = Math.round(Math.sin(a) * 1000) / 1000;
    dispatchEvent(new Event('mana-pad'));
  };

  const arrow = (rot: number) => <span className="absolute left-1/2 top-1/2 h-0 w-0" style={{ transform: `translate(-50%,-50%) rotate(${rot}deg) translateY(-${SIZE / 2 - 14}px)` }}><i className="block h-0 w-0 -translate-x-1/2 border-x-[6px] border-b-[9px] border-x-transparent border-b-ink/70" /></span>;

  return (
    <div className="absolute left-3 z-[36] touch-none select-none" style={{ bottom: NAV_H + 14 + lift, width: SIZE, height: SIZE, transition: 'bottom .25s ease-out' }}>
      <div ref={base} className="relative h-full w-full rounded-full border-[2.5px] border-ink bg-white/60 shadow-[3px_3px_0_rgba(53,36,74,.35)]"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); active.current = true; move(e.clientX, e.clientY); }}
        onPointerMove={(e) => active.current && move(e.clientX, e.clientY)}
        onPointerUp={reset} onPointerCancel={reset}>
        <div className="pointer-events-none absolute inset-[14px] rounded-full border-2 border-dashed border-ink/30" />
        {[0, 90, 180, 270].map((r) => <span key={r}>{arrow(r)}</span>)}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[46px] w-[46px] rounded-full border-[2.5px] border-ink bg-pink shadow-[2px_2px_0_#35244a]" style={{ transform: `translate(calc(-50% + ${t.x}px), calc(-50% + ${t.y}px))`, transition: active.current ? 'none' : 'transform .12s ease-out' }} />
      </div>
    </div>
  );
}
