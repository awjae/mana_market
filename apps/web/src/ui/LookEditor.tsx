import { CATCH_LABEL } from '../activity';
import { CRAFT_D, LOOT } from '../dungeon';
import { CRAFT, MAT_KINDS, MAT_LABEL, type MatKind } from '../gather';
import { useState } from 'react';
import { PixelHeroPreview } from '../scene/PixelHero';
import {
  ACC_COLORS, BASE_PROPS, CLOTHES_COLORS, CLOTHES_NAMES, EYE_COLORS, EYE_NAMES, HAIR_COLORS, HAIR_NAMES, PROP_NAMES, PROP_PRICE, PROP_UNLOCK, LOOK_PRICE, lookKey, usableLooks, type LookKind, SKINS, UNLOCK_PTS, type Look,
} from '../scene/pixelHeroData';
import { HEROINES } from '../scene/heroines';
import { useGame } from '../store';
import { Title } from './bits';
import { NickField } from './NickField';

const Swatches = ({ colors, value, onPick, label }: { colors: string[]; value: number; onPick: (i: number) => void; label: string }) => (
  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
    {colors.map((c, i) => (
      <button key={c} role="radio" aria-checked={i === value} aria-label={`${label} ${i + 1}`} onClick={() => onPick(i)}
        className={`h-[26px] w-[26px] border-2 p-0 ${i === value ? 'border-ink shadow-[2px_2px_0_#ff8fb8]' : 'border-ink/30'}`} style={{ background: c }} />
    ))}
  </div>
);

/** 모양을 ◀ ▶ 로 넘기는 한 줄 */
const Shape = ({ names, value, onPick }: { names: string[]; value: number; onPick: (i: number) => void }) => (
  <div className="mb-1.5 flex items-center gap-2">
    <button aria-label="이전 모양" onClick={() => onPick((value + names.length - 1) % names.length)} className="panel-flat h-7 w-8 bg-white p-0 text-[13px] font-black active:bg-[#ffe3ee]">◀</button>
    <span className="min-w-[88px] text-center text-[13px] font-black">{names[value]}</span>
    <button aria-label="다음 모양" onClick={() => onPick((value + 1) % names.length)} className="panel-flat h-7 w-8 bg-white p-0 text-[13px] font-black active:bg-[#ffe3ee]">▶</button>
  </div>
);

const Row = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="ruled-row border-t-2 border-dashed border-ink/20 py-2.5 first:border-t-0">
    <div className="mb-1.5 text-[12px] font-black text-ink2">{title}</div>
    {children}
  </div>
);

