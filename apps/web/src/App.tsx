import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage } from './components/Stage';
import { sfx } from './audio';
import { ranking } from './social';
import { ServerPanel } from './ui/ServerPanel';
import { belowStartLine, bigMoveLine, nextReason } from './reasons';
import { TitlePicker } from './ui/TitlePicker';
import { ActivityHost } from './ui/ActivityHost';
import { BankPanel } from './ui/BankPanel';
import { LifePanel } from './ui/LifePanel';
import { Ranking } from './ui/Ranking';
import { dayLabel, weatherAt, weatherKind } from './calendar';
import { pct } from './format';
import { Sky, Weather } from './scene/Backdrop';
import { skyPhase } from './calendar';
import type { Mood } from './scene/Hero';
import { IsoWorld } from './scene/IsoWorld';
import { npcTalk } from './scene/npcTalk';
import type { Npc } from './scene/npcs';
import { isTouch } from './scene/input';
import { ACHIEVEMENTS, START_CASH, netWorth, netWorthAt, useGame } from './store';
import { AssetsPanel } from './ui/AssetsPanel';
import { BottomNav } from './ui/BottomNav';
import { CalendarPanel } from './ui/CalendarPanel';
import { Conversation } from './ui/Conversation';
import { Creator } from './ui/Creator';
import { Dialogue, type Line } from './ui/Dialogue';
import { Hud } from './ui/Hud';
import { useNow } from './ui/hooks';
import { CHIP_H, HALF_H, HUD_H, NAV_H, type Size, type Tab } from './ui/layout';
import { MarketPanel } from './ui/MarketPanel';
import { About } from './ui/About';
import { Achievements } from './ui/Achievements';
import { SaveTransfer } from './ui/SaveTransfer';
import { EasyToggle } from './ui/EasyToggle';
import { LiteToggle } from './ui/LiteToggle';
import { SoundToggle } from './ui/SoundToggle';
import { LookEditor } from './ui/LookEditor';
import { NewsPanel } from './ui/NewsPanel';
import { Sheet } from './ui/Sheet';
import { Story } from './ui/Story';
import { Tutorial } from './ui/Tutorial';
import { TradePanel } from './ui/TradePanel';
import { VirtualPad } from './ui/VirtualPad';
import { Watchlist } from './ui/Watchlist';

const TABS: Tab[] = ['trade', 'news', 'life', 'assets', 'market', 'profile'];

/** 반짝이(きらきら) 효과: 체결·새 아침에 주인공 주변에서 터진다 */
function Burst({ k, x, y }: { k: number; x: number; y: number }) {
  if (!k) return null;
  return (
    <div key={k} className="pointer-events-none absolute" style={{ left: x, top: y }}>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2, r = 46 + (i % 3) * 22;
        return <span key={i} className="spark" style={{ ['--dx' as string]: `${Math.cos(a) * r}px`, ['--dy' as string]: `${Math.sin(a) * r * 0.8}px`, background: ['#ffd25a', '#ff9bb8', '#fff', '#9ad8ff'][i % 4], animationDelay: `${(i % 4) * 40}ms` }} />;
      })}
    </div>
  );
}

