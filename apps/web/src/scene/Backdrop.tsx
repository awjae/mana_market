/** 월드 위에 얹는 하늘과 빛. 시황(mood)에 따라 맑은 노을 ↔ 흐림과 비.
 *  애니메이션 배경의 문법: 입체 구름, 빛줄기(god ray), 빛 번짐(bloom), 렌즈 플레어, 색 보정, 필름 그레인 */
import { skyPhase } from '../calendar';

export function Sky({ mood, hour }: { mood: number; hour: number }) {
  const gold = Math.max(0, mood), storm = Math.max(0, -mood);
  const ph = skyPhase(hour); // 현실 시각에 맞춘 시간대 (밤·새벽·낮·해질녘)
  const stars = Array.from({ length: 46 }, (_, i) => ({ x: (i * 211) % 430, y: (i * 97) % 240, r: 0.7 + ((i * 7) % 10) / 12 }));
  const fade = 'transition-opacity duration-[1500ms]';
  // 입체 적운: 윗면 흰색 → 아래 라벤더, 가장자리에 분홍 반사광
  const cloud = (x: number, y: number, s: number, i: number) => (
    <g key={i} className="drift-s" style={{ animationDuration: `${120 + i * 28}s`, animationDelay: `-${i * 37}s` }}>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <g fill="url(#cloudG)">
          <ellipse cx="0" cy="4" rx="74" ry="16" /><ellipse cx="-30" cy="-8" rx="34" ry="22" /><ellipse cx="6" cy="-18" rx="38" ry="26" /><ellipse cx="38" cy="-6" rx="30" ry="19" />
        </g>
        <path d="M-70,10 Q0,26 72,10" stroke="#ffc6dc" strokeWidth="3" fill="none" opacity=".8" strokeLinecap="round" />
        <ellipse cx="-4" cy="-22" rx="22" ry="8" fill="#fff" opacity=".85" />
      </g>
    </g>
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 먼 곳은 하늘빛 안개로 사라진다 → 끝없는 느낌 */}
      <div className="absolute inset-x-0 top-0 h-[250px]" style={{ background: 'linear-gradient(rgba(96,176,255,.6) 0%, rgba(170,216,255,.3) 38%, rgba(255,222,206,.1) 68%, rgba(255,222,206,0) 100%)' }} />
      <div className={`absolute inset-x-0 top-0 h-[250px] ${fade}`} style={{ opacity: gold * 0.9, background: 'linear-gradient(rgba(255,140,176,.6) 0%, rgba(255,196,150,.3) 40%, rgba(255,232,180,.1) 68%, rgba(255,232,180,0) 100%)' }} />
      <div className={`absolute inset-x-0 top-0 h-[250px] ${fade}`} style={{ opacity: Math.min(1, storm * 1.2), background: 'linear-gradient(rgba(96,108,132,.95) 0%, rgba(130,142,164,.6) 40%, rgba(176,186,200,.25) 68%, rgba(176,186,200,0) 100%)' }} />
      <svg viewBox="0 0 430 300" className="absolute left-0 top-0 w-full" style={{ opacity: (1 - storm * 0.85) * (1 - ph.night), transition: 'opacity 1.5s' }}>
        <defs>
          <linearGradient id="cloudG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".55" stopColor="#eef4ff" /><stop offset="1" stopColor="#b9c8f2" /></linearGradient>
          <radialGradient id="sunG"><stop offset="0" stopColor="#fffdf0" /><stop offset=".3" stopColor="#ffeeb0" stopOpacity=".8" /><stop offset="1" stopColor="#ffe9a0" stopOpacity="0" /></radialGradient>
        </defs>
        <g className="rays" style={{ transformOrigin: '70px 30px' }} opacity=".32">
          {Array.from({ length: 9 }, (_, i) => <polygon key={i} points="70,30 380,-40 380,40" fill="#fff6c8" transform={`rotate(${i * 40 + 8} 70 30)`} opacity=".4" />)}
        </g>
        <circle cx="70" cy="30" r="110" fill="url(#sunG)" />
        <circle cx="70" cy="30" r="22" fill="#fffef6" />
        {[[330, 84, 0.85], [150, 150, 0.62], [410, 205, 0.5]].map(([x, y, s], i) => cloud(x, y, s, i))}
        {/* 렌즈 플레어: 태양에서 화면 중앙으로 이어지는 육각 보케 */}
        {[[120, 70, 9, '#ffe9a0'], [168, 104, 15, '#ffc2d8'], [222, 140, 7, '#bfe6ff'], [276, 176, 18, '#fff3c0']].map(([x, y, r, c], i) => <circle key={i} cx={x as number} cy={y as number} r={r as number} fill={c as string} opacity=".28" />)}
      </svg>
      {/* 현실 시각: 밤에는 달과 별, 새벽에는 분홍빛, 낮에는 맑게 */}
      {ph.night > 0.01 && <div className="absolute inset-0" style={{ opacity: ph.night, background: 'rgba(14,20,88,.6)', transition: 'opacity 2s' }} />}
      <div className="absolute inset-x-0 top-0 h-[270px]" style={{ opacity: ph.night, background: 'linear-gradient(rgba(8,12,48,.96), rgba(22,30,90,.55) 55%, rgba(22,30,90,0))', transition: 'opacity 2s' }} />
      <svg viewBox="0 0 430 260" className="absolute left-0 top-0 w-full" style={{ opacity: ph.night * (1 - storm), transition: 'opacity 2s' }}>
        {stars.map((st, i) => <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#fff7e0" className="twinkle" style={{ animationDelay: `${(i % 7) * 0.5}s` }} />)}
        <circle cx="352" cy="78" r="58" fill="url(#glowGold)" opacity=".28" />
        <circle cx="352" cy="78" r="21" fill="#f6eed2" /><circle cx="344" cy="72" r="4.5" fill="#e0d6b4" /><circle cx="358" cy="86" r="6" fill="#e0d6b4" />
      </svg>
      {ph.dawn > 0.01 && <div className="absolute inset-0" style={{ opacity: ph.dawn, background: 'rgba(255,170,150,.14)', transition: 'opacity 2s' }} />}
      <div className="absolute inset-x-0 top-0 h-[250px]" style={{ opacity: ph.dawn * 0.85, background: 'linear-gradient(rgba(255,150,175,.8), rgba(255,205,150,.45) 55%, rgba(255,220,170,0))', transition: 'opacity 2s' }} />
      {/* 빛줄기 */}
      <div className={`absolute inset-0 ${fade}`} style={{ opacity: (1 - storm) * (1 - ph.night) }}>
        {[[40, 80, 0], [120, 110, 2.5], [210, 70, 5]].map(([l, w, d], i) => <span key={i} className="shaft" style={{ left: l, width: w, animationDelay: `-${d}s` }} />)}
      </div>
      {storm > 0.01 && <div className={`absolute inset-0 ${fade}`} style={{ opacity: storm, background: 'rgba(80,100,150,.4)' }} />}
      {/* 블룸 + 색 보정(그늘은 푸르게, 빛은 따뜻하게) */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 14% 2%, rgba(255,244,200,.16), transparent 34%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 52%, transparent 52%, rgba(50,36,110,.2) 100%)' }} />
      <div className="grain" />
    </div>
  );
}

export function Weather({ mood, kind }: { mood: number; kind: string }) {
  const storm = Math.max(0, -mood);
  return (
    <>
      {/* 흩날리는 벚꽃잎 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-[1500ms]" style={{ opacity: kind === 'snow' ? 0 : 1 - storm }}>
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} className="petal" style={{ left: ((i * 83) % 440) - 10, animationDelay: `-${(i % 9) * 1.3}s`, animationDuration: `${9 + (i % 5) * 1.6}s`, ['--sw' as string]: `${24 + (i % 4) * 14}px`, scale: `${0.7 + (i % 3) * 0.3}` }} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-[1500ms]" style={{ opacity: kind === 'rain' ? 1 : 0 }}>
        {Array.from({ length: 46 }, (_, i) => (
          <span key={i} className="rain" style={{ left: ((i * 61) % 470) - 20, animationDelay: `${(i % 9) * 0.11}s`, animationDuration: `${0.55 + (i % 4) * 0.08}s` }} />
        ))}
      </div>
      {kind === 'snow' && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 36 }, (_, i) => (
            <span key={i} className="snow" style={{ left: ((i * 73) % 440) - 10, animationDelay: `-${(i % 11) * 1.1}s`, animationDuration: `${7 + (i % 5) * 1.5}s`, ['--sw' as string]: `${12 + (i % 4) * 9}px`, scale: `${0.7 + (i % 3) * 0.35}` }} />
          ))}
        </div>
      )}
    </>
  );
}
