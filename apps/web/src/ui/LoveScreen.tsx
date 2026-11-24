import { useEffect, useState } from 'react';
import { DATE_COST, LOVE_NEED_PTS, RING_COST, STAGE, WEDDING_COST, stepCost, stepName, type Scene } from '../love';
import { HEROINES } from '../scene/heroines';
import { PixelSprite } from '../scene/PixelHero';
import { useGame } from '../store';
import { useActivity } from './activityStore';

/** 히로인 인연 루트 화면: 평생 한 명을 고르고(되돌릴 수 없다) 데이트 4번 → 약속 → 결혼식을 한 번에 하나씩, 하루에 한 번 진행한다 */
function Portrait({ id }: { id: string }) {
  const [art, setArt] = useState<'happy' | 'normal' | 'none'>('happy');
  const h = HEROINES[id];
  return art === 'none'
    ? <svg viewBox="-2 0 20 22" className="h-[260px] w-auto drop-shadow-[0_6px_0_rgba(0,0,0,.3)]" shapeRendering="crispEdges"><PixelSprite look={h.look} /></svg>
    : <img src={`/art/npc/${id}${art === 'happy' ? '-happy' : ''}.webp`} alt={h.name} onError={() => setArt(art === 'happy' ? 'normal' : 'none')} className="h-[260px] w-auto object-contain object-bottom" />;
}

export function LoveScreen() {
  const close = useActivity((s) => s.close);
  const { love, bond, cash, nick, chooseLove, loveStep } = useGame();
  const [ask, setAsk] = useState<string | null>(null), [msg, setMsg] = useState<string | null>(null);
  const [play, setPlay] = useState<{ title: string; scene: Scene; i: number } | null>(null);
  const me = nick || '아리아', say = (t: string) => t.replaceAll('아리아', me);
  const eligible = Object.values(HEROINES).filter((h) => (bond[h.id]?.pts ?? 0) >= LOVE_NEED_PTS);
  const next = () => setPlay((p) => (p && p.i < p.scene.lines.length - 1 ? { ...p, i: p.i + 1 } : null));
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (play) setPlay(null); else close(); } else if (play && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); } };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  });
  const h = love ? HEROINES[love.id] : null, married = !!love && love.stage >= STAGE.married;
  const go = () => { const r = loveStep(); if ('error' in r) setMsg(r.error); else { setMsg(null); setPlay({ title: r.title, scene: r.scene, i: 0 }); } };
  const btn = 'panel-flat h-11 w-full text-[14px] font-black disabled:opacity-45';
  return (
    <div className="conv absolute inset-0 z-[65] flex flex-col overflow-y-auto" role="dialog" aria-modal="true" aria-label="인연" style={{ background: 'linear-gradient(#ffe9f2, #fff6e8 60%, #ffeef6)' }} onClick={play ? next : undefined}>
      <div className="flex items-center justify-between px-4 pt-3"><h2 className="m-0 font-display text-[20px]">{play ? play.title : '인연'}</h2><button onClick={(e) => { e.stopPropagation(); play ? setPlay(null) : close(); }} className="panel-flat h-8 bg-white px-2.5 text-[12px] font-black">{play ? '그만 보기' : '닫기'}</button></div>
      {h && <div className="flex justify-center pt-1"><Portrait id={h.id} /></div>}
      {play && h ? (
        <div className="m-3 border-[2.5px] border-ink bg-white px-4 pb-4 pt-5 shadow-[4px_4px_0_#000]" style={{ borderRadius: '16px 16px 16px 3px' }}>
          <p className="m-0 mb-1 text-[11.5px] font-black text-ink2">{play.scene.place}</p>
          <p className="m-0 text-[15px] font-bold leading-relaxed"><b className="mr-1.5 font-display">{h.name}</b>{say(play.scene.lines[play.i])}</p>
          <p className="m-0 mt-2 text-right text-[11px] font-bold text-ink2">{play.i < play.scene.lines.length - 1 ? '화면을 눌러 다음으로' : '화면을 누르면 돌아가요'}</p>
        </div>
      ) : (
        <div className="m-3 space-y-2.5 panel-flat bg-white p-4">
          {!love ? (
            <>
              <p className="m-0 text-[13px] font-bold">{h ? '' : `여덟 번째 이야기까지 들은 사람 중 평생 한 명을 골라요. 한 번 정하면 되돌릴 수 없어요. 다른 사람과의 이야기와 선물은 그대로 이어져요.`}</p>
              {eligible.length === 0 && <p className="m-0 text-[12.5px] font-bold text-ink2">아직 여덟 번째 이야기까지 들은 사람이 없어요. 히로인과 여덟 번 이야기를 나눠 보세요(하루에 한 번).</p>}
              {eligible.map((x) => (
                <button key={x.id} onClick={() => { if (ask !== x.id) { setAsk(x.id); setMsg(null); setTimeout(() => setAsk((a) => (a === x.id ? null : a)), 4000); } else { setAsk(null); setMsg(chooseLove(x.id)); } }} className={`${btn} ${ask === x.id ? 'bg-[#fff0b8]' : 'bg-white'}`}>
                  {ask === x.id ? `${x.name}와(과) 평생을 약속해요? 한 번 더 누르면 정해져요` : `${x.name} (${x.title})`}
                </button>
              ))}
            </>
          ) : (
            <>
              <p className="m-0 font-display text-[18px]">{h!.name}{married ? '와(과) 함께 살고 있어요' : '와(과)의 인연'}</p>
              <p className="m-0 text-[12.5px] font-bold text-ink2">{married ? `마을의 작은 집에서 함께 살아요. ${h!.name}와(과)의 일상 대사는 대화에서 들을 수 있어요.` : `지금까지 ${love.stage < 4 ? `데이트 ${love.stage}번` : love.stage === 4 ? '데이트 4번을 마쳤어요' : '반지를 나눴어요'}. 하루에 한 번씩 이어 가요.`}</p>
              {!married && <button disabled={cash < stepCost(love.stage)} onClick={go} className={`${btn} bg-[#ffe3ee]`}>{stepName(love.stage)} ({stepCost(love.stage).toLocaleString('ko-KR')} 마나)</button>}
              {!married && <p className="m-0 text-[11px] font-bold text-ink2">데이트 {DATE_COST}, 반지 {RING_COST.toLocaleString('ko-KR')}, 결혼식 {WEDDING_COST.toLocaleString('ko-KR')} 마나가 들어요. 쓴 마나는 돌아오지 않고 시세와 상관없어요.</p>}
            </>
          )}
          {msg && <p className="m-0 text-[12.5px] font-black" role="status">{msg}</p>}
        </div>
      )}
    </div>
  );
}
