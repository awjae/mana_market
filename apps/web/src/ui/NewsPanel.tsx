import type { NewsItem } from '@mana/engine';
import { useState } from 'react';
import { dayLabel } from '../calendar';
import { change } from '../format';
import { useGame } from '../store';
import { Quests } from './Quests';
import { ChangeChip, Empty, Title, TickerBadge } from './bits';

const TONE = { good: ['호재', '#ffe3e7', '#d62f48'], bad: ['악재', '#e0ebff', '#2358d6'], mixed: ['엇갈림', '#ece8f4', '#6b5a82'] } as const;

/** 관련 길드 칩: 탭하면 그 길드로 걸어간다 */
function Guilds({ n, label }: { n: NewsItem; label: string }) {
  const { market, select } = useGame();
  const ids = [...new Set(n.targetStockIds)];
  const shown = n.scope === 'kingdom' && n.tone === 'mixed' ? ids : ids.slice(0, 4);
  if (!ids.length) return <div className="mt-2 font-sans text-[11px] font-bold text-ink2">특정 길드가 아니라 왕국 전체의 분위기에 관한 얘기예요.</div>; // 시장 전체 소식(국면 힌트)
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="font-sans text-[11px] font-bold text-ink2">{label}</span>
      {shown.map((id) => (
        <button key={id} onClick={() => select(id)} className="panel-flat flex items-center gap-1 py-0.5 pl-0.5 pr-1.5 font-sans active:bg-[#ffe3ee]">
          <TickerBadge id={id} size="sm" /><ChangeChip r={change(market.history[id])} />
        </button>
      ))}
      {ids.length > shown.length && <span className="font-sans text-[11px] text-ink2">외 {ids.length - shown.length}곳</span>}
    </div>
  );
}

/** 공시: 도장이 찍힌 인쇄 공문 */
function Notice({ n }: { n: NewsItem }) {
  const [label, bg, fg] = TONE[n.tone];
  return (
    <li className="notice relative py-3 pl-[62px] pr-3">
      <span className="seal absolute left-3 top-3">공시</span>
      <div className="mb-1 flex items-center gap-2 font-sans">
        <span className="chipx" style={{ background: bg, color: fg }}>{label}</span>
        <span className="text-[11px] font-bold text-ink2">{dayLabel(n.day)} 장 마감 후</span>
      </div>
      <p className="m-0 text-[14.5px] font-black leading-[1.6]">{n.text}</p>
      <Guilds n={n} label="관련 길드" />
      <p className="m-0 mt-1.5 font-sans text-[10.5px] font-bold text-ink2">확정된 사실이에요. 가격은 다음 날 시가부터 반영돼요.</p>
    </li>
  );
}

/** 소문: 누가 흘린 손글씨 속삭임 */
function Rumor({ n }: { n: NewsItem }) {
  return (
    <li className="whisper mb-3 px-4 py-3">
      <p className="m-0 text-[19px] font-bold leading-[1.35]">“{n.text}”</p>
      <Guilds n={n} label="이 길드 얘기래요" />
      <p className="m-0 mt-1.5 font-sans text-[10.5px] font-bold text-ink2">아직 확인된 게 없어요. 사실이 아닐 수도 있어요.</p>
    </li>
  );
}

export function NewsPanel() {
  const { market, holdings } = useGame();
  const [view, setView] = useState<'today' | 'past'>('today');
  const [f, setF] = useState<'all' | 'mine' | 'disc'>('all');
  const past = market.newsLog.filter((n) => n.day < market.day).slice(-20).reverse();
  const base = view === 'today' ? market.news : past;
  const list = base.filter((n) => f === 'disc' ? n.kind === 'disclosure' : f === 'mine' ? n.targetStockIds.some((id) => id in holdings) : true);
  return (
    <div className="space-y-4">
      <Title ko="마을 소식" right={<div className="seg"><button className={view === 'today' ? 'on' : ''} onClick={() => setView('today')}>오늘 {market.news.length}건</button><button className={view === 'past' ? 'on' : ''} onClick={() => setView('past')}>지난 소식</button></div>} />
      <div className="flex gap-1.5" role="group" aria-label="소식 거르기">
        {([['all', '전체'], ['mine', '내 보유 종목'], ['disc', '공시만']] as const).map(([k, t]) => <button key={k} onClick={() => setF(k)} className={`panel-flat h-7 px-2.5 text-[12px] font-black ${f === k ? 'bg-ink text-white' : 'bg-white text-ink2'}`}>{t}</button>)}
      </div>
      {list.length === 0 ? <div className="panel-flat"><Empty title={f === 'mine' ? '보유한 종목의 소식이 없어요' : view === 'today' ? '오늘은 조용해요' : '지난 소식이 없어요'} sub="왕국의 자정에 종이 울리면 새 소식이 붙어요." /></div>
        : <ul className="m-0 list-none space-y-3 p-0">{list.map((n, i) => (n.kind === 'disclosure' ? <Notice key={`${n.day}-${i}`} n={n} /> : <Rumor key={`${n.day}-${i}`} n={n} />))}</ul>}
      <Quests />
    </div>
  );
}
