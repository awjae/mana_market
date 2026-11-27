import { useEffect, useRef, useState } from 'react';
import { TUT_LEN, useGame } from '../store';
import type { Size, Tab } from './layout';

interface Step { title: string; text: string; touchText?: string; target?: string }

const STEPS: Step[] = [
  { title: '마을 걸어 보기', text: '방향키(또는 WASD)로 광장을 걸어 보세요. 땅을 눌러도 그 자리로 걸어가요. 건물 앞에는 길드가 있어요.', touchText: '왼쪽 아래 패드를 밀어 걸어 보세요. 땅을 탭하면 그 자리로, 길드 건물을 탭하면 그 앞으로 가요.' },
  { title: '장부 열기', text: '길드 앞에서 Enter를 누르거나, 건물이나 칩을 눌러 거래 장부를 여세요.', touchText: '길드 앞에 서면 뜨는 "탭 거래" 버튼이나, 건물·위쪽 칩을 눌러 장부를 여세요.' },
  { title: '첫 주식 사기', text: '수량은 그대로 두고 아래 "사기" 버튼을 눌러 주식 1주를 사 보세요.', target: '[data-tut="buy"]' },
  { title: '달력 보기', text: '가운데 달력 버튼을 눌러 보세요. 이 세계의 하루는 현실의 하루와 같고, 왕국의 자정에 종이 울리면 새 하루가 시작되고 새 소식이 붙어요.', target: '[data-tut="fab"]' },
  { title: '소식 읽기', text: '소식 탭에서 공시와 소문을 읽어 보세요. 공시는 확정된 사실, 소문은 틀릴 수도 있어요.', target: '[data-tut="tab-news"]' },
  { title: '내 자산 보기', text: '자산 탭에서 현금과 주식, 손익을 확인하세요.', target: '[data-tut="tab-assets"]' },
  { title: '말걸기', text: '머리 위에 ♥가 떠 있는 사람은 이야기가 있는 친구예요. 길드 앞의 히로인에게 다가가 E 키로 말을 걸어 보세요.', touchText: '머리 위에 ♥가 떠 있는 사람은 이야기가 있는 친구예요. 길드 앞의 히로인을 탭하거나, 가까이 가면 뜨는 버튼을 눌러 보세요.' },
  { title: '생활 탭 보기', text: '아래 "생활" 탭을 열어 오늘 할 수 있는 일을 보고, 장소 옆 "걸어가기"를 눌러 보세요. 길을 찾아 그 자리로 가고, 도착하면 E 키(터치는 버튼)로 채집·낚시·던전을 시작해요.', target: '[data-tut="tab-life"]' },
];

/** 따라 하는 튜토리얼: 실제 조작을 감지해 자동으로 다음 단계로 넘어가고, 눌러야 할 버튼은 반짝인다 */
export function Tutorial({ top, size, tab, onComplete }: { top: number; size: Size; tab: Tab; onComplete: () => void }) {
  const { granted, tutStep, setTutStep, holdings, market, pickSeq } = useGame();
  const active = granted && tutStep < TUT_LEN;
  const [moved, setMoved] = useState(false);
  const [talked, setTalked] = useState(false);
  const [guided, setGuided] = useState(false);
  const basePick = useRef(pickSeq);
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const open = size !== 'closed';

  // 걷기 감지 (방향키)
  useEffect(() => {
    if (!active) return;
    const f = (e: KeyboardEvent) => { if (/^(Arrow(Up|Down|Left|Right)|[wasdWASD])$/.test(e.key) && (e.target as HTMLElement).tagName !== 'INPUT') setMoved(true); };
    const p = () => setMoved(true);
    addEventListener('keydown', f);
    addEventListener('mana-pad', p);
    return () => { removeEventListener('keydown', f); removeEventListener('mana-pad', p); };
  }, [active]);

  useEffect(() => { const f = () => setTalked(true); addEventListener('mana-talk', f); return () => removeEventListener('mana-talk', f); }, []);
  useEffect(() => { const f = () => setGuided(true); addEventListener('mana-goto', f); return () => removeEventListener('mana-goto', f); }, []); // 생활 탭의 "걸어가기"

  // 현재 단계의 완료 조건을 확인해 다음 단계로
  useEffect(() => {
    if (!active) return;
    const ok = [
      moved || pickSeq !== basePick.current,
      open && tab === 'trade',
      Object.keys(holdings).length > 0,
      open && tab === 'calendar',
      open && tab === 'news',
      open && tab === 'assets',
      talked,
      guided,
    ][tutStep];
    if (!ok) return;
    const nxt = tutStep + 1;
    setTutStep(nxt);
    if (nxt >= TUT_LEN) onComplete();
  }, [active, tutStep, moved, talked, guided, pickSeq, open, tab, holdings, market.day, setTutStep, onComplete]);

  // 눌러야 할 곳을 반짝이게 한다 (버튼이 다시 만들어져도 유지되도록 주기적으로 다시 건다)
  useEffect(() => {
    const target = active ? STEPS[tutStep]?.target : undefined;
    const apply = () => {
      document.querySelectorAll('[data-hl]').forEach((el) => el.removeAttribute('data-hl'));
      if (target) document.querySelectorAll(target).forEach((el) => el.setAttribute('data-hl', '1'));
    };
    apply();
    const t = setInterval(apply, 400);
    return () => { clearInterval(t); document.querySelectorAll('[data-hl]').forEach((el) => el.removeAttribute('data-hl')); };
  }, [active, tutStep]);

  if (!active) return null;
  const s = STEPS[tutStep];
  return (
    <div className="panel dlg absolute inset-x-2.5 z-[38] bg-white px-3 py-2" style={{ top }}>
      <div className="flex items-center gap-2">
        <span className="flex gap-1">{STEPS.map((_, i) => <i key={i} className={`h-2 w-2 border border-ink ${i < tutStep ? 'bg-ink' : i === tutStep ? 'bg-pink' : 'bg-white'}`} />)}</span>
        <b className="font-display text-[13px]">{s.title}</b>
        <button onClick={() => setTutStep(TUT_LEN)} className="hit ml-auto border-0 bg-transparent px-1 py-2 text-[11px] font-bold text-ink2 underline">튜토리얼 건너뛰기</button>
      </div>
      <p className="m-0 mt-1 text-[12.5px] font-bold leading-snug text-ink">{touch && s.touchText ? s.touchText : s.text}</p>
    </div>
  );
}
