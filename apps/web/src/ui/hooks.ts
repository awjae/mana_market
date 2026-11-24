import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

/** 가로 스크롤 영역: 마우스 휠(세로)을 가로 스크롤로 바꾸고, 마우스로 끌어서 스크롤. 끌었을 땐 클릭으로 취급하지 않는다 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const st = useRef({ down: false, x: 0, left: 0, moved: false });
  useEffect(() => {
    const el = ref.current!;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { el.scrollLeft += e.deltaY; e.preventDefault(); }
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);
  return {
    ref,
    bind: {
      onPointerDown: (e: PointerEvent<T>) => { if (e.pointerType === 'mouse') st.current = { down: true, x: e.clientX, left: ref.current!.scrollLeft, moved: false }; },
      onPointerMove: (e: PointerEvent<T>) => {
        const s = st.current, el = ref.current!;
        if (!s.down) return;
        const k = el.getBoundingClientRect().width / el.offsetWidth || 1; // 화면 배율 보정
        const dx = (e.clientX - s.x) / k;
        if (Math.abs(dx) > 5 && !s.moved) { s.moved = true; el.setPointerCapture(e.pointerId); }
        if (s.moved) el.scrollLeft = s.left - dx;
      },
      onPointerUp: () => { st.current.down = false; },
      onPointerCancel: () => { st.current.down = false; st.current.moved = false; },
      onClickCapture: (e: React.MouseEvent) => { if (st.current.moved) { e.stopPropagation(); e.preventDefault(); st.current.moved = false; } },
    },
  };
}

/** 현실 시각(ms). ms마다 갱신한다: 하늘 색, 달력의 시계·종소리 카운트다운에 쓴다 */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
