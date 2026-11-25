import { useState } from 'react';
import { CLASSES, CLS_LIST, CLS_RES, SUB_NEED, grantChoices, grantNeed, grantReady, type Cls } from '../skills';
import { useGame } from '../store';
import { useActivity } from './activityStore';

/** 성당: 마나를 쓴 만큼(누적 지출) 직업을 받는다. 후보 셋 중 하나를 고르고, 받은 직업끼리는 언제든 바꾼다 */
export function TempleScreen() {
  const close = useActivity((s) => s.close), { dun, spent, grantCls, chooseCls, setSub } = useGame();
  const [pick, setPick] = useState<Cls | null>(null), [msg, setMsg] = useState('');
  const ready = grantReady(spent, dun.owned), need = grantNeed(dun.owned), choices = ready ? grantChoices(dun.seed, dun.owned) : [];
  const take = (c: Cls) => { if (pick !== c) { setPick(c); return; } setMsg(grantCls(c) ?? `${CLASSES[c].name}의 길을 받았어요`); setPick(null); };
  return (
    <div className="conv absolute inset-0 z-[65] flex flex-col overflow-y-auto" role="dialog" aria-modal="true" aria-label="성당" style={{ background: 'linear-gradient(#f3ecff, #dfe8ff)' }}>
      <div className="flex items-center justify-between px-4 pt-3"><h2 className="m-0 font-display text-[20px]">성당</h2><button onClick={close} className="panel-flat h-8 bg-white px-2.5 text-[12px] font-black">닫기</button></div>
      <div className="space-y-3 px-4 pb-6 pt-3">
        <p className="m-0 text-[12.5px] font-bold text-ink2">마을과 생활에 마나를 쓴 만큼 이곳에서 새 직업을 받아요. 후보는 셋이고 하나만 고를 수 있어요. 마나를 내는 것이 아니라 쓴 만큼 문이 열리는 거예요.</p>
        {ready ? (
          <div className="space-y-1.5"><p className="m-0 text-[13px] font-black">{dun.owned.length === 0 ? '첫 직업을 받을 수 있어요' : '새 직업을 받을 수 있어요'}. 하나를 골라요</p>
            {choices.map((c) => (
              <button key={c} onClick={() => take(c)} className={`panel-flat w-full px-3 py-2 text-left ${pick === c ? 'bg-[#ffd36b]' : 'bg-white'}`}>
                <b className="text-[14px]">{CLASSES[c].name}</b>{pick === c && <span className="ml-2 text-[11.5px] font-black text-[#b3261e]">한 번 더 누르면 받아요</span>}
                <span className="mt-0.5 block text-[11.5px] font-bold text-ink2">{CLASSES[c].desc}</span>
                <span className="block text-[11px] font-bold text-ink2"><b>{CLS_RES[c].name}</b>: {CLS_RES[c].rule}</span>
              </button>))}
          </div>
        ) : need !== null ? (
          <div className="panel-flat bg-white p-3"><p className="m-0 text-[13px] font-black">다음 직업까지 마나 {Math.max(0, need - spent).toLocaleString()} 더 쓰면 돼요</p>
            <p className="m-0 mt-0.5 text-[11.5px] font-bold text-ink2">지금까지 쓴 마나 {spent.toLocaleString()} / {need.toLocaleString()} (마을 가꾸기·소품·선물·장비·낚싯대 같은 영구 지출이 쌓여요)</p>
            <div className="mt-1.5 h-2 border-2 border-ink bg-white"><div className="h-full bg-[#58b8ff]" style={{ width: `${Math.min(100, (spent / need) * 100)}%` }} /></div></div>
        ) : <p className="m-0 text-[13px] font-black">모든 직업을 받았어요.</p>}
        {msg && <p className="m-0 text-[12px] font-black text-[#b3261e]" role="status">{msg}</p>}
        <div className="space-y-1.5"><p className="m-0 text-[13px] font-black">받은 직업 {dun.owned.length}/{CLS_LIST.length}</p>
          {dun.owned.length === 0 && <p className="m-0 text-[12px] font-bold text-ink2">아직 받은 직업이 없어요. 던전에 들어가려면 먼저 직업이 필요해요.</p>}
          {spent < SUB_NEED && <p className="m-0 text-[12px] font-black">부 직업은 쓴 마나가 {SUB_NEED.toLocaleString()}이 되면 켤 수 있어요 (지금 {spent.toLocaleString()})</p>}
          <p className="m-0 text-[11.5px] font-bold text-ink2">직업은 주 직업 하나와 부 직업 하나까지 동시에 켤 수 있어요. 주 직업은 고유 자원과 숙련을 쓰고, 부 직업은 스킬을 2칸까지 가져가요. 켜고 끄는 건 언제든 자유예요.</p>
          {dun.owned.map((c) => (
            <div key={c} className="panel-flat flex items-center gap-1.5 bg-white px-2 py-1.5">
              <b className="min-w-0 flex-1 text-[13px]">{CLASSES[c].name}{dun.cls === c ? ' (주)' : dun.sub === c ? ' (부)' : ''}</b>
              <button aria-pressed={dun.cls === c} onClick={() => setMsg(chooseCls(c) ?? '')} className={`panel-flat h-9 min-w-[74px] px-1.5 text-[12px] font-black ${dun.cls === c ? 'bg-[#ffd36b]' : 'bg-white'}`}>주 직업</button>
              <button aria-pressed={dun.sub === c} disabled={dun.cls === c || (spent < SUB_NEED && dun.sub !== c)} onClick={() => setMsg(setSub(dun.sub === c ? null : c) ?? '')} className={`panel-flat h-9 min-w-[74px] px-1.5 text-[12px] font-black disabled:opacity-40 ${dun.sub === c ? 'bg-[#bfe6ff]' : 'bg-white'}`}>{dun.sub === c ? '부 직업 끄기' : '부 직업 켜기'}</button>
            </div>))}
        </div>
      </div>
    </div>
  );
}
