import { LOVE, STAGE } from '../love';
import { DEFAULT_CONFIG as cfg } from '@mana/engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { weatherKind } from '../calendar';
import { change, pct } from '../format';
import { HEROINES } from '../scene/heroines';
import { PixelSprite } from '../scene/PixelHero';
import { PROP_NAMES, PROP_UNLOCK } from '../scene/pixelHeroData';
import { useGame } from '../store';
import { SECTOR_COLOR } from './bits';

const SKY_LINE: Record<string, string> = { clear: '오늘은 하늘이 맑네요.', cloud: '하늘이 흐리네요.', rain: '비가 오네요. 우산은 챙기셨어요?', snow: '눈이 와요! 길이 미끄러우니 조심하세요.' };

/** 오늘 그녀의 업종 소식을 사실만 정리해 들려준다(전망·권유는 하지 않는다) */
function briefing(id: string): string[] {
  const h = HEROINES[id], { market } = useGame.getState();
  const stock = cfg.stocks.find((s) => s.id === h.guild)!;
  const c = change(market.history[h.guild]);
  const out = [`${stock.name}의 시세는 어제보다 ${c === 0 ? '그대로예요' : `${pct(Math.abs(c)).replace('+', '')} ${c > 0 ? '올랐어요' : '내렸어요'}`}.`];
  const ids = cfg.stocks.filter((s) => s.sectorId === h.sector).map((s) => s.id);
  const news = [...market.news, ...market.newsLog.filter((n) => n.day >= market.day - 2)].filter((n) => n.targetStockIds.some((t) => ids.includes(t)) || n.scope === 'kingdom');
  const n = news[news.length - 1];
  out.push(n ? `${n.kind === 'disclosure' ? '공시' : '소문'}이 하나 있어요. "${n.text}". ${n.kind === 'disclosure' ? '공시는 확정된 사실이에요.' : '소문은 틀릴 수도 있으니 확인이 필요해요.'}` : '오늘은 이쪽 업종이 조용해요. 새 공시도 소문도 없어요.');
  return out;
}

