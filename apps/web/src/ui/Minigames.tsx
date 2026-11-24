import { useCallback, useEffect, useRef, useState } from 'react';
import { josa } from '../josa';
import { SPOTS, matName } from '../gather';
import { catchOf, fishDifficulty, judgeTiming, sparkleCells, triangle } from '../activity';
import { useGame } from '../store';
import { easyOn, useActivity } from './activityStore';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const Frame = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <div className="conv absolute inset-0 z-[65] flex flex-col items-center justify-center gap-3 px-5" role="dialog" aria-modal="true" aria-label={title} style={{ background: 'rgba(36,24,56,.78)' }}>
    <div className="panel-flat w-full max-w-[380px] space-y-3 bg-paper p-4">
      <div className="flex items-center justify-between"><h2 className="m-0 font-display text-[19px]">{title}</h2><button onClick={onClose} className="panel-flat h-8 px-2.5 text-[12px] font-black">닫기</button></div>
      {children}
    </div>
  </div>
);
/** 스페이스·엔터로도 누른다(버튼에 포커스가 있으면 기본 동작이 이미 눌러 준다) */
function useKeyPress(fn: () => void) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.key === ' ' || e.key === 'Enter') && (e.target as HTMLElement)?.tagName !== 'BUTTON') { e.preventDefault(); ref.current(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
}
/** 왕복 게이지: 중앙 구간(zone)에서 멈추면 높은 점수. 모션 감소 설정이면 칸 단위로만 움직인다 */
function Gauge({ pos, zone }: { pos: number; zone: number }) {
  return (
    <div className="relative h-9 border-[3px] border-ink bg-white" role="img" aria-label="찌 게이지">
      <div className="absolute inset-y-0 bg-[#ffd36b]" style={{ left: `${(0.5 - zone) * 100}%`, width: `${zone * 200}%` }} />
      <div className="absolute inset-y-0 w-1.5 bg-[#e8432e]" style={{ left: `calc(${pos * 100}% - 3px)` }} />
    </div>
  );
}

export function FishGame() {
  const close = useActivity((s) => s.close);
  const { market, act, rod, fishCast } = useGame();
  const cast = act.day === market.day ? act.casts : 0, day = market.day;
  const easy = easyOn(), calm = reduced();
  const hooked = catchOf(day, cast, rod), d = fishDifficulty(hooked.level, day, cast, easy);
  const [phase, setPhase] = useState<'wait' | 'bite' | 'done'>('wait'), [pos, setPos] = useState(0), [msg, setMsg] = useState(''), [score, setScore] = useState(-1);
  const t0 = useRef(0), posRef = useRef(0), phaseRef = useRef(phase);
  phaseRef.current = phase;
  useEffect(() => { const t = setTimeout(() => { t0.current = performance.now(); setPhase('bite'); }, d.biteMs); return () => clearTimeout(t); }, [d.biteMs]);
  useEffect(() => {
    if (phase !== 'bite') return;
    let raf = 0;
    const tick = (t: number) => {
      const el = (t - t0.current) / 1000;
      const p = triangle(calm ? Math.floor(el * 3) / 3 * d.speed : el * d.speed);
      posRef.current = calm ? Math.round(p * 6) / 6 : p; setPos(posRef.current);
      if (el > 15) { finish(0); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  const finish = useCallback((sc: number) => {
    if (phaseRef.current === 'done') return;
    phaseRef.current = 'done'; setPhase('done'); setScore(sc); setMsg(fishCast(sc));
  }, [fishCast]);
  const press = () => { if (phase === 'bite') finish(judgeTiming(posRef.current, d.zone)); };
  useKeyPress(press);
  const again = true;
  return (
    <Frame title={`낚시 ${cast + 1}번째`} onClose={close}>
      {phase === 'wait' && <p className="m-0 text-center text-[14px] font-bold" role="status">찌를 가만히 지켜보는 중…</p>}
      {phase !== 'wait' && <Gauge pos={phase === 'done' ? posRef.current : pos} zone={d.zone} />}
      {phase === 'bite' && <p className="m-0 text-center text-[14px] font-black" role="status">물렸다! 빨간 막대가 노란 칸 안에 올 때 눌러요.</p>}
      {phase === 'done' && (
        <p className="m-0 text-[13.5px] font-bold" role="status">{['놓쳐 버렸어요. ', '조금 아쉬워요. ', '좋은 타이밍이에요! ', '딱 맞았어요! '][score] ?? ''}{msg}<br /><span className="text-[11.5px] text-ink2">{hooked.kind === 'item' ? '물건은 마나 값어치가 없어요' : hooked.kind === 'creature' ? '낚싯대 단계가 높을수록 더 다양한 생물이 걸려요' : '타이밍이 아쉬우면 값이 절반이 돼요'}</span></p>
      )}
      {phase === 'bite' && <button onClick={press} className="panel-flat h-12 w-full bg-[#ffe3ee] text-[15px] font-black">낚아채기</button>}
      {phase === 'done' && <div className="flex gap-2">{again && <button onClick={() => useActivity.getState().openIt({ kind: 'fish' })} className="panel-flat h-10 flex-1 text-[13px] font-black">한 번 더 던지기</button>}<button onClick={close} className="panel-flat h-10 flex-1 text-[13px] font-black">그만하기</button></div>}
      <p className="m-0 text-[11px] font-bold text-ink2">스페이스·엔터로도 눌러요. 놓쳐도 잃는 건 없어요. {easy ? '쉬운 모드예요.' : '프로필에서 쉬운 모드를 켤 수 있어요.'}</p>
    </Frame>
  );
}

export function GatherGame({ spot }: { spot: number }) {
  const close = useActivity((s) => s.close), { market, gatherAt } = useGame();
  const sp = SPOTS[spot], day = market.day, easy = easyOn(), calm = reduced();
  const [found, setFound] = useState(0), [step, setStep] = useState(0), [shown, setShown] = useState<number | null>(null), [msg, setMsg] = useState(''), [done, setDone] = useState(false);
  const cells = sparkleCells(day, spot), hold = useRef(false);
  const end = useCallback((good: number) => { if (hold.current) return; hold.current = true; setDone(true); setMsg(gatherAt(spot, good >= 3) ?? ''); }, [gatherAt, spot]);
  // 풀·열매: 반짝임이 3번 차례로 잠깐씩 나타난다
  useEffect(() => {
    if (sp.kind === 'stone' || done) return;
    const life = (calm ? 3000 : easy ? 2200 : 1400), t1 = setTimeout(() => setShown(cells[step]), 500), t2 = setTimeout(() => { setShown(null); if (step >= 2) end(found); else setStep((x) => x + 1); }, 500 + life);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, done]);
  const tap = (c: number) => { if (shown === c && !done) { setFound((f) => f + 1); setShown(null); } };
  // 돌: 곡괭이 타이밍 3번
  const [pos, setPos] = useState(0), posRef = useRef(0), t0 = useRef(performance.now()), good = useRef(0), tries = useRef(0), [swings, setSwings] = useState(0);
  const zone = easy ? 0.26 : 0.15, speed = 0.9;
  useEffect(() => {
    if (sp.kind !== 'stone' || done) return;
    let raf = 0;
    const tick = (t: number) => { const el = (t - t0.current) / 1000, p = triangle(calm ? Math.floor(el * 3) / 3 * speed : el * speed); posRef.current = calm ? Math.round(p * 6) / 6 : p; setPos(posRef.current); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  const swing = () => { if (sp.kind !== 'stone' || done) return; if (judgeTiming(posRef.current, zone) >= 2) good.current++; tries.current++; setSwings(tries.current); if (tries.current >= 3) end(good.current); };
  useKeyPress(swing);
  const title = sp.kind === 'stone' ? '바위틈 캐기' : `${sp.label} 살펴보기`, name = matName(sp.kind, day);
  return (
    <Frame title={title} onClose={close}>
      {sp.kind === 'stone' ? (
        <>
          <p className="m-0 text-[13px] font-bold">곡괭이를 세 번 내리쳐요. 빨간 막대가 노란 칸에 있을 때 누르면 잘 캐져요. ({swings}/3)</p>
          <Gauge pos={pos} zone={zone} />
          {!done && <button onClick={swing} className="panel-flat h-12 w-full bg-[#ffe3ee] text-[15px] font-black">내리치기</button>}
        </>
      ) : (
        <>
          <p className="m-0 text-[13px] font-bold">{josa(name, '이가')} 있는 곳이 잠깐 반짝여요. 반짝이는 칸을 눌러요. ({Math.min(step + 1, 3)}/3번째, 찾은 것 {found})</p>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, c) => (
              <button key={c} onClick={() => tap(c)} aria-label={shown === c ? `반짝이는 칸 ${c + 1}` : `칸 ${c + 1}`} className={`panel-flat h-16 text-[24px] ${shown === c ? 'bg-[#fff2a8]' : 'bg-[#e8f6dc]'}`}>{shown === c ? '✦' : ''}</button>
            ))}
          </div>
        </>
      )}
      {done && <><p className="m-0 text-[13.5px] font-black" role="status">{msg}</p><button onClick={close} className="panel-flat h-10 w-full text-[13px] font-black">돌아가기</button></>}
      <p className="m-0 text-[11px] font-bold text-ink2">잘 못해도 재료는 똑같이 얻어요. 잘하면 상등품이 돼요. {easy ? '쉬운 모드예요.' : '프로필에서 쉬운 모드를 켤 수 있어요.'}</p>
    </Frame>
  );
}
