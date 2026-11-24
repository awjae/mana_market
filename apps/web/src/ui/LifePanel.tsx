import { ACTIVITY_CAP, CREATURES, DIVE_CAP, FISH_CAP, FOUND_ITEMS, SELL_CAP } from '../activity';
import { MONSTER_NAMES } from '../dungeon';
import { fmt0 } from '../format';
import { placesFor, gotoTile } from '../places';
import { HEROINES } from '../scene/heroines';
import { nextUnlock } from '../scene/townFx';
import { adventurerRank, adventurerScore } from '../adventurer';
import { useState, type ReactNode } from 'react';
import { prosperity } from '../scene/townFx';
import { MOUNT_NAMES } from '../scene/pixelMounts';
import { useGame } from '../store';
import { dailyGoals, nextDailyTitle } from '../daily';
import { EVENT_TASKS, eventOf, eventTitle } from '../events';
import { freshWeek, nextWeeklyTitle, weekOf, weeklyGoals } from '../weekly';
import { STARTER, STARTER_TITLE, STARTER_TOTAL } from '../starter';
import { DailyPanel } from './DailyPanel';
import { LovePanel } from './LovePanel';
import { MountPanel } from './MountPanel';
import { ShopPanel } from './ShopPanel';
import { TownPanel } from './TownPanel';
import { Title } from './bits';
import { useActivity } from './activityStore';