/** 주요 NPC(히로인)와의 전체 화면 대화: 큰 초상화 + 이름·직함·호감도 + 탭해서 넘기는 이야기. 일러스트가 있으면 쓰고 없으면 도트 얼굴 */
export function Conversation({ id, onClose }: { id: string; onClose: () => void }) {
  const h = HEROINES[id];
  const select = useGame((g) => g.select);
  // 렌더에서는 읽기만 한다(대화 전 호감과 오늘 처음인지). 호감을 올리는 쓰기는 마운트 뒤 효과에서(렌더 중 다른 컴포넌트를 갱신하지 않게)
  const { lines, pts, fresh } = useMemo(() => {
    const { bond, market, nick, love } = useGame.getState();
    const b = bond[id] ?? { pts: 0, day: -1 }, fresh = b.day !== market.day;
    const pool = love?.id === id && love.stage >= STAGE.married ? LOVE[id].married : h.idle; // 결혼한 사이는 함께 사는 일상 대사
    const ch = (fresh && b.pts < h.story.length ? h.story[b.pts] : [pool[Math.floor(Math.random() * pool.length)]]).map((t) => t.replaceAll('아리아', nick || '아리아')); // 대사 속 이름은 내 닉네임으로
    const hello = !(fresh && b.pts < h.story.length) ? [SKY_LINE[weatherKind(market.day)]] : []; // 이야기가 없는 날은 날씨 인사로 시작
    return { lines: [...hello, ...ch, ...briefing(id)], pts: b.pts, fresh };
  }, [id]);
  useEffect(() => { useGame.getState().talkHeroine(id); }, [id]);
  const hearts = Math.min(4, useGame((g) => g.bond[id]?.pts ?? 0));
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [bad, setBad] = useState(false), [badHappy, setBadHappy] = useState(false); // 일러스트가 없으면 도트 전신, 기쁜 표정이 없으면 기본 표정
  const seen = useGame((g) => !!g.bond[id]?.cut);
  const finale = fresh && pts === h.story.length - 1; // 오늘이 마지막 이야기인 날
  const [cut, setCut] = useState(false);
  const [giftMsg, setGiftMsg] = useState<string | null>(null);
  const giftedToday = useGame((g) => g.bond[id]?.gift === g.market.day), cash = useGame((g) => g.cash), server = useGame((g) => g.server);
  const text = lines[Math.min(i, lines.length - 1)], last = i >= lines.length;
  const timer = useRef<number>(0);
  useEffect(() => {
    if (last) return;
    setN(0);
    timer.current = window.setInterval(() => setN((v) => { if (v + 1 >= text.length) clearInterval(timer.current); return Math.min(text.length, v + 1); }), 22);
    return () => clearInterval(timer.current);
  }, [i, text, last]);
  useEffect(() => { if (last && finale && !seen) { setCut(true); useGame.getState().markCut(id); } }, [last, finale, seen, id]);
  const done = last || n >= text.length;
  const next = () => { if (cut) { setCut(false); return; } if (last) return; if (!done) { clearInterval(timer.current); setN(text.length); } else setI(i + 1); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (cut) setCut(false); else onClose(); } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  });
  const col = SECTOR_COLOR[h.sector];
  const newHeart = fresh && pts < 4;
  const deep = Math.max(0, Math.min(4, (useGame.getState().bond[id]?.pts ?? 0) - 4)); // 5~8번째 이야기를 들을수록 금빛 ♥가 채워진다
  const gift = fresh && pts === 3 ? PROP_NAMES[Number(Object.entries(PROP_UNLOCK).find(([, who]) => who === id)?.[0])] : null; // 이야기를 끝까지 들은 날의 선물

  const happy = !badHappy && ((last && (!!gift || finale)) || cut); // 선물을 받는 날, 마지막 이야기, 완주 컷에서는 기쁜 표정(`{id}-happy.webp`, 선택)

  return (
    <div className="conv absolute inset-0 z-[65] flex flex-col justify-end overflow-hidden" role="dialog" aria-modal="true" aria-label={`${h.name}와의 대화`} onClick={next} style={{ background: `radial-gradient(circle, ${col}44 1.4px, transparent 1.9px) 0 0 / 7px 7px, linear-gradient(#2a1d3c, #3a2a52)` }}>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute right-3 top-3 z-20 border-2 border-ink bg-white px-2.5 py-1 text-[12px] font-black shadow-[2px_2px_0_#35244a]">닫기</button>
      {/* 초상화: 대화 상자 바로 위에 선다 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[190px] top-14 flex items-end justify-center">
        {!bad ? <img key={happy ? 'h' : 'n'} src={`/art/npc/${id}${happy ? '-happy' : ''}.webp`} alt={h.name} onError={() => (happy ? setBadHappy(true) : setBad(true))} className="max-h-full w-auto object-contain object-bottom" />
          : <svg viewBox="-2 0 20 22" className="max-h-full w-auto drop-shadow-[0_6px_0_rgba(0,0,0,.3)]" style={{ height: '100%' }} shapeRendering="crispEdges"><PixelSprite look={h.look} /></svg>}
      </div>
      {/* 대화 상자 */}
      <div className="relative mx-2.5 mb-4 border-[2.5px] border-ink bg-white px-4 pb-4 pt-6 shadow-[4px_4px_0_#000]" style={{ borderRadius: '16px 16px 16px 3px' }}>
        <div className="absolute -top-4 left-3 flex items-end gap-2">
          <span className="bg-ink px-3 py-0.5 font-display text-[18px] text-white [clip-path:polygon(0_0,100%_0,94%_100%,0_100%)]">{h.name}</span>
        </div>
        <div className="absolute -top-3 right-3 flex gap-0.5 bg-white px-1.5 text-[15px] leading-none" title="호감도 (하루에 한 번 대화하면 이야기가 이어져요)">
          {[0, 1, 2, 3].map((k) => <span key={k} className={k < deep ? 'text-[#d99a00]' : k < hearts ? (newHeart && k === hearts - 1 ? 'float text-[#ff5f98]' : 'text-[#ff5f98]') : 'text-ink/25'}>♥</span>)}
        </div>
        <div className="mb-1.5 text-[11px] font-bold text-ink2">{h.title}</div>
        {last ? (
          <div className="space-y-2.5">
            {gift && <p className="m-0 border-2 border-dashed border-gold bg-[#fff8e0] px-2.5 py-1.5 text-[13px] font-black text-[#8a6500]">선물을 받았어요! "{gift}" 소품이 열렸어요. 프로필 꾸미기에서 써 보세요.</p>}
            <p className="m-0 text-[13px] font-bold text-ink2">{fresh && pts < h.story.length - 1 ? (pts === 3 ? '이제 우리, 꽤 친해진 것 같아요.' : '내일 또 이야기를 들려줄게요.') : finale ? '이야기를 끝까지 들어 줘서 고마워요.' : '또 놀러 와 줘요.'}</p>
            {giftMsg && <p className="m-0 text-[13px] font-bold" role="status">“{giftMsg}”</p>}
            <button disabled={giftedToday || !!server || cash < h.gift.price} onClick={(e) => { e.stopPropagation(); const r = useGame.getState().giveGift(id); setGiftMsg('line' in r ? r.line : r.error); }} className="panel-flat h-9 w-full bg-[#fff0f6] text-[12.5px] font-black disabled:opacity-50">{giftedToday ? '오늘은 선물을 건넸어요' : `${h.gift.name} 선물하기 (${h.gift.price} 마나, 하루 한 번)`}</button>
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); select(h.guild); onClose(); }} className="btn3d h-11 flex-1 text-[14px]" style={{ ['--c' as string]: '#ffc13b', color: '#35244a', textShadow: 'none' } as React.CSSProperties}>{h.guild} 거래하러 가기</button>
              {seen && !cut && <button onClick={(e) => { e.stopPropagation(); setCut(true); }} className="btn3d h-11 w-[84px] text-[13px]" style={{ ['--c' as string]: '#ffe3ee', color: '#35244a', textShadow: 'none' } as React.CSSProperties}>그 컷</button>}
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="btn3d h-11 w-[104px] text-[14px]" style={{ ['--c' as string]: '#fff', color: '#35244a', textShadow: 'none' } as React.CSSProperties}>다음에 또</button>
            </div>
          </div>
        ) : (
          <>
            <p className="m-0 min-h-[64px] pr-4 text-[14px] font-bold leading-relaxed">{text.slice(0, n)}</p>
            {done && <span className="caret absolute bottom-2 right-3 text-[12px] text-pink">▼</span>}
          </>
        )}
      </div>
      {cut && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#1d1330]/90 px-6 text-center" role="status" aria-live="polite">
          <svg viewBox="-2 0 20 22" className="h-[46%] w-auto drop-shadow-[0_6px_0_rgba(0,0,0,.4)]" shapeRendering="crispEdges"><PixelSprite look={h.look} /></svg>
          <div className="ach-seal !static !m-0 !animate-none" style={{ animation: 'stamp-in .5s ease-out both' }}><small>{h.name}의 이야기</small><b>{h.cut.title}</b></div>
          <p className="m-0 max-w-[280px] text-[15px] font-bold leading-relaxed text-white">{h.cut.line}</p>
          <span className="text-[12px] font-bold text-white/70">화면을 누르면 돌아가요</span>
        </div>
      )}
    </div>
  );
}
