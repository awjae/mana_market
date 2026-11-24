import { ACC_COLORS, BASE_PROPS, usableLooks, EYE_COLORS, HAIR_COLORS, CLOTHES_COLORS, SKINS } from '../scene/pixelHeroData';
import { useGame } from '../store';
import { validNick } from '../social';
import { LookEditor } from './LookEditor';

const pick = (n: number) => Math.floor(Math.random() * n);
const pickOf = <T,>(xs: T[]) => xs[pick(xs.length)];

/** 새 모험의 첫 화면: 내 모습을 정한다. 끝나면 스토리가 이어진다 */
export function Creator({ onDone }: { onDone: () => void }) {
  const setLook = useGame((g) => g.setLook), nick = useGame((g) => g.nick);
  const dice = () => setLook({
    skin: pick(SKINS.length), eyeShape: pickOf(usableLooks('eye', [])), eyeColor: pick(EYE_COLORS.length), hairShape: pickOf(usableLooks('hair', [])), hairColor: pick(HAIR_COLORS.length),
    clothesShape: pickOf(usableLooks('clothes', [])), clothesColor: pick(CLOTHES_COLORS.length), prop: pick(BASE_PROPS), propColor: pick(ACC_COLORS.length),
  });
  return (
    <div className="absolute inset-0 z-[70] flex flex-col bg-[#f7f5ff]" style={{ background: 'radial-gradient(circle, #e4dcff 1.2px, transparent 1.6px) 0 0 / 7px 7px, #f7f5ff' }}>
      <div className="px-5 pb-1 pt-6">
        <h1 className="head isolate m-0 text-[26px]">모습을 정해요</h1>
        <p className="m-0 mt-1.5 text-[13px] font-bold text-ink2">마을을 누빌 나의 모습이에요. 나중에 왼쪽 위 내 얼굴을 눌러 언제든 바꿀 수 있어요.</p>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-2"><LookEditor showTitle={false} big /></div>
      <div className="flex gap-2.5 border-t-2 border-ink bg-white px-4 py-3">
        <button onClick={dice} className="btn3d h-12 w-[104px] shrink-0 text-[14px]" style={{ ['--c' as string]: '#fff', color: '#35244a', textShadow: 'none' }}>무작위로</button>
        <button onClick={onDone} disabled={!validNick(nick)} className="btn3d h-12 flex-1 text-[16px] disabled:opacity-40" style={{ ['--c' as string]: '#ffc13b', color: '#35244a', textShadow: 'none' }}>{validNick(nick) ? '이 모습으로 시작' : '닉네임을 지어 주세요'}</button>
      </div>
    </div>
  );
}
