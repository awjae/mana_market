import { useState } from 'react';
import { liteOn, setLite } from '../lite';
import { Title } from './bits';

export function LiteToggle() {
  const [on, setOn] = useState(liteOn);
  return (
    <div className="mt-4 space-y-2.5">
      <Title ko="그래픽" />
      <button onClick={() => { setLite(!on); setOn(!on); }} role="switch" aria-checked={on} className="flex w-full items-center justify-between border-2 border-ink bg-white px-3 py-2.5 text-left shadow-[2px_2px_0_#35244a]">
        <span><b className="block text-[13.5px]">간단한 그래픽</b><span className="text-[11.5px] font-bold text-ink2">꽃잎·비·눈·구름 같은 움직이는 장식을 꺼요. 배경이 깜빡이거나 끊기면 켜 보세요</span></span>
        <span className={`ml-3 flex h-6 w-11 shrink-0 items-center border-2 border-ink px-0.5 ${on ? 'justify-end bg-gold' : 'justify-start bg-white'}`}><i className="h-4 w-4 border-2 border-ink bg-white" /></span>
      </button>
    </div>
  );
}
