import { DEFAULT_CONFIG as cfg } from '@mana/engine';
import { useEffect, useState } from 'react';
import { CASTLE, ENTS, GUILDS, N, PLAZA, terrain, type Terrain } from '../scene/map';
import { HEROINES } from '../scene/heroines';
import { heroPos } from '../scene/input';
import { gotoTile, placesFor } from '../places';
import { useGame } from '../store';
import { SECTOR_COLOR } from './bits';

const COLOR: Record<Terrain, string> = { g: '#6c9a4f', F: '#2c5236', r: '#c9bfa8', p: '#e0d6bf', d: '#8d7d62', w: '#4a9ac4', s: '#e0cd9a', f: '#d9b94e', k: '#9a968f', m: '#4d6b3f', b: '#94703f' };
const ENT_COLOR: Partial<Record<string, string>> = { house: '#7a5a40', tree: '#2f6b3e', castle: '#a8482e', fountain: '#4a9ac4', rock: '#6f6a66', fence: '#7a5a40' };

let cached = '';
/** 지형과 개체를 한 칸 = 한 픽셀로 그려 한 번만 만든다 */
function terrainImage() {
  if (cached) return cached;
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d')!;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { g.fillStyle = COLOR[terrain(x, y)]; g.fillRect(x, y, 1, 1); }
  for (const e of ENTS) { const c = ENT_COLOR[e.kind]; if (!c) continue; g.fillStyle = c; if (e.kind === 'castle' || e.kind === 'fountain') g.fillRect(e.x - 1, e.y - 1, 3, 3); else g.fillRect(e.x, e.y, 1, 1); }
  return (cached = cv.toDataURL('image/png'));
}

/** 마을 지도: 월드와 같은 아이소 방향(타일 (x,y) → (x−y, (x+y)/2)). 길드 점을 누르면 그곳으로 걸어간다. 내 위치는 금색 점, 히로인은 분홍 하트 */
export function TownMap() {
  const select = useGame((g) => g.selected), pick = useGame((g) => g.select), shop = useGame((g) => g.shop), love = useGame((g) => g.love);
  const pins = placesFor({ shop, love }).filter((p) => p.kind !== 'heroine');
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((v) => v + 1), 300); return () => clearInterval(t); }, []);
  const X = (x: number, y: number) => x - y, Y = (x: number, y: number) => (x + y) / 2;
  const label = (x: number, y: number, t: string, size = 2.1) => <text x={X(x, y)} y={Y(x, y)} textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight="900" fill="#fff" stroke="#35244a" strokeWidth=".45" paintOrder="stroke" style={{ pointerEvents: 'none' }}>{t}</text>;
  return (
    <div className="panel-flat relative w-full overflow-hidden bg-[#1f3a2a]" style={{ aspectRatio: '88 / 46' }}>
      <svg viewBox="-44 -1 88 46" className="absolute inset-0 h-full w-full" role="img" aria-label="마을 지도">
        <image href={terrainImage()} width={N} height={N} transform="matrix(1 .5 -1 .5 0 0)" style={{ imageRendering: 'pixelated' }} />
        {label(CASTLE[0] + 0.5, CASTLE[1] + 0.5, '왕성')}
        {label(PLAZA[0] + 0.5, PLAZA[1] + 0.5, '광장')}
        {Object.entries(GUILDS).map(([id, g]) => {
          const s = cfg.stocks.find((x) => x.id === id)!, x = g.tile[0] + 0.5, y = g.tile[1] + 0.5, sel = select === id;
          return (
            <g key={id} onClick={() => pick(id)} className="cursor-pointer" role="button" aria-label={`${id} ${s.name} 쪽으로 가기`}>
              <ellipse cx={X(x, y)} cy={Y(x, y)} rx="4.6" ry="2.5" fill={SECTOR_COLOR[s.sectorId]} stroke={sel ? '#fff' : '#35244a'} strokeWidth={sel ? 0.5 : 0.3} />
              {label(x, y, id, 1.9)}
            </g>
          );
        })}
        {Object.values(HEROINES).map((h) => { const x = h.home[0] + 0.5, y = h.home[1] + 0.5; return <text key={h.id} x={X(x, y)} y={Y(x, y) - 2.6} textAnchor="middle" fontSize="2.6" fill="#ff8fb8" stroke="#35244a" strokeWidth=".4" paintOrder="stroke" style={{ pointerEvents: 'none' }}>♥</text>; })}
        {pins.map((p) => { const x = p.tile[0] + 0.5, y = p.tile[1] + 0.5; return (
          <g key={p.id} onClick={() => gotoTile(p.tile)} className="cursor-pointer" role="button" aria-label={`${p.name}(으)로 걸어가기`}>
            <circle cx={X(x, y)} cy={Y(x, y)} r="2.1" fill="#fff6d8" stroke="#35244a" strokeWidth=".4" />
            <text x={X(x, y)} y={Y(x, y)} textAnchor="middle" dominantBaseline="central" fontSize="2.3" fontWeight="900" fill="#35244a">{p.glyph}</text>
          </g>); })}
        <g transform={`translate(${X(heroPos.x, heroPos.y)} ${Y(heroPos.x, heroPos.y)})`} style={{ pointerEvents: 'none' }}><circle r="1.7" fill="#ffc13b" stroke="#35244a" strokeWidth=".4" /><circle r=".55" fill="#35244a" /></g>
      </svg>
    </div>
  );
}
