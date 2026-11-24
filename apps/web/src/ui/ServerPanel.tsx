import { useState } from 'react';
import { DEFAULT_SERVER } from '../serverClient';
import { validNick } from '../social';
import { useGame } from '../store';
import { Title } from './bits';

/** 서버 연결(2단계 미리보기): 연결하면 다른 플레이어와 같은 순위표에 올라간다. 서버 계정은 새 지갑 1만 마나로 시작하고, 끊으면 원래 지갑으로 돌아온다 */
export function ServerPanel() {
  const { server, nick, connectServer, disconnectServer, importLocalToServer, localBackup, recoveryCode, recoverServer } = useGame();
  const [rcNick, setRcNick] = useState(''), [rcCode, setRcCode] = useState('');
  const rec = async () => { setBusy(true); setMsg(await recoverServer(url.trim(), rcNick, rcCode)); setBusy(false); };
  const [url, setUrl] = useState(DEFAULT_SERVER), [msg, setMsg] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const imp = async () => { setBusy(true); const e = await importLocalToServer(); setMsg(e ?? '내 지갑을 서버로 가져왔어요.'); setBusy(false); };
  const go = async () => { setBusy(true); setMsg(await connectServer(url.trim())); setBusy(false); };
  return (
    <div className="space-y-2">
      <Title ko="온라인 순위 (미리보기)" />
      <div className="panel-flat space-y-2 bg-white p-3 text-[12.5px] font-bold">
        {server ? (
          <>
            <p className="m-0">서버에 연결돼 있어요. 지금은 <b>{nick}</b> 이름으로 다른 플레이어와 순위를 겨뤄요. 거래는 서버가 확인해요.</p>
            {recoveryCode && <div className="border-2 border-dashed border-gold bg-[#fff8e0] p-2"><div className="text-[12px] font-black">복구 코드 (지금 한 번만 보여요. 꼭 적어 두세요)</div><div className="mt-1 select-all break-all font-num text-[15px] tracking-wider">{recoveryCode}</div><div className="mt-1 text-[11px] text-ink2">기기를 바꾸거나 토큰을 잃으면 닉네임과 이 코드로 계정을 되찾아요.</div></div>}
            {localBackup && <button disabled={busy} onClick={imp} className="panel-flat h-9 w-full bg-[#fff8e0] text-[13px] font-black disabled:opacity-40">내 지갑 가져오기 (새 계정에서 한 번)</button>}
            <button onClick={disconnectServer} className="panel-flat h-9 w-full bg-white text-[13px] font-black active:bg-[#ffe3ee]">연결 끊고 내 지갑으로 돌아가기</button>
          </>
        ) : (
          <>
            <p className="m-0 text-ink2">연결하면 새 지갑(1만 마나)으로 서버 계정을 만들어요. 끊으면 지금 지갑으로 돌아와요. 닉네임이 필요해요.</p>
            <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.stopPropagation()} aria-label="서버 주소" className="panel-flat h-9 w-full bg-[#fffdf5] px-2 text-[13px] outline-none" />
            <button disabled={busy || !validNick(nick)} onClick={go} className="btn3d h-10 w-full text-[14px] disabled:opacity-40" style={{ ['--c' as string]: '#ffc13b', color: '#35244a', textShadow: 'none' }}>{validNick(nick) ? (busy ? '연결 중…' : '서버에 연결') : '먼저 닉네임을 지어 주세요'}</button>
            <div className="border-t-2 border-dashed border-ink/25 pt-2">
              <div className="mb-1 text-[12px] font-black text-ink2">이미 계정이 있다면 (복구 코드로 되찾기)</div>
              <div className="flex gap-1.5"><input value={rcNick} onChange={(e) => setRcNick(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="닉네임" aria-label="복구할 닉네임" className="panel-flat h-9 w-[84px] bg-[#fffdf5] px-2 text-[13px] outline-none" /><input value={rcCode} onChange={(e) => setRcCode(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="복구 코드" aria-label="복구 코드" className="panel-flat h-9 min-w-0 flex-1 bg-[#fffdf5] px-2 text-[13px] outline-none" /><button disabled={busy || !rcNick || !rcCode} onClick={rec} className="panel-flat h-9 shrink-0 bg-white px-2.5 text-[13px] font-black disabled:opacity-40">복구</button></div>
            </div>
          </>
        )}
        {msg && <p className="m-0 text-ink2" role="status">{msg}</p>}
      </div>
    </div>
  );
}