const FOLD_KEY = 'mana-fold';
const foldState = (): Record<string, boolean> => { try { return JSON.parse(localStorage.getItem(FOLD_KEY) ?? '{}'); } catch { return {}; } };
/** 접고 펴는 구역: 열림 여부는 이 기기에 기억한다(기본은 접힘) */
function Fold({ id, title, summary, children, defaultOpen = false }: { id: string; title: string; summary?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(() => foldState()[id] ?? defaultOpen);
  const toggle = () => { const v = !open; setOpen(v); try { localStorage.setItem(FOLD_KEY, JSON.stringify({ ...foldState(), [id]: v })); } catch { /* 저장 못 해도 이번 접속엔 적용 */ } };
  return (
    <section>
      <button onClick={toggle} aria-expanded={open} className="panel-flat flex min-h-11 w-full items-center justify-between gap-2 bg-white px-3 py-2 text-left">
        <span className="min-w-0"><b className="font-display text-[16px]">{title}</b>{summary && <span className="ml-2 text-[11.5px] font-bold text-ink2">{summary}</span>}</span>
        <span className="shrink-0 text-[12px] font-black text-ink2">{open ? '접기' : '펼치기'}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </section>
  );
}
const FISH_TOTAL = 16 + CREATURES.length + FOUND_ITEMS.length;
/** 생활 탭: 오늘 할 수 있는 일을 한눈에 보고 그 자리로 걸어가는 허브(압박 없이 사실만). 아래에 활동·마을·상점·인연·탈것 패널이 이어진다 */
export function LifePanel() {
  const g = useGame(), open = useActivity((s) => s.openIt);
  const day = g.market.day, a = g.act.day === day ? g.act : { sold: 0, fished: 0, casts: 0, dove: 0, tries: 0 };
  const places = placesFor(g), at = (id: string) => places.find((p) => p.id === id)!;
  const heard = Object.values(HEROINES).find((h) => (g.bond[h.id]?.pts ?? 0) < 8 && g.bond[h.id]?.day !== day);
  const dateReady = g.love && g.love.stage < 6 && g.love.day !== day;
  const gathers = g.gather.day === day ? g.gather.n ?? 0 : 0, nu = nextUnlock(g.spent);
  const rows: { key: string; label: string; status: string; act: string; run: () => void }[] = [
    ...(heard ? [{ key: 'story', label: `${heard.name}의 이야기`, status: `${g.bond[heard.id]?.pts ?? 0}/8번째 이야기까지 들었어요`, act: '걸어가기', run: () => gotoTile(heard.home) }] : []),
    ...(dateReady ? [{ key: 'date', label: `${HEROINES[g.love!.id].name}와(과) 데이트`, status: '오늘 함께 시간을 보낼 수 있어요', act: '열기', run: () => open({ kind: 'love' }) }] : []),
    { key: 'gather', label: '채집', status: `오늘 ${gathers}번 주웠어요`, act: '걸어가기', run: () => gotoTile(at('gather0').tile) },
    { key: 'fish', label: '낚시', status: `오늘 ${a.casts}번, ${fmt0(a.fished)}/${FISH_CAP} 마나`, act: '걸어가기', run: () => gotoTile(at('fish').tile) },
    { key: 'dive', label: '던전', status: `오늘 ${a.tries}번, ${fmt0(a.dove)}/${DIVE_CAP} 마나`, act: '걸어가기', run: () => gotoTile(at('dive').tile) },
    { key: 'sell', label: '재료 넘기기', status: `오늘 ${fmt0(a.sold)}/${SELL_CAP} 마나`, act: '아래 보기', run: () => document.getElementById('life-daily')?.scrollIntoView({ behavior: 'smooth' }) },
  ];
  const ev = eventOf(day), evDone = !!ev && g.events.includes(ev.key), evHave = { fish: a.casts, gather: g.gather.day === day ? g.gather.n ?? 0 : 0, dive: a.tries };
  const wk = weekOf(day), wstat = g.weekly.stat.k === wk ? g.weekly.stat : freshWeek(wk, g.dlog.seen.length), wgoals = weeklyGoals(wk, g.dlog.seen.length >= MONSTER_NAMES.length), nwt = nextWeeklyTitle(g.weekly.n);
  const score = adventurerScore(g), rank = adventurerRank(score), fishN = Object.keys(g.fishLog).length, goals = dailyGoals(day), nt = nextDailyTitle(g.daily.n), doneToday = g.daily.last === day;
  return (
    <div className="space-y-5">
      {g.starter < STARTER.length ? (() => { const t = STARTER[g.starter], pl = t.place ? places.find((p) => p.id === t.place) : null; return (
        <div className="panel-flat space-y-1.5 bg-[#e8f8ff] p-3">
          <div className="flex items-center justify-between"><b className="font-display text-[15px]">입문 과제 {g.starter + 1}/{STARTER.length}</b><span className="text-[11.5px] font-bold text-ink2">완료하면 {t.reward} 마나</span></div>
          <p className="m-0 text-[14px] font-black">{t.text}</p>
          <p className="m-0 text-[12px] font-bold text-ink2">{t.hint}</p>
          <div className="flex gap-2">{pl && <button onClick={() => gotoTile(pl.tile)} className="panel-flat h-9 flex-1 bg-white text-[12.5px] font-black">걸어가기</button>}<p className="m-0 flex-1 self-center text-right text-[11px] font-bold text-ink2">모두 마치면 "{STARTER_TITLE}" 칭호와 합쳐 {STARTER_TOTAL.toLocaleString('ko-KR')} 마나(한 번만)</p></div>
        </div>); })() : null}
      {ev && (
        <div className="panel-flat space-y-1.5 bg-[#fff0f6] p-3">
          <div className="flex items-center justify-between"><b className="font-display text-[15px]">오늘은 {ev.name}</b><span className="text-[11.5px] font-bold text-ink2">{evDone ? '칭호를 받았어요' : '이벤트 과제'}</span></div>
          {EVENT_TASKS.map((t) => <div key={t.id} className="flex items-center gap-2 text-[12.5px] font-black"><span className={`flex h-4 w-4 items-center justify-center border-2 border-ink text-[10px] ${evHave[t.id] >= t.need ? 'bg-gold' : 'bg-white'}`} aria-hidden>{evHave[t.id] >= t.need ? '✓' : ''}</span><span className="flex-1">{t.text}</span><span className="font-num text-[11.5px] text-ink2">{Math.min(t.need, evHave[t.id])}/{t.need}</span></div>)}
          <p className="m-0 text-[11.5px] font-bold leading-snug text-ink2">오늘은 낚시에 {ev.name} 잉어가, 던전 3층에 축제 도깨비가 나와요. 세 과제를 모두 마치면 "{eventTitle(ev)}" 칭호를 받아요(마나 보상은 없어요).</p>
        </div>
      )}
      <div className="space-y-2">
        <div className="panel-flat flex items-center justify-between gap-2 bg-[#fff6d8] px-3 py-2"><span className="min-w-0 text-[13px] font-black">모험가 등급 <b className="font-display text-[16px]">{rank.name}</b></span><span className="shrink-0 text-right text-[11px] font-bold text-ink2">{rank.next ? `${rank.next[1]}까지 ${rank.next[0] - score}점` : '가장 높은 등급이에요'}</span></div>
        <Title ko="오늘의 모험 목표" right={<span className="text-[11.5px] font-bold text-ink2">함께한 날 {g.daily.n}일</span>} />
        <div className="panel-flat bg-white p-3">
          {goals.map((x) => { const have = Math.min(x.target, x.have(g)); return (
            <div key={x.id} className="ruled flex items-center gap-2 py-1.5"><span className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink text-[12px] font-black ${have >= x.target ? 'bg-gold' : 'bg-white'}`} aria-hidden>{have >= x.target ? '✓' : ''}</span><span className="min-w-0 flex-1 text-[13px] font-black">{x.text}</span><span className="font-num text-[12px] font-bold text-ink2">{have}/{x.target}</span></div>); })}
          <p className="m-0 mt-2 text-[11.5px] font-bold leading-snug text-ink2">{doneToday ? '오늘의 목표를 모두 채웠어요.' : '세 가지를 모두 채우면 함께한 날이 하루 늘어요.'} 마나 보상은 없고, 날수가 쌓이면 칭호를 받아요{nt ? `(${nt[1]}까지 ${nt[0] - g.daily.n}일)` : ''}. 안 채워도 잃는 것은 없어요.</p>
        </div>
      </div>
      <div className="space-y-2">
        <Title ko="주간 도전" right={<span className="text-[11.5px] font-bold text-ink2">마친 주 {g.weekly.n}번</span>} />
        <div className="panel-flat bg-white p-3">
          {wgoals.map((x) => { const have = Math.min(x.target, x.have(wstat, g.dlog.seen.length)); return (
            <div key={x.id} className="ruled flex items-center gap-2 py-1.5"><span className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink text-[12px] font-black ${have >= x.target ? 'bg-gold' : 'bg-white'}`} aria-hidden>{have >= x.target ? '✓' : ''}</span><span className="min-w-0 flex-1 text-[13px] font-black">{x.text}</span><span className="font-num text-[12px] font-bold text-ink2">{have}/{x.target}</span></div>); })}
          <p className="m-0 mt-2 text-[11.5px] font-bold leading-snug text-ink2">{g.weekly.last === wk ? '이번 주 도전을 모두 마쳤어요.' : '이번 주(6일) 안에 세 가지를 모두 채워요.'} 마나 보상은 없고 마친 주가 쌓이면 칭호를 받아요{nwt ? `(${nwt[1]}까지 ${nwt[0] - g.weekly.n}번)` : ''}.</p>
        </div>
      </div>
      <div className="space-y-2">
        <Title ko="오늘의 생활" right={<span className="text-[11.5px] font-bold text-ink2">활동 수입 {fmt0(a.sold + a.fished + a.dove)}/{ACTIVITY_CAP} 마나</span>} />
        <div className="panel-flat bg-white p-3">
          {rows.map((r) => (
            <div key={r.key} className="ruled flex items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1 leading-tight"><div className="text-[13px] font-black">{r.label}</div><div className="text-[11.5px] font-bold text-ink2">{r.status}</div></div>
              <button onClick={r.run} className="panel-flat h-9 min-w-[88px] shrink-0 bg-[#ffe3ee] px-2 text-[12px] font-black">{r.act}</button>
            </div>
          ))}
          <p className="m-0 mt-2 text-[11.5px] font-bold leading-snug text-ink2">모험 수첩: 낚시 도감 {fishN}/{FISH_TOTAL}, 몬스터 도감 {g.dlog.seen.length}/{MONSTER_NAMES.length}, 가진 소품 {g.ownedProps.length}개. <button onClick={() => open({ kind: 'codex' })} className="ml-1 border-2 border-ink bg-white px-1.5 py-0.5 text-[11px] font-black">도감 보기</button> 걸어가기를 누르면 길을 찾아 그 자리로 가고, 도착하면 E키(터치는 버튼)로 시작해요.{nu ? ` ${nu.name}은(는) 쓴 마나가 ${fmt0(nu.need - g.spent)} 마나 더 쌓이면 열려요.` : ''}</p>
        </div>
      </div>
      <div className="space-y-2">
        <Title ko="가볼 곳" />
        <div className="flex flex-wrap gap-1.5">
          {places.filter((p) => p.kind !== 'heroine').map((p) => <button key={p.id} onClick={() => gotoTile(p.tile)} className="panel-flat h-9 bg-white px-2.5 text-[12px] font-black">{p.name}<span className="ml-1 text-[10.5px] font-bold text-ink2">{p.desc}</span></button>)}
          {Object.values(HEROINES).map((h) => <button key={h.id} onClick={() => gotoTile(h.home)} className="panel-flat h-9 bg-[#fff0f6] px-2.5 text-[12px] font-black">♥ {h.name}{g.love?.id === h.id ? (g.love.stage >= 6 ? ' (결혼한 사이)' : ' (인연)') : ''}</button>)}
        </div>
      </div>
      <div id="life-daily"><Fold id="daily" title="활동과 작업대" summary={`번 마나 ${fmt0(g.earned)}`} defaultOpen><DailyPanel bare /></Fold></div>
      <Fold id="town" title="마을 가꾸기" summary={`번영도 ${prosperity(g.town)}%`}><TownPanel bare /></Fold>
      <Fold id="shop" title="내 상점" summary={g.shop ? `${g.shop.name} ${g.shop.lv}/4단계` : '아직 없어요'}><ShopPanel bare /></Fold>
      <Fold id="love" title="인연" summary={g.love ? HEROINES[g.love.id].name : '아직 정하지 않았어요'}><LovePanel bare /></Fold>
      <Fold id="mount" title="탈것" summary={g.mount ? MOUNT_NAMES[g.mount] : g.mounts.length ? '내려서 걷는 중' : '없어요'}><MountPanel bare /></Fold>
    </div>
  );
}
