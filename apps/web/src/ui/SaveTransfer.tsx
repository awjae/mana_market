import { useState } from 'react';
import { Title } from './bits';

const KEY = 'mana-market-v1';
/** UTF-8 안전한 base64 */
const enc = (s: string) => btoa(unescape(encodeURIComponent(s)));
const dec = (s: string) => decodeURIComponent(escape(atob(s.trim())));

/** 저장 옮기기: 서버가 없는 1단계라 저장이 이 브라우저에만 있다. 코드를 복사해 두면 기기를 바꿔도 이어서 할 수 있다 */
export function SaveTransfer() {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [armed, setArmed] = useState(false);

  const copy = async () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return setMsg({ ok: false, text: '저장된 데이터가 아직 없어요.' });
      await navigator.clipboard.writeText(enc(raw));
      setMsg({ ok: true, text: '저장 코드를 복사했어요. 안전한 곳에 붙여 넣어 두세요.' });
    } catch { setMsg({ ok: false, text: '복사하지 못했어요. 브라우저의 클립보드 권한을 확인해 주세요.' }); }
  };
  const apply = () => {
    try {
      const j = JSON.parse(dec(code));
      const st = j?.state;
      if (!st || typeof st.cash !== 'number' || typeof st.holdings !== 'object' || typeof j.version !== 'number') throw new Error('형식');
      if (!armed) { setArmed(true); setMsg({ ok: false, text: '지금 진행 중인 저장이 덮어씌워져요. 한 번 더 누르면 불러와요.' }); setTimeout(() => setArmed(false), 4000); return; }
      localStorage.setItem(KEY, JSON.stringify(j));
      location.reload();
    } catch { setArmed(false); setMsg({ ok: false, text: '올바른 저장 코드가 아니에요. 복사한 코드를 그대로 붙여 넣어 주세요.' }); }
  };

  return (
    <div className="mt-4 space-y-2.5">
      <Title ko="저장 옮기기" />
      <p className="m-0 text-[12px] font-bold leading-relaxed text-ink2">저장은 이 기기의 브라우저에만 있어요. 코드를 복사해 두면 다른 기기에서도 이어서 할 수 있어요.</p>
      <button onClick={copy} className="btn3d h-10 w-full text-[13px]" style={{ ['--c' as string]: '#fff', color: '#35244a', textShadow: 'none' } as React.CSSProperties}>저장 코드 복사</button>
      <textarea value={code} onChange={(e) => { setCode(e.target.value); setMsg(null); setArmed(false); }} placeholder="복사해 둔 저장 코드를 여기에 붙여 넣으세요" rows={3}
        className="w-full resize-none border-2 border-ink bg-white p-2 font-sans text-[11px] font-bold text-ink placeholder:text-ink/40" />
      <button onClick={apply} disabled={!code.trim()} className="btn3d h-10 w-full text-[13px] disabled:opacity-40" style={{ ['--c' as string]: armed ? '#ff8fb8' : '#ffc13b', color: '#35244a', textShadow: 'none' } as React.CSSProperties}>{armed ? '정말 불러오기' : '저장 불러오기'}</button>
      {msg && <p className={`m-0 text-[12px] font-black ${msg.ok ? 'text-[#2f8a4a]' : 'text-[#c2386c]'}`} role="status">{msg.text}</p>}
    </div>
  );
}
