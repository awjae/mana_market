import { useGame } from '../store';
import { Title } from './bits';

/** 칭호: 분기 목표를 채워 얻은 칭호 중 하나를 골라 쓴다(순위표의 내 줄에 보인다). 마나 보상은 없다 */
export function TitlePicker() {
  const titles = useGame((g) => g.titles), active = useGame((g) => g.activeTitle), setTitle = useGame((g) => g.setTitle);
  return (
    <div className="space-y-2">
      <Title ko="칭호" />
      <div className="panel-flat bg-white p-3">
        {titles.length === 0 ? <p className="m-0 text-[12.5px] font-bold text-ink2">달력의 분기 목표를 채우면 칭호를 받아요.</p> : (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="쓸 칭호">
            <button role="radio" aria-checked={active === null} onClick={() => setTitle(null)} className={`panel-flat h-8 px-2.5 text-[12px] font-black ${active === null ? 'bg-ink text-white' : 'bg-white text-ink2'}`}>없음</button>
            {titles.map((t) => <button key={t} role="radio" aria-checked={active === t} onClick={() => setTitle(t)} className={`panel-flat h-8 px-2.5 text-[12px] font-black ${active === t ? 'bg-ink text-white' : 'bg-white text-ink2'}`}>{t}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}