export default function App() {
  const { market, pickSeq, granted, grantCapital, looked, setLooked } = useGame();
  const [tab, setTab] = useState<Tab>('trade');
  const [size, setSize] = useState<Size>('closed');
  const [line, setLine] = useState<Line | null>(null);
  const [burst, setBurst] = useState(0);
  const touch = isTouch();
  const now = useNow(30000);
  const hour = new Date(now).getHours() + new Date(now).getMinutes() / 60; // 하늘은 현실의 내 시각을 따른다
  // 스토리: 처음(마나 0)이거나 "처음부터 다시 시작"하면 보여 준다. 지원금을 받은 뒤에도 끝 대사까지 이어져야 해서 granted와 분리
  const [storyOpen, setStoryOpen] = useState(() => !useGame.getState().granted);
  useEffect(() => { if (!granted) setStoryOpen(true); }, [granted]);
  const ph = skyPhase(hour);
  const glow = Math.min(1, ph.night + ph.dusk * 0.75 + ph.dawn * 0.3); // 가로등·창문의 불빛 세기
  // 업적: 거래·보유·호감·시간이 바뀔 때마다 확인하고, 새로 달성하면 아리아가 알려 준다
  const [achSeal, setAchSeal] = useState<{ k: number; name: string; label?: string } | null>(null);
  useEffect(() => { if (!achSeal) return; const t = setTimeout(() => setAchSeal(null), 3200); return () => clearTimeout(t); }, [achSeal]);
  const watch = useGame((g) => `${g.trades.length}|${Object.keys(g.holdings).join()}|${JSON.stringify(g.bond)}|${g.market.day}|${Math.round(g.cash)}|${Object.keys(g.fishLog).length}|${g.dlog.seen.length}|${g.rod}${g.gear}|${g.ownedProps.length}|${g.shop?.lv ?? 0}|${g.love?.stage ?? 0}|${g.mounts.length}|${JSON.stringify(g.town)}|${g.act.casts}${g.act.tries}${g.act.sold}|${g.gather.n ?? 0}|${Math.round(g.earned)}|${JSON.stringify(g.mats)}|${g.questCorrect}|${g.orders.length}|${g.weekly.stat.best}${g.weekly.stat.casts}${g.weekly.stat.gathers}${g.weekly.stat.tries}|${g.dlog.seen.length}`);
  useEffect(() => {
    if (storyOpen) return;
    const titles = useGame.getState().claimTitles();
    if (titles.length) { setAchSeal({ k: Date.now() + 1, name: titles[0], label: '칭호 획득' }); say(`칭호 "${titles[0]}"을(를) 얻었어! 프로필에서 바꿔 쓸 수 있어.`, 'happy', true); }
    const sdone = useGame.getState().checkStarter();
    if (sdone.length) { sfx.achieve(); setAchSeal({ k: Date.now() + 3, name: sdone[sdone.length - 1], label: '입문 과제 완료' }); }
    if (useGame.getState().checkWeekly()) { setAchSeal({ k: Date.now() + 4, name: `주간 도전 ${useGame.getState().weekly.n}번째`, label: '주간 도전 달성' }); sfx.achieve(); }
    const evName = useGame.getState().checkEvent();
    if (evName) { setAchSeal({ k: Date.now() + 5, name: `${evName}의 손님`, label: '이벤트 칭호' }); sfx.achieve(); }
    if (useGame.getState().checkDaily()) { const n = useGame.getState().daily.n; setAchSeal({ k: Date.now() + 2, name: `오늘의 모험 ${n}일째`, label: '목표 달성' }); sfx.achieve(); }
    const fresh = useGame.getState().checkAchievements();
    if (fresh.length) { sfx.achieve(); const a = ACHIEVEMENTS.find((x) => x.id === fresh[0])!; setAchSeal({ k: Date.now(), name: a.name }); setLine({ id: Date.now(), text: `업적 달성! "${a.name}"${fresh.length > 1 ? ` 외 ${fresh.length - 1}개` : ''} 프로필에서 확인해 봐!`, mood: 'happy' }); setBurst(Date.now()); }
  }, [watch, storyOpen]);
  const wk = weatherKind(market.day), mood = weatherAt(market.day); // 하늘은 지수와 무관: 날짜로 정해진 한국식 날씨
  const say = useCallback((text: string, m: Mood = 'normal', sparkle = false) => { setLine({ id: Date.now(), text, mood: m }); if (sparkle) setBurst(Date.now()); }, []);

  /** 며칠이 흘렀을 때(새 아침/자리를 비운 사이)의 안내: 자산 변화와 새 소식 */
  const report = useCallback((fromDay: number, worthBefore: number, lead: string) => {
    const g = useGame.getState();
    const d = netWorth(g) - worthBefore;
    const fresh = g.market.newsLog.filter((n) => n.day > fromDay);
    const div = g.trades.filter((t) => t.side === 'div' && t.day > fromDay).reduce((a, t) => a + t.price * t.qty, 0);
    const filled = g.trades.filter((t) => t.lim && t.day > fromDay).length;
    const alerts = g.fired.filter((f) => f.day > fromDay).map((f) => `${f.id}가 ${Math.round(f.limit).toLocaleString('ko-KR')}에 ${f.above ? '닿았어' : '내려왔어'}.`).slice(0, 2).join(' ');
    const reason = nextReason(g), big = bigMoveLine(g), below = belowStartLine({ trades: g.trades, market: g.market, worth: netWorth(g), spent: g.spent - g.earned, start: START_CASH });
    const disc = fresh.some((n) => n.kind === 'disclosure');
    const move = Math.abs(d) < 1 ? '자산은 그대로야.' : d > 0 ? `자산이 ${Math.round(d).toLocaleString('ko-KR')} 마나 늘었어!` : `자산이 ${Math.abs(Math.round(d)).toLocaleString('ko-KR')} 마나 줄었어…`;
    const sky = { clear: '맑은 하늘이야.', cloud: '하늘이 흐려.', rain: '비가 오고 있어.', snow: '눈이 내리고 있어!' }[weatherKind(g.market.day)];
    say(`${lead} ${sky} ${move}${alerts ? ` 알림: ${alerts}` : ''}${filled ? ` 예약 주문 ${filled}건이 체결됐어!` : ''}${div > 0 ? ` 배당금 ${Math.round(div).toLocaleString('ko-KR')} 마나도 들어왔어!` : ''} ${fresh.length ? `새 소식이 ${fresh.length}건 도착했어${disc ? ' — 공시도 있어!' : '.'}` : '오늘은 조용하네.'} ${big ? `${big} ` : ''}${below ? `${below} ` : ''}${reason ? `${reason} ` : ''}(시작 자금 대비 ${pct(netWorth(g) / START_CASH - 1)})`, disc ? 'wow' : d < -1 ? 'worried' : d > 1 ? 'happy' : 'normal', d > 1);
    g.setLastSeen(g.market.day);
  }, [say]);
  // 월간 결산: 달이 바뀐 뒤 처음 접속하면 지난달 총자산을 기록하고 알려 준다
  const dayNow = useGame((g) => g.market.day);
  useEffect(() => { if (storyOpen) return; if (useGame.getState().claimRelief()) say('왕실에서 구호 지원 3,000 마나가 도착했어. 한 달에 한 번, 총자산이 3,000 아래일 때만 받을 수 있어.', 'happy'); useGame.getState().touchVisit(); const prev = useGame.getState().logWorth(); if (prev) say('새 달이 시작됐어. 지난달 결산은 달력에서 볼 수 있어. 숫자만 적어 뒀어.'); }, [dayNow, storyOpen, say]);
  // 서버 모드: 접속하고 30초마다 서버 상태(정산 포함)를 받아 온다
  useEffect(() => { const f = () => void useGame.getState().syncFromServer(); f(); const t = setInterval(f, 30000); return () => clearInterval(t); }, []);
  // 순위가 바뀌면 알려 준다(전날의 순위와 비교). 처음 한 번은 기준만 잡는다
  const rankRef = useRef(0);
  useEffect(() => {
    const g = useGame.getState();
    if (!g.granted || !g.trades.length) return;
    const r = ranking(g.market, { nick: g.nick, worth: netWorth(g) }).findIndex((x) => x.me) + 1;
    const prev = rankRef.current;
    rankRef.current = r;
    if (!prev || r === prev) return;
    const t = setTimeout(() => say(`상인 순위가 ${prev}위에서 ${r}위로 ${r < prev ? '올랐어!' : '내려갔어…'}`, r < prev ? 'happy' : 'worried'), 7000); // 새 아침 요약 뒤에
    return () => clearTimeout(t);
  }, [market.day, say]);

  // 접속했을 때: 자리를 비운 동안의 배당을 정산하고 지난 날들을 요약한다 (스토리 전이면 건너뜀)
  useEffect(() => {
    useGame.getState().settleDividends();
    const t = setTimeout(() => {
      const g = useGame.getState();
      if (!g.granted) return;
      const away = g.market.day - g.lastSeenDay;
      if (away > 0) report(g.lastSeenDay, netWorthAt(g, g.lastSeenDay), `${away}일 만에 돌아왔구나! 그사이 ${dayLabel(g.market.day)}이(가) 됐어.`);
      else say('다시 왔구나! 오늘의 소식부터 확인해 볼까?', 'happy');
    }, 700);
    return () => clearTimeout(t);
  }, [report, say]);

  // 현실 시간이 흐른다: 왕국의 자정이 지나면 시장이 하루 진행되고 새 아침을 알린다 (탭이 다시 보일 때도 확인)
  useEffect(() => {
    const check = () => {
      const g = useGame.getState();
      if (!g.granted) return;
      const before = netWorth(g), day0 = g.market.day;
      const n = g.syncToNow();
      if (n > 0) { sfx.morning(); report(day0, before, `${dayLabel(useGame.getState().market.day)}, 새 아침이 밝았어.`); }
    };
    const t = setInterval(check, 15000);
    const vis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [report]);

  // 건물/칩/목록에서 종목을 고르면 거래 탭을 연다
  const lastSeq = useRef(pickSeq);
  useEffect(() => {
    if (pickSeq === lastSeq.current) return;
    lastSeq.current = pickSeq;
    say(`${useGame.getState().selected} 길드로 가볼게!`);
    setTab('trade');
    setSize((s) => (s === 'closed' ? 'half' : s));
  }, [pickSeq, say]);

  const onTab = (t: Tab) => {
    if (size !== 'closed' && tab === t) setSize('closed');
    else { setTab(t); setSize((s) => (s === 'closed' ? 'half' : s)); }
  };

  /** 일반 NPC(주민·동물)는 머리 위 작은 말풍선으로 한마디만 한다. 히로인(주요 NPC)은 전체 대화(Conversation) */
  const [chat, setChat] = useState<{ id: string; text: string; at: number } | null>(null);
  const [convo, setConvo] = useState<string | null>(null);
  useEffect(() => { if (convo) { dispatchEvent(new Event('mana-talk')); sfx.talk(); } }, [convo]);
  useEffect(() => { if (!chat) return; const t = setTimeout(() => setChat(null), 4800); return () => clearTimeout(t); }, [chat]);
  const talkTo = useCallback((n: Npc) => {
    if (n.def.heroine) { setChat(null); setConvo(n.def.heroine); return; }
    setChat({ id: n.def.id, text: npcTalk(n, useGame.getState().market).text, at: Date.now() });
  }, []);

  const finishTutorial = () => say('연습은 여기까지! 이제부터는 내 마음대로 장사해 보자. 소식을 잘 읽는 게 비결이야. 히로인들은 하루에 한 번씩 새 이야기를 들려주니까 매일 들러 줘! 아래 "생활" 탭 맨 위의 입문 과제를 하나씩 해 보자. 낚시, 채집, 던전까지 할 일이 많아!', 'happy', true);

  // 키보드: Esc 시트 닫기, C 달력, 1~4 탭
  const keys = useRef({ size, tab, onTab });
  keys.current = { size, tab, onTab };
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement, typing = t.tagName === 'INPUT';
      if (e.key === 'Escape') { if (typing) (t as HTMLInputElement).blur(); setSize('closed'); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || !useGame.getState().granted || document.querySelector('.conv')) return;
      if (e.key === 'c' || e.key === 'C' || e.key === 'ㅊ') keys.current.onTab('calendar');
      if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P' || e.key === 'ㅔ') keys.current.onTab('profile');
      const i = '123456'.indexOf(e.key);
      if (i >= 0 && e.key.length === 1) keys.current.onTab(TABS[i]);
    };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, []);

  return (
    <Stage>
      {(h) => {
        const top = HUD_H + CHIP_H + 6;
        const heroY = top + (h - top - NAV_H) / 2 + 14;
        const fullH = Math.min(h - top - 10, 640), halfH = Math.min(HALF_H, fullH);
        const sheetPx = size === 'closed' ? 0 : size === 'half' ? halfH : fullH;
        const shift = Math.min(sheetPx, h - NAV_H - top) * 0.42;
        return (
          <>
            <IsoWorld
              W={430} H={h} heroY={heroY} shift={shift} glow={glow} onTalk={talkTo} chat={chat}
              sky={<Sky mood={mood} hour={hour} />} weather={<Weather mood={mood} kind={wk} />}
              overlay={<Burst k={burst} x={215} y={heroY - 40} />}
            />
            {touch && granted && looked && !storyOpen && size === 'closed' && <VirtualPad lift={line ? 150 : 0} />}
            <Hud onFlag={() => onTab('calendar')} onProfile={() => onTab('profile')} />
            {!storyOpen && looked && <Tutorial top={top + 6} size={size} tab={tab} onComplete={finishTutorial} />}
            <Watchlist top={HUD_H + 2} />
            {achSeal && <div key={achSeal.k} className="ach-seal" role="status"><small>{achSeal.label ?? '업적 달성'}</small><b>{achSeal.name}</b></div>}
            <Dialogue line={line} bottom={NAV_H + sheetPx + 8} onClose={() => setLine(null)} />
            <Sheet size={size} setSize={setSize} halfH={halfH} fullH={fullH}>
              {tab === 'trade' && <TradePanel onToast={(m, ok) => say(m, ok ? 'happy' : 'worried', !!ok)} />}
              {tab === 'news' && <NewsPanel />}
              {tab === 'life' && <LifePanel />}
              {tab === 'assets' && <><AssetsPanel /><div className="mt-5"><BankPanel /></div><div className="mt-5"><Ranking /></div></>}
              {tab === 'market' && <MarketPanel />}
              {tab === 'calendar' && <CalendarPanel />}
              {tab === 'profile' && <><LookEditor /><TitlePicker /><Achievements /><SoundToggle /><LiteToggle /><EasyToggle /><SaveTransfer />{import.meta.env.DEV && <ServerPanel />}<About /></>}
            </Sheet>
            <BottomNav tab={tab} open={size !== 'closed'} onTab={onTab} />
            {!looked && <Creator onDone={() => setLooked(true)} />}
            <ActivityHost />
            {convo && <Conversation id={convo} onClose={() => setConvo(null)} />}
            {storyOpen && looked && (
              <Story onGrant={grantCapital} onCoins={() => setBurst(Date.now())} onDone={() => { setStoryOpen(false); say('먼저 길드들을 둘러보자. 방향키로 걸어 다닐 수 있어!', 'normal'); }} />
            )}
          </>
        );
      }}
    </Stage>
  );
}
