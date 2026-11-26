import { dayLabel, weatherKind } from '../calendar';
import { pct } from '../format';
import type { Paper } from '../reasons';

const SKY = { clear: '맑음', cloud: '흐림', rain: '비', snow: '눈' };
const won = (n: number) => Math.round(n).toLocaleString('ko-KR');

/** 조간 한 장: 새 아침·복귀 때 닫기 전까지 남는 지면. 값이 없는 칸은 싣지 않는다 */
export function MorningPaper({ paper, day, away, onNews, onClose }: { paper: Paper; day: number; away: number; onNews: () => void; onClose: () => void }) {
  const d = Math.round(paper.delta);
  const notes = [
    ...paper.alerts, paper.filled ? `예약 주문 ${paper.filled}건이 체결됐어요` : '', paper.dividend > 0 ? `배당금 ${won(paper.dividend)} 마나가 들어왔어요` : '',
  ].filter(Boolean);
  return (
    <div className="conv absolute inset-0 z-[66] flex items-center justify-center bg-ink/55 p-4" role="dialog" aria-modal="true" aria-label="조간">
      <div className="panel-flat flex max-h-full w-full flex-col overflow-hidden bg-paper">
        <div className="border-b-4 border-double border-ink px-4 pb-1.5 pt-3 text-center">
          <h2 className="m-0 font-display text-[24px] leading-none">마나 마켓 조간</h2>
          <p className="m-0 mt-1 text-[11.5px] font-bold text-ink2">{dayLabel(day)}, {SKY[weatherKind(day)]}{away > 1 ? `. ${away}일 만이에요` : ''}</p>
        </div>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
          <div>
            <p className="m-0 font-num text-[22px] leading-tight">{won(paper.worth)} 마나</p>
            <p className="m-0 text-[12.5px] font-black">{d === 0 ? '지난번과 같아요' : `지난번보다 ${won(Math.abs(d))} ${d > 0 ? '늘었어요' : '줄었어요'}`} <span className="font-bold text-ink2">(시작 자금 대비 {pct(paper.pnl)})</span></p>
          </div>
          {notes.length > 0 && <ul className="m-0 list-none space-y-0.5 border-y-2 border-ink px-0 py-1.5">{notes.map((n) => <li key={n} className="text-[12.5px] font-black">{n}</li>)}</ul>}
          {paper.news.length > 0 ? (
            <ul className="m-0 list-none space-y-2 p-0">
              {paper.news.map((n, i) => n.kind === 'disclosure'
                ? <li key={i} className="notice px-3 py-2"><span className="font-sans text-[10.5px] font-black text-[#b3261e]">공시 </span><span className="text-[13px] font-black leading-snug">{n.text}</span></li>
                : <li key={i} className="whisper mb-2 px-3 py-1.5"><span className="font-sans text-[10.5px] font-black text-ink2">소문 </span><span className="text-[16px] font-bold leading-tight">{n.text}</span></li>)}
              {paper.more > 0 && <li className="text-[11.5px] font-bold text-ink2">소식 탭에 {paper.more}건이 더 있어요</li>}
            </ul>
          ) : <p className="m-0 text-[12.5px] font-bold text-ink2">새 소식은 없어요.</p>}
          {[paper.big, paper.below, paper.reason].filter(Boolean).map((t) => <p key={t} className="m-0 text-[12px] font-bold">{t}</p>)}
        </div>
        <div className="flex gap-2 border-t-2 border-ink p-2.5">
          <button onClick={onNews} className="panel-flat h-11 flex-1 bg-[#ffe3ee] text-[14px] font-black">소식 읽기</button>
          <button onClick={onClose} className="panel-flat h-11 flex-1 bg-white text-[14px] font-black">닫기</button>
        </div>
      </div>
    </div>
  );
}
