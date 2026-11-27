import { useEffect, useState } from 'react';
import { HeroPortrait, type Mood } from '../scene/Hero';
import { fmt0 } from '../format';
import { START_CASH } from '../store';
import { dateLong } from '../calendar';
import { useGame } from '../store';
import { HERO_NAME } from './Dialogue';

export const STEWARD = '왕실 집사 발렌';

type Beat =
  | { who: 'narr'; text: string }
  | { who: 'aria' | 'steward'; text: string; mood?: Mood }
  | { who: 'grant' };

/** 오프닝: 낯선 광장에서 눈을 뜬 아리아가 왕실로부터 첫 장사 밑천을 받는다 */
const makeBeats = (date: string, nick: string): Beat[] => [
  { who: 'narr', text: '눈을 떠 보니 낯선 광장이었다.\n분수 소리, 돌바닥, 그리고 멀리 솟은 성.' },
  { who: 'narr', text: `이 세계의 시간은 당신이 떠나온 세계와\n나란히 흐른다.\n\n오늘은 ${date}.` },
  { who: 'aria', text: '여기… 어디야? 분명 방금까지 집이었는데.', mood: 'wow' },
  { who: 'steward', text: `어서 오십시오, ${nick} 님. 이곳은 왕국 최대의 거래 도시, 마나 마켓입니다.` },
  { who: 'aria', text: '이, 이세계라는 거야? 저는 장사 같은 건 해 본 적도 없는데…', mood: 'worried' },
  { who: 'steward', text: '걱정 마십시오. 우리 왕국은 새로 온 상인에게 첫 밑천을 내립니다.' },
  { who: 'grant' },
  { who: 'aria', text: '우와… 이게 전부 내 거야?!', mood: 'happy' },
  { who: 'steward', text: '시세는 하루 종일 조금씩 움직이고, 왕국의 자정에 새 하루가 시작됩니다. 소식을 읽고 길드에서 사고팔며 마나를 불리십시오. 다만 소문은 틀릴 수도 있으니 조심하시길.' },
  { who: 'aria', text: '좋아, 해 보자! 먼저 길드들부터 둘러볼까?', mood: 'happy' },
];

/** 왕실 문장(방패 + 왕관): 집사의 초상화 대신 */
function Crest() {
  return (
    <svg viewBox="0 0 100 120" className="h-full w-full">
      <path d="M50 6 L92 20 V60 Q92 96 50 114 Q8 96 8 60 V20Z" fill="#2c3f7a" stroke="#35244a" strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 14 L84 25 V60 Q84 90 50 105 Q16 90 16 60 V25Z" fill="none" stroke="#ffc13b" strokeWidth="2.5" />
      <path d="M30 62 L36 38 L44 52 L50 34 L56 52 L64 38 L70 62Z" fill="#ffc13b" stroke="#35244a" strokeWidth="3" strokeLinejoin="round" />
      <rect x="30" y="62" width="40" height="8" rx="2" fill="#ffc13b" stroke="#35244a" strokeWidth="3" />
    </svg>
  );
}

/** 지원 증서: 도장이 쾅 찍힌다 */
function Certificate({ onTake }: { onTake: () => void }) {
  const [stamped, setStamped] = useState(false);
  useEffect(() => { const t = setTimeout(() => setStamped(true), 700); return () => clearTimeout(t); }, []);
  return (
    <div className="absolute inset-0 flex items-center justify-center px-5">
      <div className="panel dlg relative w-full max-w-[340px] bg-white px-5 pb-5 pt-4 text-center">
        <h2 className="head isolate m-0 mb-3">왕실 상인 지원 증서</h2>
        <p className="font-print m-0 text-[13px] font-bold leading-relaxed text-ink2">이 상인에게 왕국 마나 마켓에서의 첫 장사 밑천을 내린다.</p>
        <div className="my-4 font-num text-[40px] leading-none tabular-nums">{fmt0(START_CASH)} <span className="text-[18px]">마나</span></div>
        <p className="m-0 text-right text-[12px] font-bold text-ink2">{STEWARD}</p>
        {stamped && <span className="stamp" style={{ right: 26, bottom: 62, width: 96, height: 96, fontSize: 36, animation: 'stamp-in .42s cubic-bezier(.2,.9,.3,1) both' }}>지급</span>}
        <button onClick={onTake} disabled={!stamped} className="btn3d mt-3 h-11 w-full text-[16px]" style={{ ['--c' as string]: '#ffc13b', color: '#35244a', textShadow: 'none' }}>받기</button>
      </div>
    </div>
  );
}

