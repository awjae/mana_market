import { useMemo } from 'react';
import { GH, GW, composeLook, type Cell, type Look } from './pixelHeroData';

const LEG_Y = 18; // 이 줄부터 아래는 다리: 좌/우로 갈라 번갈아 내딛는다
type Part = 'body' | 'legL' | 'legR';
const partOf = (c: Cell): Part => (c.y < LEG_Y ? 'body' : c.x < GW / 2 ? 'legL' : 'legR');

function Rects({ cells }: { cells: Cell[] }) {
  return <>{cells.map((c) => <rect key={`${c.x},${c.y}`} x={c.x} y={c.y} width="1.02" height="1.02" fill={c.c} />)}</>;
}

/** 격자 단위(1칸=1)로 그린 캐릭터. 걷는 중인지는 상위의 data-walking 속성으로 CSS가 판단한다 */
export function PixelSprite({ look, back = false }: { look: Look; back?: boolean }) {
  const parts = useMemo(() => {
    const { fill, line } = composeLook(look, back);
    const out: Record<Part, Cell[]> = { body: [], legL: [], legR: [] };
    // 윤곽은 맞닿은 몸/다리 쪽에 붙여 함께 움직이게 한다
    const owner = new Map(fill.map((c) => [`${c.x},${c.y}`, partOf(c)]));
    for (const l of line) {
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => owner.get(`${l.x + dx},${l.y + dy}`)).find(Boolean);
      out[nb ?? 'body'].push(l);
    }
    fill.forEach((c) => out[partOf(c)].push(c));
    return out;
  }, [look, back]);
  return (
    <g shapeRendering="crispEdges">
      <g className="px-legL"><Rects cells={parts.legL} /></g>
      <g className="px-legR"><Rects cells={parts.legR} /></g>
      <g className="px-body"><Rects cells={parts.body} /></g>
    </g>
  );
}

/** 월드 스프라이트: 발 위치가 (0, 0). 한 칸의 크기는 ps */
export function PixelHero({ look, ps = 2 }: { look: Look; ps?: number }) {
  const f = ps / 3.6; // 그림자·먼지는 캐릭터 크기에 비례
  return (
    <g>
      <g className="dust">
        <circle cx={-9 * f} cy={f} r={3.2 * f} fill="#e8dcc0" /><circle cx={8 * f} cy={2 * f} r={2.6 * f} fill="#e8dcc0" /><circle cx="0" cy={3 * f} r={2.2 * f} fill="#e8dcc0" />
      </g>
      <ellipse className="walk-shadow" cx="0" cy="0" rx={17 * f} ry={5 * f} fill="rgba(60,40,140,.3)" />
      <g transform={`translate(${-(GW / 2) * ps} ${-(GH + 0.5) * ps}) scale(${ps})`}>
        {/* 앞모습과 뒷모습을 모두 그려 두고, 걷는 방향에 따라 CSS가 하나만 보여 준다(data-back, 매 프레임 다시 그리지 않으려고) */}
        <g className="pf-front"><PixelSprite look={look} /></g>
        <g className="pf-back"><PixelSprite look={look} back /></g>
      </g>
    </g>
  );
}

/** 꾸미기 미리보기 */
export function PixelHeroPreview({ look, size = 120 }: { look: Look; size?: number }) {
  return (
    <svg viewBox={`-1 -1 ${GW + 2} ${GH + 2}`} width={size} height={(size * (GH + 2)) / (GW + 2)} role="img" aria-label="내 캐릭터 미리보기">
      <PixelSprite look={look} />
    </svg>
  );
}

/** HUD 아바타: 꾸민 모습의 얼굴 부분만 동그랗게 잘라 보여 준다 */
export function PixelAvatar({ look, size = 40 }: { look: Look; size?: number }) {
  return (
    <svg viewBox="1 -0.5 14 12.5" width={size} height={size} className="shrink-0 rounded-full border-2 border-ink bg-[#e9f6ff]" role="img" aria-label="내 얼굴">
      <PixelSprite look={look} />
    </svg>
  );
}
