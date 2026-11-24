import type { CSSProperties } from 'react';
import { useGame } from '../store';
import { Icon, type IconName } from './bits';
import { NAV_H, type Tab } from './layout';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'trade', label: '거래', icon: 'trade' }, { id: 'news', label: '소식', icon: 'news' }, { id: 'life', label: '생활', icon: 'life' },
  { id: 'assets', label: '자산', icon: 'assets' }, { id: 'market', label: '시세', icon: 'market' }, { id: 'profile', label: '내 정보', icon: 'me' },
];

export function BottomNav({ tab, open, onTab }: { tab: Tab; open: boolean; onTab: (t: Tab) => void }) {
  const news = useGame((s) => s.market.news.length);
  const item = (t: (typeof TABS)[number], i: number) => {
    const on = open && tab === t.id;
    return (
      <button key={t.id} data-tut={`tab-${t.id}`} onClick={() => onTab(t.id)} title={`${t.label} (${i + 1})`} className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 border-0 bg-transparent pt-1 ${on ? 'text-ink' : 'text-ink2'}`}>
        <span className={`flex h-8 w-11 items-center justify-center rounded-full border-2 transition-colors ${on ? 'border-ink bg-pink' : 'border-transparent'}`}><Icon name={t.icon} size={21} /></span>
        <span className="text-[10.5px] font-black">{t.label}</span>
        {t.id === 'news' && news > 0 && <span className="absolute right-[24%] top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-ink bg-gold px-1 text-[10px] font-black leading-none text-ink">{news}</span>}
      </button>
    );
  };
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex items-end bg-paper px-1 pb-1.5" style={{ height: NAV_H, borderTop: '3px solid #35244a' }}>
      {item(TABS[0], 0)}{item(TABS[1], 1)}{item(TABS[2], 2)}
      <div className="relative h-full w-[64px] shrink-0">
        <button onClick={() => onTab('calendar')} aria-label="달력" data-tut="fab" title="달력 (C)" className="btn3d absolute -top-5 left-1/2 flex h-[58px] w-[58px] -translate-x-1/2 items-center justify-center !rounded-full"
          style={{ ['--c' as string]: open && tab === 'calendar' ? '#ff8fb8' : '#ffc13b' } as CSSProperties}>
          <svg width="30" height="30" viewBox="0 0 34 34" fill="none" stroke="#35244a" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
            <rect x="5" y="8" width="24" height="21" rx="2.5" fill="#fff" /><path d="M5 14h24M11 5v6M23 5v6" /><path d="M12 22.5l3.2 3 6-6.4" />
          </svg>
        </button>
        <span className="absolute inset-x-0 bottom-1 text-center text-[10.5px] font-black text-ink">달력</span>
      </div>
      {item(TABS[3], 3)}{item(TABS[4], 4)}{item(TABS[5], 5)}
    </div>
  );
}
