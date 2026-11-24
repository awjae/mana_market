import { useGame } from '../store';
import { validNick } from '../social';

/** 닉네임 입력(2~8자). 순위표에 이 이름으로 올라간다 */
export function NickField() {
  const nick = useGame((g) => g.nick), setNick = useGame((g) => g.setNick);
  return (
    <label className="panel-flat block bg-white p-3">
      <span className="text-[12px] font-black text-ink2">닉네임 (2~8자, 순위표에 이 이름으로 올라가요)</span>
      <input value={nick} maxLength={8} placeholder="이름을 지어 주세요" onChange={(e) => setNick(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
        className="mt-1.5 block h-10 w-full border-2 border-ink bg-[#fffdf5] px-2.5 text-[16px] font-black text-ink outline-none focus:shadow-[2px_2px_0_#ff8fb8]" />
      {nick && !validNick(nick) && <span className="mt-1 block text-[11px] font-bold text-[#e8432e]">두 글자 이상이어야 해요.</span>}
    </label>
  );
}