/** 내 모습: 피부·눈·머리·옷·소품 5층을 고른다 */
export function LookEditor({ showTitle = true, big = false }: { showTitle?: boolean; big?: boolean }) {
  const { look, setLook, bond } = useGame();
  // 해금된 소품만 고를 수 있다: 기본 6개 + 히로인과 4일 이야기를 끝까지 들은 상징 소품
  const { ownedProps, ownedLooks, cash, buyProp, buyLook, server, mats, craftProp, dlog, craftDProp } = useGame();
  const [openGroup, setOpenGroup] = useState<string | null>(null), [askBuy, setAskBuy] = useState<string | null>(null), [buyMsg, setBuyMsg] = useState<string | null>(null);
  // 눈·머리·옷의 일부는 마나로 사야 고를 수 있다(무료 + 산 것 + 지금 쓰는 것만 ◀ ▶ 로 넘긴다)
  const eyeL = usableLooks('eye', ownedLooks, look.eyeShape), hairL = usableLooks('hair', ownedLooks, look.hairShape), clothL = usableLooks('clothes', ownedLooks, look.clothesShape);
  const pickFrom = (list: number[], v: number) => ({ names: (n: string[]) => list.map((i) => n[i]), pos: Math.max(0, list.indexOf(v)) });
  /** 가게 목록: 소품 + 눈·머리·옷 한정 모양 */
  const items: { key: string; group: string; label: string; price: number; buy: () => string | null; equip: () => void }[] = [
    ...Object.keys(PROP_PRICE).map(Number).filter((i) => !ownedProps.includes(i)).map((i) => ({ key: `prop:${i}`, group: '소품', label: PROP_NAMES[i], price: PROP_PRICE[i], buy: () => buyProp(i), equip: () => set({ prop: i }) })),
    ...(['hair', 'eye', 'clothes'] as LookKind[]).flatMap((k) => Object.keys(LOOK_PRICE[k]).map(Number).filter((i) => !ownedLooks.includes(lookKey(k, i))).map((i) => ({ key: lookKey(k, i), group: { hair: '머리', eye: '눈', clothes: '옷' }[k], label: ({ hair: HAIR_NAMES, eye: EYE_NAMES, clothes: CLOTHES_NAMES } as const)[k][i], price: LOOK_PRICE[k][i], buy: () => buyLook(k, i), equip: () => set(k === 'hair' ? { hairShape: i } : k === 'eye' ? { eyeShape: i } : { clothesShape: i }) }))),
  ];
  const unlocked = PROP_NAMES.map((_, i) => i < BASE_PROPS || ownedProps.includes(i) || (bond[PROP_UNLOCK[i]]?.pts ?? 0) >= UNLOCK_PTS);
  const propList = PROP_NAMES.map((_, i) => i).filter((i) => unlocked[i]);
  const locked = PROP_NAMES.map((_, i) => i).filter((i) => !unlocked[i] && PROP_UNLOCK[i] !== undefined);
  const pos = Math.max(0, propList.indexOf(look.prop));
  const set = (p: Partial<Look>) => setLook(p);
  return (
    <div className="space-y-3">
      {showTitle && <Title ko="프로필" />}
      <NickField />
      {big && <div className="flex justify-center"><div className="border-2 border-ink bg-[#e9f6ff] p-3 shadow-[4px_4px_0_#35244a]"><PixelHeroPreview look={look} size={170} /></div></div>}
      <div className="panel-flat flex items-start gap-3 p-3">
        {!big && <div className="shrink-0 border-2 border-ink bg-[#e9f6ff] p-1.5"><PixelHeroPreview look={look} size={104} /></div>}
        <div className="min-w-0 flex-1">
          <Row title="피부"><Swatches colors={SKINS} value={look.skin} onPick={(i) => set({ skin: i })} label="피부색" /></Row>
          <Row title="눈"><Shape names={pickFrom(eyeL, look.eyeShape).names(EYE_NAMES)} value={pickFrom(eyeL, look.eyeShape).pos} onPick={(i) => set({ eyeShape: eyeL[i] })} /><Swatches colors={EYE_COLORS} value={look.eyeColor} onPick={(i) => set({ eyeColor: i })} label="눈 색" /></Row>
        </div>
      </div>
      <div className="panel-flat px-3">
        <Row title="머리"><Shape names={pickFrom(hairL, look.hairShape).names(HAIR_NAMES)} value={pickFrom(hairL, look.hairShape).pos} onPick={(i) => set({ hairShape: hairL[i] })} /><Swatches colors={HAIR_COLORS} value={look.hairColor} onPick={(i) => set({ hairColor: i })} label="머리색" /></Row>
        <Row title="옷"><Shape names={pickFrom(clothL, look.clothesShape).names(CLOTHES_NAMES)} value={pickFrom(clothL, look.clothesShape).pos} onPick={(i) => set({ clothesShape: clothL[i] })} /><Swatches colors={CLOTHES_COLORS.map((c) => c[0])} value={look.clothesColor} onPick={(i) => set({ clothesColor: i })} label="옷 색" /></Row>
        <Row title="모자·악세사리"><Shape names={propList.map((i) => PROP_NAMES[i])} value={pos} onPick={(i) => set({ prop: propList[i] })} />{look.prop > 0 && <Swatches colors={ACC_COLORS} value={look.propColor} onPick={(i) => set({ propColor: i })} label="악세사리 색" />}
          {items.length > 0 && !big && (
            <div className="mt-2 border-t-2 border-dashed border-ink/25 pt-2">
              <div className="mb-1 text-[11px] font-black text-ink2">한정 가게 (마나로 사면 영구히 내 것이에요)</div>
              {['소품', '눈', '머리', '옷'].map((g) => {
                const list = items.filter((it) => it.group === g), open = openGroup === g;
                if (!list.length) return null;
                return (
                  <div key={g} className="mb-1">
                    <button onClick={() => { setOpenGroup(open ? null : g); setAskBuy(null); }} aria-expanded={open} className="panel-flat flex h-8 w-full items-center justify-between bg-white px-2.5 text-[12px] font-black">
                      <span>{g} <span className="font-num text-[11px] text-ink2">{list.length}개</span></span><span className="text-ink2">{open ? '접기' : '펼치기'}</span>
                    </button>
                    {open && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {list.map((it) => <button key={it.key} disabled={!!server} onClick={() => { if (askBuy !== it.key) { setAskBuy(it.key); setBuyMsg(null); setTimeout(() => setAskBuy((a) => (a === it.key ? null : a)), 4000); } else { setAskBuy(null); const e = it.buy(); setBuyMsg(e ?? `${it.label}을(를) 샀어요.`); if (!e) it.equip(); } }} className={`panel-flat h-8 px-2 text-[11.5px] font-black disabled:opacity-40 ${askBuy === it.key ? 'bg-[#fff0b8]' : 'bg-white'}`}>{it.label} {askBuy === it.key ? `${it.price} 마나 쓰기` : it.price.toLocaleString('ko-KR')}</button>)}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="mt-2 border-t-2 border-dashed border-ink/40 pt-2">
                <p className="m-0 mb-1 text-[12px] font-black">수공품 만들기 <span className="text-[11px] font-bold text-ink2">(마을 바깥 풀밭에서 주운 재료로만 만들어요)</span></p>
                <p className="m-0 mb-1.5 text-[11px] font-bold text-ink2">가진 재료: {[...MAT_KINDS.map((k) => `${MAT_LABEL[k]} ${mats[k] ?? 0}`), ...Object.keys(CATCH_LABEL).map((k) => `${CATCH_LABEL[k]} ${mats[k] ?? 0}`)].join(', ')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CRAFT).map(([k, r]) => { const i = Number(k), has = ownedProps.includes(i); return (
                    <button key={i} disabled={!!server || has} onClick={() => { const e = craftProp(i); setBuyMsg(e ?? `${PROP_NAMES[i]}을(를) 만들었어요`); if (!e) set({ prop: i }); }} className="panel-flat min-h-8 bg-white px-2 py-1 text-left text-[11.5px] font-black disabled:opacity-60">
                      {PROP_NAMES[i]}<span className="block text-[10.5px] font-bold text-ink2">{has ? '가지고 있어요' : Object.entries(r).map(([m, n]) => `${MAT_LABEL[m as MatKind] ?? CATCH_LABEL[m] ?? m} ${n}`).join(' + ')}</span>
                    </button>); })}
                </div>
              </div>
              <div className="mt-2 border-t-2 border-dashed border-ink/40 pt-2">
                <p className="m-0 mb-1 text-[12px] font-black">던전 재료로 만들기 <span className="text-[11px] font-bold text-ink2">(던전에서 얻은 재료로만 만들어요)</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CRAFT_D).map(([k, r]) => { const i = Number(k), has = ownedProps.includes(i); return (
                    <button key={i} disabled={!!server || has} onClick={() => { const e = craftDProp(i); setBuyMsg(e ?? `${PROP_NAMES[i]}을(를) 만들었어요`); if (!e) set({ prop: i }); }} className="panel-flat min-h-8 bg-white px-2 py-1 text-left text-[11.5px] font-black disabled:opacity-60">
                      {PROP_NAMES[i]}<span className="block text-[10.5px] font-bold text-ink2">{has ? '가지고 있어요' : Object.entries(r).map(([m, n]) => `${LOOT.find((l) => l.id === m)?.name} ${n}(${dlog.mats[m] ?? 0})`).join(' + ')}</span>
                    </button>); })}
                </div>
              </div>
              <p className="m-0 mt-1 text-[11px] font-bold text-ink2">지금 현금 {Math.round(cash).toLocaleString('ko-KR')} 마나{askBuy !== null ? `, 사면 ${Math.round(cash - (items.find((x) => x.key === askBuy)?.price ?? 0)).toLocaleString('ko-KR')} 마나가 남아요` : ''}. {buyMsg ?? ''}</p>
            </div>
          )}
          {locked.length > 0 && !big && <p className="m-0 mt-1.5 text-[11px] font-bold text-ink2">잠긴 소품 {locked.length}개: 히로인과 {UNLOCK_PTS}일 동안 이야기를 끝까지 들으면 그 히로인의 소품이 열려요 ({locked.map((i) => `${HEROINES[PROP_UNLOCK[i]].name}: ${PROP_NAMES[i]}`).join(', ')}).</p>}</Row>
      </div>
    </div>
  );
}
