import { HOLIDAYS, FESTIVAL_DAYS, isDividendDay, START_YEAR, dateLong, fantasyDate, msUntilNextDay, phaseName } from '@mana/engine';
import { useState } from 'react';
import { fmt0 } from '../format';
import { allTitle, goalsFor, quarterLabel, quarterOf } from '../goals';
import { monthLabel, monthSummary, type MonthSummary } from '../recap';
import { useGame } from '../store';
import { Title } from './bits';
import { useNow } from './hooks';
import { WEATHER_NAME, weatherKind } from '../calendar';

const two = (n: number) => String(n).padStart(2, '0');

/** 달력: 오늘의 판타지 날짜, 현실과 나란히 흐르는 시계, 다음 종소리까지, 한 달 달력 */
export function CalendarPanel() {
  const { market, skipDays, fastForward, resetClock } = useGame();
  const now = useNow(1000);
  const d = fantasyDate(market.day);
  const real = new Date(now);
  const hour = real.getHours() + real.getMinutes() / 60;
  const left = msUntilNextDay(now), hh = Math.floor(left / 3600000), mm = Math.floor((left % 3600000) / 60000), ss = Math.floor((left % 60000) / 1000);
  const sandbox = skipDays > 0;
  const [pick, setPick] = useState<number | null>(null);
  const g = useGame();
  const keys = Object.keys(g.worthLog).map(Number).sort((a, b) => b - a);
  const recaps = keys.map((k) => monthSummary({ worthLog: g.worthLog, trades: g.trades, achv: g.achv, newsLog: g.market.newsLog }, k)).filter((x): x is MonthSummary => !!x).slice(0, 3);

  // 이번 달의 첫날(게임 날짜 번호)
  const monthStart = d.festival ? market.day - (d.dayOfYear - 360) - 360 : market.day - d.day + 1;
  const disclosureDays = new Set(market.newsLog.filter((n) => n.kind === 'disclosure').map((n) => n.day));
  const holidayOf = (m: number, day: number) => HOLIDAYS.find(([hm, hd]) => hm === m && hd === day);
  const month = d.festival ? 12 : d.month;
  const monthName = fantasyDate(monthStart).monthName;
  const yearStart = market.day - d.dayOfYear;

  return (
    <div className="space-y-3.5">
      <div className="panel p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="leading-tight">
            <div className="text-[12px] font-bold text-ink2">건국력 {d.year}년 ({d.year - START_YEAR + 1}번째 해)</div>
            <div className="font-display text-[26px] leading-tight">{d.festival ?? `${d.monthName} ${d.day}일`}</div>
            <div className="text-[13px] font-black text-ink2">{d.festival ? '연말 축제 기간' : `${d.weekdayName}, ${d.season}`}, 오늘 날씨 {WEATHER_NAME[weatherKind(market.day)]}</div>
          </div>
          <div className="text-right leading-tight">
            <div className="text-[11px] font-bold text-ink2">지금 이 세계는</div>
            <div className="font-display text-[20px]">{phaseName(hour)}</div>
            <div className="font-num text-[15px] tabular-nums">{real.getHours() < 12 ? '오전' : '오후'} {two(real.getHours() % 12 || 12)}:{two(real.getMinutes())}</div>
          </div>
        </div>
        {(d.holiday || d.festival) && (
          <div className="mt-2.5 border-2 border-dashed border-pink bg-[#fff0f6] px-3 py-1.5 text-[12.5px] font-bold">
            <b className="text-[#c2386c]">{d.holiday?.name ?? d.festival}</b> {d.holiday?.note ?? '한 해를 보내고 새해를 맞는 축제 기간이에요.'}
          </div>
        )}
        <div className="mt-2.5 flex items-center justify-between border-t-2 border-dashed border-ink/25 pt-2 text-[12px] font-bold text-ink2">
          <span>다음 종소리(시세 변동)까지</span>
          <b className="font-num text-[16px] tabular-nums text-ink">{sandbox ? '연습 모드' : `${two(hh)}:${two(mm)}:${two(ss)}`}</b>
        </div>
      </div>

      <Title ko={`${monthName}`} right={<span className="text-[11px] font-bold text-ink2">여섯 원소의 날이 한 주예요</span>} />
      <div className="panel-flat p-2">
        <div className="mb-1 grid grid-cols-6 gap-1 text-center text-[10.5px] font-black text-ink2">
          {['해', '달', '불', '물', '바람', '땅'].map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: 30 }, (_, i) => {
            const idx = monthStart + i, day = i + 1, today = idx === market.day, past = idx < market.day;
            let wk: ReturnType<typeof weatherKind> | undefined;
            const hol = holidayOf(month, day), disc = disclosureDays.has(idx), pay = isDividendDay(idx);
            return (
              <div key={i} title={hol?.[2]} onClick={() => idx <= market.day && setPick(pick === idx ? null : idx)} className={`${idx <= market.day ? 'cursor-pointer ' : ''}${pick === idx ? 'outline outline-2 outline-pink ' : ''}relative flex h-[38px] flex-col items-center justify-center border-2 text-[13px] font-black ${today ? 'border-ink bg-ink text-white shadow-[2px_2px_0_#ff8fb8]' : past ? 'border-transparent bg-ink/[.06] text-ink/45' : 'border-ink/20 bg-white text-ink'}`}>
                {day}
                {hol && <span className={`absolute right-0.5 top-0 text-[10px] ${today ? 'text-gold' : 'text-[#d99a00]'}`}>★</span>}
                {pay && <i className="absolute left-[3px] top-[3px] h-[9px] w-[9px] rounded-full border-[1.5px] border-ink bg-gold" title="배당일" />}
                {idx <= market.day && (wk = weatherKind(idx)) && (wk === 'rain' || wk === 'snow') && <span className={`absolute bottom-0 right-[3px] text-[8px] font-black ${today ? 'text-[#9fd0ff]' : wk === 'rain' ? 'text-[#2d6cff]' : 'text-[#6aa6c8]'}`} title={WEATHER_NAME[wk]}>{wk === 'rain' ? '비' : '눈'}</span>}
                {disc && <i className="absolute bottom-[3px] h-[5px] w-[5px] rounded-full bg-seal" />}
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 px-1 text-[10.5px] font-bold text-ink2"><span><b className="text-[#d99a00]">★</b> 기념일</span><span><b className="text-[#2d6cff]">비</b>·<b className="text-[#6aa6c8]">눈</b> 지난 날씨</span><span><i className="mr-1 inline-block h-[6px] w-[6px] rounded-full bg-seal align-middle" />공시가 붙은 날</span><span><i className="mr-1 inline-block h-[9px] w-[9px] rounded-full border-[1.5px] border-ink bg-gold align-middle" />배당일</span></div>
      </div>

      {pick !== null && (() => {
        const ix = market.index, c = pick > 0 ? ix[pick] / ix[pick - 1] - 1 : 0;
        const items = pick === market.day ? market.news : market.newsLog.filter((n) => n.day === pick);
        return (
          <div className="panel-flat bg-white p-3">
            <div className="flex items-baseline justify-between"><b className="text-[14px]">{dateLong(pick)}</b><button onClick={() => setPick(null)} className="border-0 bg-transparent text-[12px] font-black text-ink2 underline">닫기</button></div>
            <div className="mt-1 text-[12.5px] font-bold text-ink2">날씨 {WEATHER_NAME[weatherKind(pick)]}, 왕국 종합지수 <b className="font-num text-ink">{ix[pick]?.toFixed(2)}</b> <b className={c >= 0 ? 'text-up' : 'text-down'}>{c >= 0 ? '▲' : '▼'}{Math.abs(c * 100).toFixed(2)}%</b></div>
            {items.length ? <ul className="m-0 mt-1.5 list-none space-y-1 p-0">{items.map((n, k) => <li key={k} className="text-[12.5px] font-bold"><b className={n.kind === 'disclosure' ? 'text-seal' : 'text-[#7a52c8]'}>{n.kind === 'disclosure' ? '공시' : '소문'}</b> {n.text}</li>)}</ul> : <p className="m-0 mt-1.5 text-[12px] font-bold text-ink2">이날은 눈에 띄는 소식이 없었어요.</p>}
          </div>
        );
      })()}

      <div className="space-y-2">
        <Title ko="이번 분기 목표" right={<span className="text-[11px] font-bold text-ink2">{quarterLabel(quarterOf(market.day))}</span>} />
        <div className="panel-flat space-y-2 bg-white p-3">
          {goalsFor(g, quarterOf(market.day)).map((x) => (
            <div key={x.id}>
              <div className="flex items-baseline justify-between text-[12.5px] font-black"><span>{x.done ? '✓ ' : ''}{x.text}</span><span className="font-num tabular-nums text-ink2">{Math.min(x.have, x.need)}/{x.need}</span></div>
              <div className="mt-1 h-[7px] border-2 border-ink bg-[#efeaff]"><div className="h-full bg-[#ffc13b]" style={{ width: `${Math.min(100, (x.have / x.need) * 100)}%` }} /></div>
              <div className="mt-0.5 text-[11px] font-bold text-ink2">달성하면 칭호 "{x.title}"</div>
            </div>
          ))}
          <p className="m-0 text-[11px] font-bold text-ink2">마나 보상은 없고, 칭호만 받아요. 셋을 모두 채우면 "{allTitle(quarterOf(market.day))}" 칭호도 받아요.</p>
        </div>
      </div>

      {recaps.length > 0 && (
        <div className="space-y-2">
          <Title ko="지난달 결산" right={<span className="text-[11px] font-bold text-ink2">숫자만 보여 줘요</span>} />
          {recaps.map((r) => (
            <div key={r.key} className="panel-flat bg-white p-3">
              <div className="text-[13px] font-black">{monthLabel(r.key)}</div>
              <div className="ruled mt-1 text-[12.5px] font-bold"><div className="flex justify-between py-1"><span>총자산</span><span className="font-num tabular-nums">{fmt0(r.start)} → {fmt0(r.end)} ({r.end - r.start >= 0 ? '+' : ''}{fmt0(r.end - r.start)})</span></div>
                <div className="flex justify-between py-1"><span>거래</span><span className="font-num tabular-nums">{r.trades}번</span></div>
                <div className="flex justify-between py-1"><span>받은 배당금</span><span className="font-num tabular-nums">{fmt0(r.dividends)}</span></div>
                <div className="flex justify-between py-1"><span>얻은 업적</span><span className="font-num tabular-nums">{r.achievements}개</span></div></div>
              {r.headline && <p className="m-0 mt-1.5 text-[12px] font-bold text-ink2">그달의 공시 하나: {r.headline}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="panel-flat p-2">
        <div className="mb-1 px-1 text-[11px] font-bold text-ink2">연말 축제 5일</div>
        <div className="grid grid-cols-5 gap-1">
          {FESTIVAL_DAYS.map((f, i) => {
            const idx = yearStart + 360 + i;
            return <div key={f} className={`flex h-[34px] items-center justify-center border-2 px-0.5 text-center text-[10px] font-black leading-tight ${idx === market.day ? 'border-ink bg-ink text-white' : idx < market.day ? 'border-transparent bg-ink/[.06] text-ink/45' : 'border-ink/20 bg-white'}`}>{f}</div>;
          })}
        </div>
      </div>

      <p className="m-0 px-1 text-[12px] font-bold leading-relaxed text-ink2">
        이 세계의 하루는 현실의 하루와 나란히 흘러요. 왕국의 자정(한국 시각 0시)에 종이 울리면 새 소식이 붙고 새 하루의 시세가 시작돼요(시세는 낮 동안 15분마다 움직여요). 오늘은 <b className="text-ink">{dateLong(market.day)}</b>예요.
      </p>

      <div className="border-2 border-dashed border-ink/30 p-2.5">
        <div className="mb-1.5 text-[11px] font-black text-ink2">연습용 시간 조절</div>
        {sandbox && <p className="m-0 mb-2 text-[12px] font-bold text-[#a8322a]">현실보다 {skipDays}일 앞서가고 있어요. 다른 플레이어와 시장이 달라요.</p>}
        <div className="flex gap-2">
          <button onClick={() => fastForward(1)} className="panel-flat h-9 flex-1 bg-white text-[12.5px] font-black active:bg-[#ffe3ee]">하루 앞당기기</button>
          {sandbox && <button onClick={resetClock} className="panel-flat h-9 flex-1 bg-white text-[12.5px] font-black active:bg-[#ffe3ee]">현실 시간으로 돌아가기</button>}
        </div>
      </div>
    </div>
  );
}
