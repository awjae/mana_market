import { useState } from 'react';
import { easyOn, setEasy } from './activityStore';
import { Title } from './bits';

export function EasyToggle() {
  const [on, setOn] = useState(easyOn);
  return (
    <div className="mt-4 space-y-2.5">
      <Title ko="미니게임" />
      <button onClick={() => { setEasy(!on); setOn(!on); }} role="switch" aria-checked={on} className="flex w-full items-center justify-between border-2 border-ink bg-white px-3 py-2.5 text-left shadow-[2px_2px_0_#35244a]">
        <span><b className="block text-[13.5px]">쉬운 모드</b><span className="text-[11.5px] font-bold text-ink2">낚시·채집 미니게임의 맞추는 칸이 넓어지고 반짝임이 오래 보여요</span></span>
        <span className={`ml-3 flex h-6 w-11 shrink-0 items-center border-2 border-ink px-0.5 ${on ? 'justify-end bg-gold' : 'justify-start bg-white'}`}><i className="h-4 w-4 border-2 border-ink bg-white" /></span>
      </button>
    </div>
  );
}
