import { sx, sy } from './iso';
import type { Npc } from './npcs';

/** 글을 공백 기준으로 n자 안팎의 줄로 나눈다(한 단어가 길면 n자씩 자른다) */
const wrap = (t: string, n = 14) => {
  const lines: string[] = []; let cur = '';
  for (const w of t.split(' ')) { if (cur && (cur + ' ' + w).length > n) { lines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w; }
  if (cur) lines.push(cur);
  return lines.flatMap((l) => (l.length > n + 3 ? l.match(new RegExp(`.{1,${n}}`, 'g')) ?? [l] : [l]));
};

/** 머리 위 말풍선(순수 SVG: iOS Safari는 변형된 SVG 안의 foreignObject 위치가 어긋난다) */
function SayBubble({ text, lift }: { text: string; lift: number }) {
  const lines = wrap(text), LH = 12.5, w = Math.max(...lines.map((l) => l.length)) * 10.4 + 16, h = lines.length * LH + 9, y = -lift - 8 - h;
  return (
    <g style={{ pointerEvents: 'none' }} className="say">
      <rect x={-w / 2 + 2} y={y + 2} width={w} height={h} rx="7" fill="#35244a" />
      <path d={`M-5 ${y + h - 1}L0 ${y + h + 7}L5 ${y + h - 1}Z`} fill="#fff" stroke="#35244a" strokeWidth="2" strokeLinejoin="round" />
      <rect x={-w / 2} y={y} width={w} height={h} rx="7" fill="#fff" stroke="#35244a" strokeWidth="2" />
      <path d={`M-3.5 ${y + h}H3.5`} stroke="#fff" strokeWidth="3" />
      {lines.map((l, i) => <text key={i} x="0" y={y + 5 + LH * (i + 0.8)} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#35244a" style={{ fontFamily: 'var(--font-sans)' }}>{l}</text>)}
    </g>
  );
}

/** 캔버스가 그리는 NPC 위에 얹는 표식: 히로인의 ♥(눌러서 대화하는 투명 영역 포함)과 말풍선. 몸은 캔버스(`canvasWorld.ts`)가 그린다 */
export function NpcMark({ n, onTalk, say }: { n: Npc; onTalk?: (n: Npc) => void; say?: string }) {
  const { def } = n, X = sx(n.x, n.y), Y = sy(n.x, n.y);
  return (
    <g className="npc" style={{ transform: `translate(${X}px,${Y}px)` }} onClick={def.heroine && onTalk ? () => onTalk(n) : undefined}>
      {def.heroine && <text x="0" y="-58" textAnchor="middle" fontSize="15" fill="#ff8fb8" stroke="#35244a" strokeWidth="1.2" paintOrder="stroke" className="float" style={{ fontFamily: 'var(--font-display)' }}>♥</text>}
      {say && <SayBubble text={say} lift={def.look ? 46 : 28} />}
      {def.heroine && <rect x="-14" y="-42" width="28" height="46" fill="transparent" />}
    </g>
  );
}
