import { dayLabel } from '../calendar';
import { ACHIEVEMENTS, useGame } from '../store';
import { Title } from './bits';

/** 업적: 달성하면 도장이 찍히고 날짜가 남는다. 못 한 건 흐리게 조건만 보여 준다 */
export function Achievements() {
  const achv = useGame((g) => g.achv);
  const n = Object.keys(achv).length;
  return (
    <div className="mt-4 space-y-3">
      <Title ko="업적" right={<span className="text-[11.5px] font-black text-ink2">{n} / {ACHIEVEMENTS.length}</span>} />
      <ul className="ruled m-0 list-none p-0">
        {ACHIEVEMENTS.map((a) => {
          const day = achv[a.id], got = day !== undefined;
          return (
            <li key={a.id} className={`flex items-center gap-3 px-0.5 py-2 ${got ? '' : 'opacity-55'}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink font-display text-[11px] leading-none ${got ? 'bg-gold shadow-[2px_2px_0_#35244a]' : 'bg-white text-ink/40'}`}>{got ? '달성' : '잠김'}</span>
              <div className="min-w-0 flex-1 leading-tight"><div className="text-[13.5px] font-black">{a.name}</div><div className="text-[11.5px] font-bold text-ink2">{a.desc}</div></div>
              {got && <span className="shrink-0 text-[11px] font-bold text-ink2">{dayLabel(day)}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