/** 오프닝 스토리. 아무 곳이나 탭하면 다음 장면으로, 건너뛰어도 지원금은 받는다 */
export function Story({ onGrant, onDone, onCoins }: { onGrant: () => void; onDone: () => void; onCoins: () => void }) {
  const BEATS = makeBeats(dateLong(useGame.getState().market.day), useGame.getState().nick || '이방인');
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const beat = BEATS[i];
  const text = beat.who === 'grant' ? '' : beat.text;
  useEffect(() => {
    setN(0);
    if (!text) return;
    const t = setInterval(() => setN((v) => { if (v + 1 >= text.length) clearInterval(t); return Math.min(text.length, v + 1); }), 26);
    return () => clearInterval(t);
  }, [i, text]);
  const done = n >= text.length;
  const next = () => (i + 1 >= BEATS.length ? onDone() : setI(i + 1));
  const tap = () => { if (beat.who === 'grant') return; if (!done) setN(text.length); else next(); };
  const skip = () => { onGrant(); onCoins(); onDone(); };

  return (
    <div className="absolute inset-0 z-[60]" onClick={tap}>
      {beat.who === 'narr' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1f1530]/90 px-8 text-center">
          <p className="font-print m-0 whitespace-pre-line text-[17px] font-black leading-[1.9] text-[#f4ead4]">{text.slice(0, n)}</p>
          {done && <span className="caret absolute bottom-24 text-[13px] text-pink">▼ 탭하여 계속</span>}
        </div>
      ) : beat.who === 'grant' ? (
        <>
          <div className="absolute inset-0 bg-[#1f1530]/55" />
          <Certificate onTake={() => { onGrant(); onCoins(); next(); }} />
        </>
      ) : (
        <>
          <div className="absolute inset-x-0 bottom-0 h-[320px] bg-gradient-to-t from-[#1f1530]/55 to-transparent" />
          <div className="dlg absolute inset-x-0" style={{ bottom: 90 }}>
            <div className="pointer-events-none absolute -left-3 bottom-0 z-0 h-[158px] w-[158px]">
              {beat.who === 'aria' ? <HeroPortrait mood={beat.mood ?? 'normal'} className="port h-full w-full" /> : <div className="port ml-5 mt-8 h-[120px] w-[100px]"><Crest /></div>}
            </div>
            <div className="relative z-10 ml-[118px] mr-2.5 min-h-[92px] border-[2.5px] border-ink bg-white px-4 pb-3 pt-[22px] text-left shadow-[4px_4px_0_#35244a]" style={{ borderRadius: '18px 18px 18px 3px' }}>
              <span className="absolute -left-[13px] bottom-3 h-0 w-0 border-y-[8px] border-r-[13px] border-y-transparent border-r-ink" />
              <span className="absolute -left-[8px] bottom-[14.5px] h-0 w-0 border-y-[6px] border-r-[10px] border-y-transparent border-r-white" />
              <span className="absolute -top-3 left-3 bg-ink px-2.5 py-px font-display text-[12px] text-white [clip-path:polygon(0_0,100%_0,93%_100%,0_100%)]">{beat.who === 'aria' ? HERO_NAME : STEWARD}</span>
              <p className="m-0 min-h-[40px] pr-3 text-[13.5px] font-bold leading-relaxed">{text.slice(0, n)}</p>
              {done && <span className="caret absolute bottom-1.5 right-3 text-[11px] text-pink">▼</span>}
            </div>
          </div>
        </>
      )}
      <button onClick={(e) => { e.stopPropagation(); skip(); }} className="panel-flat absolute right-3 top-[118px] bg-white/90 px-2.5 py-1 text-[11px] font-black text-ink2">건너뛰기</button>
    </div>
  );
}
