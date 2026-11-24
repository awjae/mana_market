import { useEffect, useState, type ReactNode } from 'react';

export const W = 430; // 모바일 세로 기준 폭
const MIN_H = 780;

function Key({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex min-w-7 items-center justify-center rounded-[2px] border-2 border-ink bg-white px-2 py-px font-display text-[12.5px] text-ink shadow-[2px_2px_0_#35244a]">{children}</kbd>;
}

/** 폭 430의 세로 무대. 화면 폭에 맞춰 확대/축소하고, 남는 세로는 무대 높이로 흡수한다.
 *  데스크톱처럼 옆이 넓으면 애니메이션 풍 배경과 조작 안내를 보여 준다 */
export function Stage({ children }: { children: (h: number) => ReactNode }) {
  const [vp, setVp] = useState({ w: innerWidth, h: innerHeight });
  useEffect(() => {
    const f = () => setVp({ w: innerWidth, h: innerHeight });
    addEventListener('resize', f);
    return () => removeEventListener('resize', f);
  }, []);
  const s0 = Math.min(vp.w / W, vp.h / MIN_H);
  const wide = (vp.w - W * s0) / 2 > 40; // 데스크톱: 폰 틀 + 바깥 장식
  const pad = wide ? 18 : 0;
  const scale = Math.min(vp.w / W, (vp.h - 2 * pad) / MIN_H);
  const h = (vp.h - 2 * pad) / scale;
  const side = (vp.w - W * scale) / 2;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'linear-gradient(#7cc4ff 0%, #bfe4ff 52%, #ffe3ee 100%)' }}>
      {wide && (
        <>
          {[[0, 90, 0], [30, 140, 30], [60, 70, 60], [15, 110, 12]].map(([l, w, d], i) => <span key={i} className="bgcloud" style={{ top: `${8 + i * 20}%`, left: `${l - 30}vw`, width: w * 1.6, height: w * 0.5, animationDelay: `-${d}s`, animationDuration: `${80 + i * 20}s` }} />)}
          {Array.from({ length: 16 }, (_, i) => <span key={i} className="petal" style={{ left: `${(i * 67) % 100}vw`, animationDelay: `-${(i % 8) * 1.7}s`, animationDuration: `${10 + (i % 5) * 2}s`, ['--sw' as string]: `${30 + (i % 4) * 16}px` }} />)}
          {side > 190 && (
            <>
              <div className="absolute top-1/2 -translate-y-1/2 text-center" style={{ left: 0, width: side }}>
                <div className="font-brush text-[104px] leading-[.85] text-white" style={{ transform: 'rotate(-4deg)', textShadow: '4px 4px 0 #35244a, -2px -2px 0 #35244a, 2px -2px 0 #35244a, -2px 2px 0 #35244a, 0 0 0 #35244a, 6px 8px 0 #ff8fb8' }}>마나<br />마켓</div>
                <div className="mt-5 font-display text-[16px] text-ink">이세계 증권거래소</div>
                <p className="mx-auto mb-0 mt-2 max-w-[240px] text-[12px] font-bold leading-relaxed text-ink/70">가상의 세계와 가상 화폐로 즐기는 게임이에요. 실제 돈·시세와 무관하며 투자 조언이 아닙니다.</p>
              </div>
              <div className="absolute top-1/2 -translate-y-1/2" style={{ right: Math.max(16, (side - 280) / 2), width: 280 }}>
                <div className="panel p-4">
                  <h2 className="head isolate m-0 mb-3 text-[16px]">조작</h2>
                  <ul className="ruled m-0 list-none p-0 text-[12.5px] font-bold text-ink2">
                    <li className="flex items-center gap-3 py-2"><span className="w-[84px] shrink-0"><Key>방향키</Key></span>걸어 다니기 (WASD도 가능)</li>
                    <li className="flex items-center gap-3 py-2"><span className="w-[84px] shrink-0"><Key>Enter</Key></span>가까운 길드와 거래</li>
                    <li className="flex items-center gap-3 py-2"><span className="w-[84px] shrink-0"><Key>E</Key></span>말걸기, 채집, 낚시, 던전</li>
                    <li className="flex items-center gap-3 py-2"><span className="w-[84px] shrink-0 text-ink">클릭</span>길드·NPC·칩 선택, 땅 눌러 걷기</li>
                    <li className="flex items-center gap-3 py-2"><span className="w-[84px] shrink-0 whitespace-nowrap text-ink">걸어가기</span>생활 탭·지도에서 그 장소로</li>
                    <li className="flex items-center gap-3 py-2"><span className="w-[84px] shrink-0 whitespace-nowrap text-ink">휠, 드래그</span>관심종목 넘기기</li>
                    <li className="flex items-center gap-3 py-2"><span className="w-[84px] shrink-0 whitespace-nowrap text-ink">손잡이 끌기</span>시트 높이 조절</li>
                    <li className="flex items-center gap-3 py-2"><span className="w-[84px] shrink-0"><Key>1~6</Key></span>거래, 소식, 생활, 자산, 시세, 내 정보</li>
                    <li className="flex items-center gap-3 py-2"><span className="w-[84px] shrink-0"><Key>C</Key></span>달력 보기</li>
                    <li className="flex items-center gap-3 py-2"><span className="w-[84px] shrink-0"><Key>P</Key></span>프로필 보기</li>
                    <li className="flex items-center gap-3 py-2"><span className="w-[84px] shrink-0"><Key>Esc</Key></span>시트 닫기</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </>
      )}
      <div className="absolute left-1/2 overflow-hidden"
        style={{ top: pad, width: W, height: h, transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center', borderRadius: wide ? 30 : 0, boxShadow: wide ? '0 0 0 4px #35244a, 10px 10px 0 4px rgba(53,36,74,.9)' : 'none' }}>
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffbd0" /><stop offset="1" stopColor="#ffb84a" /></linearGradient>
            <radialGradient id="glowGold"><stop offset="0" stopColor="#ffe9a0" stopOpacity="0.95" /><stop offset="1" stopColor="#ffe9a0" stopOpacity="0" /></radialGradient>
            <radialGradient id="glowPink"><stop offset="0" stopColor="#ffb3d1" stopOpacity="0.9" /><stop offset="1" stopColor="#ffb3d1" stopOpacity="0" /></radialGradient>
            {/* 면 채색: 윗부분 밝게 → 아래 보랏빛 그림자 (윤곽선 대신 그라데이션으로 입체감) */}
            <linearGradient id="faceL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".26" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#4a3a60" stopOpacity=".34" /></linearGradient>
            <linearGradient id="faceR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".08" /><stop offset="1" stopColor="#3a2a50" stopOpacity=".46" /></linearGradient>
            <linearGradient id="faceAll" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#3a2a50" stopOpacity=".34" /></linearGradient>
            <linearGradient id="roofL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".3" /><stop offset="1" stopColor="#4b3a99" stopOpacity=".2" /></linearGradient>
            <linearGradient id="roofR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".04" /><stop offset="1" stopColor="#20206a" stopOpacity=".44" /></linearGradient>
            <linearGradient id="shadowFade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3c2a8c" stopOpacity=".34" /><stop offset="1" stopColor="#3c2a8c" stopOpacity="0" /></linearGradient>
            <linearGradient id="cylShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".3" /><stop offset=".42" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#3a2a8a" stopOpacity=".42" /></linearGradient>
            {/* 잎: 하이라이트 → 중간색 → 그림자 */}
            <radialGradient id="leafG" cx=".35" cy=".28" r=".85"><stop offset="0" stopColor="#cfe496" /><stop offset=".45" stopColor="#6fa84e" /><stop offset="1" stopColor="#365f3c" /></radialGradient>
            <radialGradient id="sakuraG" cx=".35" cy=".28" r=".85"><stop offset="0" stopColor="#e4d28a" /><stop offset=".45" stopColor="#b8963f" /><stop offset="1" stopColor="#7a5a2a" /></radialGradient>
            <linearGradient id="pineG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#86b87a" /><stop offset=".5" stopColor="#3f7a50" /><stop offset="1" stopColor="#244f3a" /></linearGradient>
            {/* 캐릭터 */}
            <linearGradient id="hairG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffc46e" /><stop offset=".45" stopColor="#f2893f" /><stop offset="1" stopColor="#cf5a30" /></linearGradient>
            <linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2e8" /><stop offset="1" stopColor="#ffd9c4" /></linearGradient>
            <linearGradient id="irisG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1c3fc0" /><stop offset=".55" stopColor="#3f9bf5" /><stop offset="1" stopColor="#a6eeff" /></linearGradient>
            <linearGradient id="cloakG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6fe8b8" /><stop offset="1" stopColor="#2aa690" /></linearGradient>
            <radialGradient id="blushG"><stop offset="0" stopColor="#ff7f9f" stopOpacity=".65" /><stop offset="1" stopColor="#ff7f9f" stopOpacity="0" /></radialGradient>
            <pattern id="grassIso" width="56" height="28" patternUnits="userSpaceOnUse">
              <rect width="56" height="28" fill="#6aa656" />
              <polygon points="0,0 28,14 0,28 -28,14" fill="#73b05e" /><polygon points="56,0 84,14 56,28 28,14" fill="#73b05e" />
              <ellipse cx="14" cy="10" rx="12" ry="5" fill="#88c06e" opacity=".45" /><ellipse cx="44" cy="20" rx="11" ry="4.5" fill="#4d8a44" opacity=".4" />
              <path d="M10,12 l1.5,-3.4 1.5,3.4 M40,20 l1.5,-3.4 1.5,3.4 M26,5 l1.2,-2.8 1.2,2.8 M50,8 l1,-2.4 1,2.4" stroke="#467f3e" strokeWidth="1" fill="none" strokeLinecap="round" opacity=".8" />
              <circle cx="6" cy="22" r="1.1" fill="#7a6a4a" opacity=".5" />
            </pattern>
            {/* 포석 광장: 큰 판석 */}
            <pattern id="plaza" width="30" height="16" patternUnits="userSpaceOnUse">
              <rect width="30" height="16" fill="#8a7f6c" />
              <rect x="1" y="1" width="13" height="6" rx="1" fill="#c9bfa8" /><rect x="16" y="1" width="13" height="6" rx="1" fill="#bfb49b" />
              <rect x="8" y="9" width="13" height="6" rx="1" fill="#c4b9a0" /><rect x="-6" y="9" width="12" height="6" rx="1" fill="#bfb49b" /><rect x="23" y="9" width="12" height="6" rx="1" fill="#bfb49b" />
            </pattern>
            {/* 자갈길: 둥근 조약돌 */}
            <pattern id="cobble" width="22" height="13" patternUnits="userSpaceOnUse">
              <rect width="22" height="13" fill="#7d725f" />
              <ellipse cx="5" cy="3.4" rx="4.6" ry="2.8" fill="#b9ae96" /><ellipse cx="16" cy="3.4" rx="4.6" ry="2.8" fill="#a99e86" />
              <ellipse cx="10.5" cy="9.6" rx="4.8" ry="2.9" fill="#b4a990" /><ellipse cx="0" cy="9.6" rx="3.8" ry="2.9" fill="#a99e86" /><ellipse cx="21" cy="9.6" rx="3.8" ry="2.9" fill="#a99e86" />
              <ellipse cx="4" cy="2.6" rx="2" ry="1" fill="#d4cab4" opacity=".6" /><ellipse cx="9.5" cy="8.8" rx="2" ry="1" fill="#d4cab4" opacity=".6" />
            </pattern>
          </defs>
        </svg>
        {children(h)}
      </div>
    </div>
  );
}
