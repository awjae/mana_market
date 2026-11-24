import { useSyncExternalStore } from 'react';
import { onSoundChange, setSound, soundOn } from '../audio';
import { Title } from './bits';

/** 효과음 켜기/끄기(기본 꺼짐). 거래·업적·히로인 대화·새 아침에 8비트 소리가 난다 */
export function SoundToggle() {
  const on = useSyncExternalStore(onSoundChange, soundOn);
  return (
    <div className="mt-4 space-y-2.5">
      <Title ko="소리" />
      <button onClick={() => setSound(!on)} role="switch" aria-checked={on} className="flex w-full items-center justify-between border-2 border-ink bg-white px-3 py-2.5 text-left shadow-[2px_2px_0_#35244a]">
        <span><b className="block text-[13.5px]">효과음</b><span className="text-[11.5px] font-bold text-ink2">거래, 업적, 히로인 대화, 새 아침에 8비트 소리가 나요</span></span>
        <span className={`ml-3 flex h-6 w-11 shrink-0 items-center border-2 border-ink px-0.5 ${on ? 'justify-end bg-gold' : 'justify-start bg-white'}`}><i className="h-4 w-4 border-2 border-ink bg-white" /></span>
      </button>
    </div>
  );
}
