import { useState } from 'react';

export type Mood = 'normal' | 'happy' | 'worried' | 'wow';

/** 대화창 초상화 일러스트 (apps/web/public/art). 없으면 아래 SVG 얼굴로 대신한다. 월드 캐릭터와 HUD 아바타는 도트(PixelHero)다 */
export const ART = {
  portrait: (m: Mood) => `/art/portrait-${m}.webp`,
};
export const preloadArt = () => [...(['normal', 'happy', 'worried', 'wow'] as Mood[]).map(ART.portrait)].forEach((u) => { new Image().src = u; });
const L = '#3a2748'; // 캐릭터 윤곽선 (검정 대신 짙은 자주)
const ho = { stroke: L, strokeWidth: 2.3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** 눈: 크고 또렷한 홍채(그라데이션+링) + 다중 하이라이트 + 굵은 윗속눈썹과 꼬리 */
function Eye({ mirror, mood }: { mirror?: boolean; mood: Mood }) {
  return (
    <g transform={`translate(${mirror ? 124 : 76} 124)${mirror ? ' scale(-1.3 1.3)' : ' scale(1.3)'}`}>
      {mood === 'happy' ? (
        <>
          <path d="M-13,4 Q0,-14 13,4" stroke={L} strokeWidth="4.4" fill="none" strokeLinecap="round" />
          <path d="M-14,4 l-4.5,-3" stroke={L} strokeWidth="2.6" strokeLinecap="round" />
        </>
      ) : (
        <g transform={mood === 'wow' ? 'scale(1.1)' : undefined}>
          <ellipse rx="12.4" ry="16" fill="#fff" />
          <ellipse cy="1.5" rx="10.4" ry="14.4" fill="url(#irisG)" />
          <ellipse cy="1.5" rx="10.4" ry="14.4" fill="none" stroke="#173a9a" strokeWidth="1.2" opacity=".6" />
          <ellipse cy="3" rx="4.6" ry="7.6" fill="#101640" />
          <path d="M-10.6,-2 Q0,-15.5 10.6,-2 L10.6,-14 Q0,-20 -10.6,-14Z" fill="#14184a" opacity=".5" />
          {/* 홍채의 빛 반사 */}
          <path d="M-8,5 Q-5,13 2,13.5" stroke="#bff4ff" strokeWidth="1.6" fill="none" opacity=".9" strokeLinecap="round" />
          <path d="M5,-2 L6.2,1 L9,1.6 L6.8,3.4 L7.4,6.4 L5,4.8 L2.6,6.4 L3.2,3.4 L1,1.6 L3.8,1Z" fill="#fff" opacity=".85" transform="translate(1 5) scale(.7)" />
          <circle cx="-4" cy="-5.8" r="4.2" fill="#fff" /><circle cx="4.8" cy="7.4" r="2" fill="#fff" />
          {/* 윗속눈썹: 굵은 한 줄 + 바깥 꼬리 */}
          <path d="M-14.4,-4.6 Q-8,-19.6 6,-17.6 Q12.6,-16 15,-8" stroke={L} strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M-14.4,-4.6 L-19.6,-9.6" stroke={L} strokeWidth="3" strokeLinecap="round" />
          <path d="M-9,-17 Q-2,-22 8,-19.4" stroke={L} strokeWidth="1.1" fill="none" opacity=".55" />
          <path d="M-11,11 Q0,19 11,10" stroke={L} strokeWidth="1" opacity=".4" fill="none" />
        </g>
      )}
    </g>
  );
}

const FACE = 'M56,98 C56,66 76,50 100,50 C124,50 144,66 144,98 C144,128 130,154 112,168 Q100,176 88,168 C70,154 56,128 56,98Z';

/** 머리 뒤쪽: 트윈테일 + 뒷머리 (몸보다 먼저 그린다) */
export function HeadBack({ sway = true }: { sway?: boolean }) {
  const bow = (x: number, y: number, rot: number) => (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(1.3)`}>
      <path d="M0,0 L-17,-10 Q-20,0 -17,10Z" fill="#ff5f98" {...ho} strokeWidth="2" /><path d="M0,0 L17,-10 Q20,0 17,10Z" fill="#ff5f98" {...ho} strokeWidth="2" />
      <path d="M-14,-5 L-5,-1 M14,-5 L5,-1" stroke="#ff9bc4" strokeWidth="2" strokeLinecap="round" /><circle r="4.4" fill="#ff86b4" {...ho} strokeWidth="2" />
    </g>
  );
  return (
    <g>
      <path d="M46,100 C34,44 64,10 100,10 C136,10 166,44 154,100 L146,132 L54,132Z" fill="#d9682e" {...ho} />
      {/* 왼쪽 테일 */}
      <g className={sway ? 'tail-l' : undefined}>
        <path d="M60,70 C26,66 4,100 12,144 C16,174 8,206 24,240 C38,222 48,200 48,172 C50,142 48,114 66,94Z" fill="url(#hairG)" {...ho} />
        <path d="M30,98 C20,128 24,170 22,208" stroke="#ffe6b0" strokeWidth="3.2" fill="none" strokeLinecap="round" opacity=".75" />
        <path d="M42,112 C38,142 40,172 32,222" stroke="#b8481e" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".5" />
        <path d="M18,150 C14,178 20,206 24,230" stroke="#b8481e" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".4" />
      </g>
      {/* 오른쪽 테일 (살짝 다른 곡선으로 바람 느낌) */}
      <g className={sway ? 'tail-r' : undefined}>
        <path d="M140,70 C174,64 198,96 190,138 C186,166 196,196 178,232 C166,216 154,196 154,170 C152,142 154,112 134,94Z" fill="url(#hairG)" {...ho} />
        <path d="M168,98 C180,128 176,168 180,204" stroke="#ffe6b0" strokeWidth="3.2" fill="none" strokeLinecap="round" opacity=".75" />
        <path d="M158,112 C162,142 160,172 168,216" stroke="#b8481e" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".5" />
      </g>
      {bow(44, 86, -24)}{bow(156, 86, 24)}
    </g>
  );
}

/** 얼굴과 앞머리 */
export function HeadFront({ mood = 'normal' }: { mood?: Mood }) {
  const mouth = {
    normal: <path d="M94,153 Q100,158 106,153" stroke="#b04a4a" strokeWidth="2" fill="none" strokeLinecap="round" />,
    happy: <><path d="M92,150 Q100,166 108,150 Z" fill="#ff6f86" stroke={L} strokeWidth="1.9" strokeLinejoin="round" /><path d="M96,158 Q100,163 104,158 Q100,155 96,158Z" fill="#ffb0bd" /></>,
    worried: <path d="M93,157 Q96,151 100,155 Q104,159 107,153" stroke="#b04a4a" strokeWidth="2" fill="none" strokeLinecap="round" />,
    wow: <ellipse cx="100" cy="153" rx="4.4" ry="6" fill="#ff6f86" stroke={L} strokeWidth="1.9" />,
  }[mood];
  const brow = mood === 'worried' ? ['M62,98 Q76,98 92,88', 'M108,88 Q124,98 138,98'] : ['M64,95 Q78,87 93,93', 'M107,93 Q122,87 136,95'];
  return (
    <g>
      <defs><clipPath id="heroFaceClip"><path d={FACE} /></clipPath></defs>
      <path d="M90,160 h20 v28 q-10,8 -20,0Z" fill="#f6cdb8" {...ho} strokeWidth="2.1" />
      <path d={FACE} fill="url(#skinG)" stroke={L} strokeWidth="2.4" strokeLinejoin="round" />
      {/* 얼굴 셀 셰이딩(오른쪽 그림자) + 볼터치 */}
      <path d="M144,98 C144,128 130,154 112,168 Q104,174 98,173 C120,156 134,132 132,98Z" fill="rgba(238,160,150,.4)" clipPath="url(#heroFaceClip)" />
      <ellipse cx="70" cy="140" rx="11" ry="6.5" fill="url(#blushG)" /><ellipse cx="130" cy="140" rx="11" ry="6.5" fill="url(#blushG)" />
      <path d="M63,139 l3,5.5 M69,138 l3,5.5 M128,139 l3,5.5 M134,138 l3,5.5" stroke="#ff8aa6" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
      <Eye mood={mood} /><Eye mirror mood={mood} />
      <path d={brow[0]} stroke="#b4521f" strokeWidth="2.3" fill="none" strokeLinecap="round" /><path d={brow[1]} stroke="#b4521f" strokeWidth="2.3" fill="none" strokeLinecap="round" />
      <path d="M99,144 q1.6,2.2 3.2,0" stroke="#e0a090" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {mouth}

      {/* 옆머리(볼 옆으로 흘러내려 뾰족하게 끝남) */}
      <path d="M54,92 C45,120 45,156 57,200 C62,166 62,132 69,106Z" fill="url(#hairG)" {...ho} strokeWidth="2.2" />
      <path d="M146,92 C155,120 155,156 143,200 C138,166 138,132 131,106Z" fill="url(#hairG)" {...ho} strokeWidth="2.2" />
      <path d="M52,110 C49,136 50,162 55,184" stroke="#ffe6b0" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".7" />
      {/* 앞머리: 가운데 가르마에서 좌우로 쓸어 넘긴 큰 가닥 + 짧은 잔머리 */}
      <path d="M100,32 C122,32 146,48 150,82 C152,96 152,110 146,124 C143,104 134,90 122,82 C108,74 102,58 100,32Z" fill="url(#hairG)" {...ho} />
      <path d="M100,32 C80,32 56,48 51,82 C49,94 51,106 57,116 C60,102 68,90 78,82 C90,74 98,58 100,32Z" fill="url(#hairG)" {...ho} />
      <path d="M86,74 C80,81 78,89 80,97 C85,91 90,84 93,75Z" fill="url(#hairG)" {...ho} strokeWidth="2" />
      <path d="M114,76 C113,84 116,91 120,97 C124,90 122,82 119,75Z" fill="url(#hairG)" {...ho} strokeWidth="2" />
      <path d="M50,92 C42,46 70,14 100,14 C130,14 158,46 150,92 C146,66 126,42 100,32 C74,42 54,66 50,92Z" fill="url(#hairG)" {...ho} />
      {/* 천사링과 가닥 하이라이트 */}
      <path d="M62,48 Q100,18 138,48" stroke="#fff6dc" strokeWidth="7" fill="none" strokeLinecap="round" opacity=".88" />
      <path d="M72,60 Q82,48 96,43" stroke="#fff6dc" strokeWidth="3.2" fill="none" strokeLinecap="round" opacity=".6" />
      <path d="M62,64 C57,76 56,90 60,104" stroke="#ffe2a8" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".75" />
      <path d="M140,62 C146,76 146,92 143,108" stroke="#ffe2a8" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".75" />
      {/* 이마에 드리운 앞머리 그림자 */}
      <path d="M64,92 C69,86 77,80 86,78 C84,83 82,88 82,92 C76,88 69,88 64,92Z" fill="rgba(150,64,52,.25)" />
      {/* 아호게와 별 머리핀 */}
      <path d="M100,16 C94,0 110,-10 124,0 C112,0 108,12 110,26Z" fill="url(#hairG)" {...ho} strokeWidth="2.1" />
      <polygon points="138,40 142,49 152,50 144,56 147,66 138,60 129,66 132,56 124,50 134,49" fill="#ffd25a" stroke={L} strokeWidth="1.8" strokeLinejoin="round" />
    </g>
  );
}

/** 대화창/HUD용 상반신 초상화 (viewBox 0 -12 200 276). 살짝 기울인 포즈 */
function HeroPortraitSvg({ mood = 'normal', className }: { mood?: Mood; className?: string }) {
  return (
    <svg viewBox="0 -12 200 276" className={className} overflow="visible">
      <g transform="rotate(-4 100 150)">
        <HeadBack />
        {/* 망토 */}
        <path d="M4,268 C8,214 46,190 84,184 L116,184 C154,190 192,214 196,268Z" fill="url(#cloakG)" {...ho} strokeWidth="2.5" />
        <path d="M116,184 C154,190 192,214 196,268 L154,268 C154,230 142,200 116,184Z" fill="rgba(20,70,110,.3)" />
        <path d="M10,250 C16,222 48,200 84,192" stroke="#ffd25a" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* 블라우스와 깃 */}
        <path d="M84,184 L100,224 L116,184 L134,194 L100,268 L66,194Z" fill="#fff6e4" {...ho} strokeWidth="2.2" />
        <path d="M100,224 L116,184 L134,194 L100,268Z" fill="rgba(214,170,140,.4)" />
        <path d="M86,174 L100,194 L114,174 L122,180 L100,206 L78,180Z" fill="#fff" {...ho} strokeWidth="2" />
        {/* 가슴 리본 */}
        <g transform="translate(100 214)">
          <path d="M0,0 L-22,-13 Q-27,0 -22,13Z" fill="#ff5f98" {...ho} strokeWidth="2.1" /><path d="M0,0 L22,-13 Q27,0 22,13Z" fill="#ff5f98" {...ho} strokeWidth="2.1" />
          <path d="M-4,4 L-8,26 L-1,22 L2,28 L5,6Z" fill="#ff5f98" {...ho} strokeWidth="1.8" /><circle r="5.5" fill="#ff86b4" {...ho} strokeWidth="2.1" />
        </g>
        {/* 어깨 브로치 */}
        <polygon points="46,214 49.5,222 58,223 51.5,228 53.5,236 46,231.5 38.5,236 40.5,228 34,223 42.5,222" fill="#ffd25a" {...ho} strokeWidth="1.7" />
        <HeadFront mood={mood} />
      </g>
    </svg>
  );
}

export function HeroPortrait({ mood = 'normal', className }: { mood?: Mood; className?: string }) {
  const [bad, setBad] = useState<string | null>(null);
  const src = ART.portrait(mood);
  if (bad === src) return <HeroPortraitSvg mood={mood} className={className} />;
  return <img src={src} alt="" draggable={false} onError={() => setBad(src)} className={className} style={{ objectFit: 'contain', objectPosition: 'left bottom' }} />;
}
