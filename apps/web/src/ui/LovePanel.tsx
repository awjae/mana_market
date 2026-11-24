import { STAGE, stepName } from '../love';
import { HEROINES } from '../scene/heroines';
import { useGame } from '../store';
import { Title } from './bits';
import { useActivity } from './activityStore';

/** 자산 탭의 "인연" 카드: 평생의 인연 진행 상황을 한 줄로 보이고 인연 화면을 연다 */
export function LovePanel({ bare }: { bare?: boolean } = {}) {
  const { love, bond, server } = useGame(), open = useActivity((s) => s.openIt);
  const ready = Object.values(HEROINES).some((h) => (bond[h.id]?.pts ?? 0) >= 8);
  const h = love ? HEROINES[love.id] : null;
  return (
    <div className="space-y-2">
      {!bare && <Title ko="인연" />}
      <div className="panel-flat flex items-center gap-3 bg-white p-3">
        <p className="m-0 min-w-0 flex-1 text-[12.5px] font-bold">
          {!love ? (ready ? '여덟 번째 이야기까지 들은 사람이 있어요. 평생 한 명과의 인연을 정할 수 있어요.' : '히로인과 여덟 번 이야기를 나누면 평생의 인연을 정할 수 있어요.')
            : love.stage >= STAGE.married ? `${h!.name}와(과) 함께 살고 있어요.` : `${h!.name}와(과) 다음은 ${stepName(love.stage)}이에요.`}
        </p>
        <button disabled={!!server || (!love && !ready)} onClick={() => open({ kind: 'love' })} className="panel-flat h-9 shrink-0 bg-[#ffe3ee] px-3 text-[12.5px] font-black disabled:opacity-40">{love ? '열기' : '정하기'}</button>
      </div>
    </div>
  );
}
