import { useMemo } from 'react';
import { QUEST_REWARD, questsFor } from '../quests';
import { useGame } from '../store';
import { Title } from './bits';

/** 오늘의 의뢰: 시세·소식을 읽고 사실을 확인하는 퀴즈. 한 번만 답할 수 있고 정답이면 소액의 마나(매매 권유와 무관) */
export function Quests() {
  const market = useGame((g) => g.market), quest = useGame((g) => g.quest), answer = useGame((g) => g.answerQuest), server = useGame((g) => g.server);
  const qs = useMemo(() => questsFor(market), [market]);
  const ans = quest.day === market.day ? quest.ans : {};
  const done = qs.filter((q) => q.id in ans).length;
  return (
    <div className="space-y-2">
      <Title ko="오늘의 의뢰" right={<span className="text-[11.5px] font-bold text-ink2">{done}/{qs.length}</span>} />
      <div className="panel-flat space-y-3 bg-white p-3">
        {qs.map((q) => {
          const got = ans[q.id];
          return (
            <div key={q.id}>
              <div className="mb-1.5 text-[13px] font-black">{q.text}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {q.options.map((o, i) => {
                  const picked = got === i, right = got !== undefined && i === q.answer;
                  return <button key={o} disabled={got !== undefined} onClick={() => answer(q.id, i)}
                    className={`panel-flat min-h-9 px-1.5 py-1 text-[12px] font-black ${right ? 'bg-[#dff7e0] text-[#1d7a2e]' : picked ? 'bg-[#ffe3e6] text-up' : 'bg-white'} disabled:cursor-default`}>{o}{right ? ' ✓' : picked ? ' ✗' : ''}</button>;
                })}
              </div>
            </div>
          );
        })}
        <p className="m-0 text-[11px] font-bold text-ink2">{server ? '서버 모드에서는 보상이 없어요.' : `정답 하나에 ${QUEST_REWARD} 마나를 받아요.`} 답은 오늘의 시세와 소식에서 확인할 수 있어요.</p>
      </div>
    </div>
  );
}
