import { DEFAULT_CONFIG as cfg, fantasyDate } from '@mana/engine';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { change, fmt, pct } from '../format';
import { SECTOR_COLOR } from '../ui/bits';
import { useGame } from '../store';
import { NpcMark } from './NpcView';
import { drawWorld } from './canvasWorld';
import { personSprite } from './npcSprite';
import { HEROINES } from './heroines';
import { homeEnts, shopEnts, townEnts } from './townFx';
import { createNpcs, stepNpc, type Npc } from './npcs';
import { PixelHero } from './PixelHero';
import { MOUNT_SPEED } from '../mount';
import { mountSprite } from './pixelMounts';
import { PS } from './pix';
import { sx, sy } from './iso';
import { heroPos, isTouch, pad } from './input';
import { useActivity } from '../ui/activityStore';
import { ALL_SPOTS_WITH_DIVE as ALL_SPOTS, DIVE_SPOT, FISH_SPOT, TEMPLE_SPOT } from '../gather';
import { ENTS, GUILDS, START, findPath, nearestWalkable, walkable } from './map';
import { buildWorld } from './world';


/** 길드 일러스트 크기(받침을 타일 너비의 몇 배로). 마법사 탑은 워낙 키가 커서 조금 줄인다 */
export const K = 1.4; // 확대 배율 (월드 1단위 = 화면 1.4px)
const SPEED = 3.2; // 타일/초 (클릭 이동)
const KEY_SPEED = 3.8; // 타일/초 (방향키 이동)
const NEAR = 1.5; // 길드 앞 "거래" 안내가 뜨는 거리(타일)
const KEYMAP: Record<string, 'up' | 'down' | 'left' | 'right'> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right', ㅈ: 'up', ㄴ: 'down', ㅁ: 'left', ㅇ: 'right' };

/** 주요 거점을 둘러싼 유한한 중세 마을. 카메라는 주인공을 따라가고, 주인공은 항상 화면 가운데에 있다 */
export function IsoWorld({ W, H, heroY, shift, sky, weather, overlay, onTalk, chat, glow = 0 }: { W: number; H: number; heroY: number; shift: number; sky: ReactNode; weather: ReactNode; overlay: ReactNode; onTalk?: (n: Npc) => void; chat?: { id: string; text: string } | null; glow?: number }) {
  const { market, holdings, selected, select, look } = useGame();
  const festival = !!fantasyDate(market.day).festival;
  const town = useGame((g) => g.town);
  const mount = useGame((g) => g.mount), mountRef = useRef(mount);
  mountRef.current = mount;
  const shopLv = useGame((g) => g.shop?.lv ?? 0), married = useGame((g) => (g.love?.stage ?? 0) >= 6);
  const extra = useMemo(() => [...townEnts(town), ...shopEnts(shopLv), ...homeEnts(married), ...ALL_SPOTS.map((x) => x.ent)], [town, shopLv, married]);
  const openIt = useActivity((x) => x.openIt);
  const [nearSpot, setNearSpot] = useState<number | null>(null);
  const nearSpotRef = useRef<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  /** 활동 장소에서 E: 오늘 더 할 수 있으면 미니게임·던전 화면을 연다 */
  const doGather = () => {
    const id = nearSpotRef.current; if (id === null) return;
    if (useGame.getState().server) return say('서버 모드에서는 쓸 수 없어요');
    if (id === FISH_SPOT.id) return openIt({ kind: 'fish' });
    if (id === DIVE_SPOT.id) return openIt({ kind: 'dive' });
    if (id === TEMPLE_SPOT.id) return openIt({ kind: 'temple' });
    return openIt({ kind: 'gather', spot: id });
  };
  const gatherRef = useRef(doGather); gatherRef.current = doGather;
  const hero = useRef({ x: START[0], y: START[1], path: [] as [number, number][], flip: false, moving: false, back: false });
  const [npcs] = useState(createNpcs);
  // 사람 NPC 그림을 미리 만들어 둔다(걷다가 처음 보는 NPC를 만날 때 한 번에 몰려 끊기지 않게, 여유 시간에 조금씩)
  useEffect(() => {
    const looks = npcs.filter((n) => n.def.look).flatMap((n) => [[n.def.look!, false], [n.def.look!, true]] as const);
    let i = 0, id = 0;
    const step = () => { for (let k = 0; k < 4 && i < looks.length; k++, i++) personSprite(looks[i][0], looks[i][1]); if (i < looks.length) id = window.setTimeout(step, 40); };
    id = window.setTimeout(step, 600);
    return () => clearTimeout(id);
  }, [npcs]);
  const onTalkRef = useRef(onTalk);
  onTalkRef.current = onTalk;
  const [, setNpcTick] = useState(0);
  const lastNpcTick = useRef(0);
  const lastDraw = useRef(0);
  const drawRef = useRef<((t: number) => void) | undefined>(undefined);
  const keys = useRef({ up: false, down: false, left: false, right: false });
  const [near, setNear] = useState<string | null>(null);
  const nearRef = useRef<string | null>(null);
  /** 가까이 있는 히로인(주요 NPC): 이야기 버튼과 E 키 */
  const [nearH, setNearH] = useState<Npc | null>(null);
  const nearHRef = useRef<Npc | null>(null);
  const [anchor, setAnchor] = useState({ x: Math.round(START[0]), y: Math.round(START[1]) });
  const committed = useRef(anchor);
  const pending = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dirty = useRef(true);
  const scaleRef = useRef(1);
  const panRef2 = useRef<HTMLDivElement>(null);
  const panRef3 = useRef<HTMLDivElement>(null);
  const heroRef = useRef<SVGGElement>(null);
  const flipRef = useRef<SVGGElement>(null);

  const ax = sx(anchor.x, anchor.y), ay = sy(anchor.x, anchor.y);

  // 카메라/주인공 위치는 렌더 없이 직접 갱신 (60fps)
  const apply = useCallback(() => {
    const h = hero.current, a = committed.current;
    const hx = sx(h.x, h.y), hy = sy(h.x, h.y);
    // 화면 픽셀(기기 픽셀)에 맞춰 반올림: 소수점 위치로 움직이면 도트가 프레임마다 다르게 샘플링돼 가장자리가 반짝인다
    const dpr = window.devicePixelRatio || 1, snap = (v: number) => Math.round(v * dpr) / dpr;
    const t = `translate3d(${snap(-(hx - sx(a.x, a.y)) * K)}px,${snap(-(hy - sy(a.x, a.y)) * K)}px,0)`;
    if (panRef2.current) panRef2.current.style.transform = t;
    if (panRef3.current) panRef3.current.style.transform = t;
    heroRef.current?.setAttribute('data-walking', h.path.length || h.moving ? '1' : '0');
    heroRef.current?.setAttribute('data-back', h.back ? '1' : '0');
    flipRef.current?.setAttribute('transform', h.flip ? 'scale(-1 1)' : 'scale(1 1)');
  }, []);

  useLayoutEffect(() => { committed.current = anchor; pending.current = false; apply(); }, [anchor, apply]);

  useEffect(() => {
    let raf = 0, last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const h = hero.current;
      // 방향키: 화면 방향을 아이소메트릭 타일 방향으로 바꿔 이동한다 (대각선은 속도 보정, 건물 벽은 따라 미끄러짐)
      const k = keys.current;
      const kx = Math.max(-1, Math.min(1, (k.right ? 1 : 0) - (k.left ? 1 : 0) + pad.x)), ky = Math.max(-1, Math.min(1, (k.down ? 1 : 0) - (k.up ? 1 : 0) + pad.y));
      h.moving = Math.hypot(kx, ky) > 0.2;
      if (h.moving) {
        h.path = []; // 클릭으로 가던 경로는 취소
        const len = Math.hypot(kx, ky) * Math.SQRT2, step = KEY_SPEED * MOUNT_SPEED[mountRef.current] * dt;
        const nx = h.x + ((kx + ky) / len) * step, ny = h.y + ((-kx + ky) / len) * step;
        if (walkable(nx, ny)) { h.x = nx; h.y = ny; }
        else if (walkable(nx, h.y)) h.x = nx;
        else if (walkable(h.x, ny)) h.y = ny;
        if (kx) h.flip = kx < 0;
        h.back = ky < 0; // 화면 위쪽으로 걸을 땐 뒷모습, 옆·아래는 앞모습
      }
      if (h.moving || h.path.length) {
        let best: string | null = null, bd = NEAR;
        for (const [id, g] of Object.entries(GUILDS)) { const d = Math.hypot(g.stand[0] - h.x, g.stand[1] - h.y); if (d < bd) { bd = d; best = id; } }
        if (best !== nearRef.current) { nearRef.current = best; setNear(best); }
      }
      if (h.moving || h.path.length || nearSpotRef.current !== null) {
        let ns: number | null = null, sd = 1.6;
        for (const sp of ALL_SPOTS) { const d = Math.hypot(sp.tile[0] + 0.5 - h.x, sp.tile[1] + 0.5 - h.y); if (d < sd) { sd = d; ns = sp.id; } }
        if (ns !== nearSpotRef.current) { nearSpotRef.current = ns; setNearSpot(ns); }
      }
      if (h.moving || h.path.length || nearHRef.current) { // 히로인은 제자리라 걷는 동안만 다시 잰다
        let nh: Npc | null = null, nd = 2.4;
        for (const n of npcs) if (n.def.heroine) { const d = Math.hypot(n.x - h.x, n.y - h.y); if (d < nd) { nd = d; nh = n; } }
        if (nh !== nearHRef.current) { nearHRef.current = nh; setNearH(nh); }
      }
      if (h.path.length) {
        const [tx, ty] = h.path[0];
        const dx = tx - h.x, dy = ty - h.y, dist = Math.hypot(dx, dy), step = SPEED * MOUNT_SPEED[mountRef.current] * dt;
        if (dist <= step) { h.x = tx; h.y = ty; h.path.shift(); }
        else { h.x += (dx / dist) * step; h.y += (dy / dist) * step; }
        if (Math.abs(dx - dy) > 1e-3) h.flip = dx - dy < 0;
        h.back = dx + dy < -1e-3;
      }
      heroPos.x = h.x; heroPos.y = h.y;
      for (const n of npcs) stepNpc(n, dt, npcs);
      if (t - lastNpcTick.current > 100) {
        lastNpcTick.current = t; setNpcTick((v) => v + 1); // NPC는 10fps로 그린다
      }
      const walking = h.moving || h.path.length > 0;
      if (walking || dirty.current || t - lastDraw.current > 100) { lastDraw.current = t; dirty.current = false; drawRef.current?.(t); } // 걸을 땐 매 프레임, 가만히 있을 땐 NPC 속도(10fps)로
      apply();
      const a = committed.current;
      if (!pending.current && (Math.abs(h.x - a.x) > 1.5 || Math.abs(h.y - a.y) > 1.5)) {
        pending.current = true;
        setAnchor({ x: Math.round(h.x), y: Math.round(h.y) });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [apply, npcs]);

  // 주인공은 항상 맨 위에 그려서 나무·건물에 가려지지 않게 한다
  // 방향키/WASD 이동, Enter로 가까운 길드와 거래
  useEffect(() => {
    const typing = (e: KeyboardEvent) => (e.target as HTMLElement)?.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey || !!document.querySelector('.conv'); // 전체 화면 대화 중에는 걷기·거래 키를 막는다
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const d = KEYMAP[e.key];
      if (d) { keys.current[d] = true; e.preventDefault(); }
      else if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E' || e.key === 'ㄷ') && nearHRef.current) { onTalkRef.current?.(nearHRef.current); e.preventDefault(); }
      else if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E' || e.key === 'ㄷ') && nearSpotRef.current !== null) { gatherRef.current(); e.preventDefault(); }
      else if (e.key === 'Enter' && nearRef.current && (e.target as HTMLElement)?.tagName !== 'BUTTON') select(nearRef.current);
    };
    const up = (e: KeyboardEvent) => { const d = KEYMAP[e.key]; if (d) keys.current[d] = false; };
    const clear = () => { keys.current = { up: false, down: false, left: false, right: false }; };
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', clear);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', clear); };
  }, [select]);

  // 선택한 종목의 길드 앞으로 걸어간다 (도로를 따라)
  const lastSel = useRef(selected);
  useEffect(() => {
    if (selected === lastSel.current) return;
    lastSel.current = selected;
    const h = hero.current;
    h.path = findPath([h.x, h.y], GUILDS[selected].stand); // 격자 A*: 건물·물·나무를 피해 돌아간다
  }, [selected]);

  const markers: Record<string, 'disclosure' | 'rumor'> = {};
  for (const n of market.news) for (const id of n.targetStockIds) if (markers[id] !== 'disclosure') markers[id] = n.kind;

  const world = useMemo(() => buildWorld({ ax: anchor.x, ay: anchor.y, W, H, heroY, K, festival, extra }), [anchor, W, H, heroY, festival, extra]);
  const listRef = useRef(world); listRef.current = world;
  useEffect(() => { dirty.current = true; }, [world, selected, near]);

  // 캔버스에 월드를 그린다(이미지 수백 개를 SVG로 올리면 폰의 Safari가 NPC가 움직일 때마다 큰 SVG를 다시 그려 배경이 깜빡였다)
  drawRef.current = (t) => {
    const c = canvasRef.current, ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    drawWorld(ctx, { W, H, heroY, K, scale: scaleRef.current, hx: hero.current.x, hy: hero.current.y, list: listRef.current, npcs, selected, near: nearRef.current, walking: hero.current.moving || hero.current.path.length > 0, now: t, onLoad: () => { dirty.current = true; } });
  };
  useLayoutEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const size = () => {
      const r = c.getBoundingClientRect(), sc = r.width / W || 1, dpr = Math.min(window.devicePixelRatio || 1, 3);
      scaleRef.current = sc * dpr;
      const w = Math.round(W * sc * dpr), h = Math.round(H * sc * dpr);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      dirty.current = true;
    };
    size();
    addEventListener('resize', size);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null; ro?.observe(c);
    return () => { removeEventListener('resize', size); ro?.disconnect(); };
  }, [W, H]);

  /** 땅을 누르면 그 자리로 걸어간다(건물·물을 피해 돌아서). 길드·NPC·버튼은 각자의 클릭이 처리한다 */
  const [dest, setDest] = useState<{ x: number; y: number; k: number } | null>(null);
  const tapWalk = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('.guild, .npc, button, a, input')) return;
    const r = e.currentTarget.getBoundingClientRect(), sc = r.width / W;
    const px = (e.clientX - r.left) / sc, py = (e.clientY - r.top) / sc + shift; // 화면 속 위치(시트가 월드를 밀어 올린 만큼 보정)
    const dsx = (px - W / 2) / K, dsy = (py - heroY) / K; // 캐릭터 발 기준 월드 변위
    const h = hero.current;
    // 몸이 캔버스에 그려진 일반 NPC는 눌린 자리로 찾는다(가까운 NPC 하나가 한마디 한다)
    const wx = sx(h.x, h.y) + dsx, wy = sy(h.x, h.y) + dsy;
    const hit = npcs.filter((n) => !n.def.heroine && Math.abs(wx - sx(n.x, n.y)) <= 15 && wy >= sy(n.x, n.y) - (n.def.look ? 42 : 26) && wy <= sy(n.x, n.y) + 5).sort((a, b) => Math.hypot(wx - sx(a.x, a.y), wy - sy(a.x, a.y)) - Math.hypot(wx - sx(b.x, b.y), wy - sy(b.x, b.y)))[0];
    if (hit) { onTalkRef.current?.(hit); return; }
    const tx = h.x + (dsx / 28 + dsy / 14) / 2, ty = h.y + (dsy / 14 - dsx / 28) / 2;
    const t = nearestWalkable(tx, ty, 2);
    if (!t) return;
    const path = findPath([h.x, h.y], t);
    if (!path.length) return;
    h.path = path;
    setDest({ x: t[0], y: t[1], k: Date.now() });
    dispatchEvent(new Event('mana-pad')); // 튜토리얼의 "걷기" 단계 완료로 친다
  };
  // 생활 탭·지도의 "걸어가기": 그 자리로 길을 찾아 걷는다
  useEffect(() => {
    const go = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number }>).detail, h = hero.current, t = nearestWalkable(d.x, d.y, 3);
      if (!t) return;
      const path = findPath([h.x, h.y], t);
      if (!path.length) return;
      h.path = path; setDest({ x: t[0], y: t[1], k: Date.now() });
    };
    addEventListener('mana-goto', go); return () => removeEventListener('mana-goto', go);
  }, []);
  useEffect(() => { if (!dest) return; const t = setTimeout(() => setDest(null), 1300); return () => clearTimeout(t); }, [dest]);
  const lamps = ENTS.filter((e) => e.kind === 'lamp' && Math.abs(e.x - anchor.x) < 14 && Math.abs(e.y - anchor.y) < 14).map((e) => ({ key: `${e.x},${e.y}`, x: sx(e.x + 0.5, e.y + 0.5), y: sy(e.x + 0.5, e.y + 0.5) - 30 }));
  const shiftStyle = { transform: `translateY(${-shift}px)`, transition: 'transform .3s cubic-bezier(.3,.9,.3,1)' };
  const camera = `translate(${W / 2} ${heroY}) scale(${K}) translate(${-ax} ${-ay})`;

  return (
    <div className="absolute inset-0 overflow-hidden" onClick={tapWalk}>
      <div className="absolute inset-0" style={shiftStyle}>
        {/* 월드(바닥·건물·NPC 몸)는 캔버스 하나에 그린다: 폰 Safari에서 큰 SVG를 매 프레임 다시 그려 생기던 깜빡임을 없앤다 */}
        <canvas ref={canvasRef} className="pointer-events-none absolute left-0 top-0" style={{ width: W, height: H }} aria-hidden="true" />
        {/* NPC 표식: 히로인 ♥(누르면 대화)와 말풍선만 SVG로 얹는다(요소 몇 개뿐이라 가볍다) */}
        <div className="absolute inset-0">
          <div ref={panRef3} className="absolute left-0 top-0" style={{ width: W, height: H, willChange: 'transform' }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="world-svg absolute inset-0" overflow="visible">
              <g transform={camera}>
                {npcs.filter((n) => (n.def.heroine || chat?.id === n.def.id) && Math.abs(n.x - anchor.x) < 16 && Math.abs(n.y - anchor.y) < 16).map((n) => <NpcMark key={n.def.id} n={n} onTalk={onTalk} say={chat?.id === n.def.id ? chat.text : undefined} />)}
              </g>
            </svg>
          </div>
        </div>
        {/* 영웅: 카메라가 영웅을 따라가므로 화면 가운데에 고정. 월드와 분리해 월드 레이어(픽셀 필터 등)가 매 프레임 다시 그려지지 않게 한다 */}
        <div className="pointer-events-none absolute inset-0">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0" overflow="visible">
            <g transform={`translate(${W / 2} ${heroY}) scale(${K})`}>
              <g ref={heroRef} className="hero">
                <ellipse cx="0" cy="0" rx="19" ry="9.5" fill="url(#glowGold)" opacity=".6" className="breathe" />
                <ellipse cx="0" cy="0" rx="15" ry="7.5" fill="none" stroke="#ffd36b" strokeWidth="1" strokeDasharray="3 5" className="dash" />
                <g ref={flipRef}>
                  {mount > 0 && (() => { const m = mountSprite(mount); return <image href={m.href} x={-m.ox * PS} y={-m.oy * PS + (mount === 3 ? -8 : 0)} width={m.w * PS} height={m.h * PS} style={{ imageRendering: 'pixelated' }} />; })()}
                  <g transform={mount > 0 ? `translate(0 ${mount === 3 ? -20 : -12})` : undefined}><PixelHero look={look} /></g>
                </g>
              </g>
            </g>
          </svg>
        </div>
        {overlay}
      </div>
      {sky}
      {/* 간판은 하늘 안개/비 색조 위에 그려서 항상 또렷하게 */}
      <div className="pointer-events-none absolute inset-0" style={shiftStyle}>
        <div ref={panRef2} className="absolute left-0 top-0" style={{ width: W, height: H, willChange: 'transform' }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0" overflow="visible">
            <g transform={camera}>
            {dest && <ellipse key={dest.k} cx={sx(dest.x, dest.y)} cy={sy(dest.x, dest.y)} rx="13" ry="6.5" fill="rgba(255,211,107,.25)" stroke="#ffd36b" strokeWidth="2" strokeDasharray="4 3" className="ping" />}
            {/* 해 질 녘과 밤: 가로등이 은은하게 빛난다 (하늘 어둠 위에 그려서 밝게 남는다) */}
            {glow > 0.05 && lamps.map((l) => <circle key={l.key} cx={l.x} cy={l.y} r="38" fill="url(#glowGold)" opacity={glow * 0.6} />)}
            {Object.entries(GUILDS).map(([id, g]) => {
              const s = cfg.stocks.find((x) => x.id === id)!;
              const c = change(market.history[id]), sel = selected === id, m = markers[id], held = holdings[id]?.qty ?? 0;
              const X = sx(g.tile[0] + 0.5, g.tile[1] + 0.5), Y = sy(g.tile[0] + 0.5, g.tile[1] + 0.5) - 12; // 간판 끝이 바닥선에서 꽤 위에 떠 있고, 몸통은 건물 앞면 중간~윗부분에 걸친다
              const col = SECTOR_COLOR[s.sectorId];
              const up = c > 0, down = c < 0;
              return (
                <g key={id} transform={`translate(${X} ${Y}) scale(.8)`} className="pointer-events-none" style={{ fontFamily: 'var(--font-display)' }}>
                  {/* 클릭은 간판만: 건물 전체가 아니라 간판 크기의 투명 영역(길드 건물은 눌려도 걷기로 처리) */}
                  <rect x="-33" y="-43" width="66" height="52" fill="transparent" className="guild cursor-pointer" role="button" tabIndex={0} aria-label={`${s.name} 거래`} style={{ pointerEvents: 'all' }}
                    onClick={() => select(id)} onKeyDown={(e) => e.key === 'Enter' && select(id)}><title>{s.name}</title></rect>
                  <g className={sel ? 'plate-pop' : ''}>
                    <polygon points="-6,-1 6,-1 0,7" fill="#fffaf0" stroke="#4a3558" strokeWidth="1.8" strokeLinejoin="round" />
                    <rect x="-31" y="-41" width="62" height="41" rx="9" fill="#fffaf0" stroke={sel ? '#ff9bb8' : '#4a3558'} strokeWidth={sel ? 3 : 2} style={{ filter: sel ? 'drop-shadow(0 0 6px #ff9bb8)' : 'drop-shadow(0 2px 0 rgba(74,53,88,.35))' }} />
                    <rect x="-31" y="-41" width="62" height="13" rx="9" fill={col} stroke="#4a3558" strokeWidth="2" />
                    <rect x="-31" y="-34" width="62" height="6" fill={col} />
                    <text y="-31" textAnchor="middle" fontSize="9.5" fill="#fff" stroke="#4a3558" strokeWidth=".4" letterSpacing=".8">{s.id}</text>
                    <text y="-15.5" textAnchor="middle" fontSize="11.5" fill="#27315c" style={{ fontFamily: 'var(--font-num)' }}>{fmt(market.prices[id])}</text>
                    <rect x="-20" y="-12" width="40" height="9.5" rx="4.7" fill={up ? '#ffe0e4' : down ? '#dfeaff' : '#eee'} />
                    <text y="-4.6" textAnchor="middle" fontSize="8" fontWeight="700" fill={up ? '#e0394e' : down ? '#2f6fe0' : '#8a8a9a'} style={{ fontFamily: 'var(--font-sans)' }}>{up ? '▲' : down ? '▼' : '–'} {pct(Math.abs(c)).replace('+', '')}</text>
                  </g>
                  {held > 0 && <g><circle cx="29" cy="-40" r="9" fill="#ffc94d" stroke="#4a3558" strokeWidth="1.8" /><text x="29" y="-36.6" textAnchor="middle" fontSize="10" fill="#4a3558">{held}</text></g>}
                  {m && (
                    <g transform="translate(-30 -42)"><g className="float">
                      <circle r="9.5" fill={m === 'disclosure' ? '#ffc94d' : '#c9a8ff'} stroke="#4a3558" strokeWidth="1.8" />
                      <text y="4.5" textAnchor="middle" fontSize="13" fill="#4a3558">{m === 'disclosure' ? '!' : '?'}</text>
                    </g></g>
                  )}
                </g>
              );
            })}
            </g>
          </svg>
        </div>
      </div>
      {weather}
      {/* 길드 앞 거래 안내: 간판·날씨보다 위에, 캐릭터 발밑에 */}
      <div className="pointer-events-none absolute inset-0" style={shiftStyle}>
        {toast && <div className="panel-flat pop-in absolute bg-[#fffbe6] px-2.5 py-1 text-[12px] font-black" style={{ left: W / 2 - 74, top: heroY - 70 }} role="status">{toast}</div>}
        {nearSpot !== null && !nearH && (
          <button onClick={doGather} className="panel-flat pop-in pointer-events-auto absolute flex items-center gap-1.5 bg-[#f1ffe8] px-2.5 py-1 text-[12px] font-black" style={{ left: W / 2 - 58, top: heroY + (near ? 56 : 26) }}>
            <kbd className={`rounded-[2px] border-2 border-ink bg-paper px-1 text-[10px] shadow-[1px_1px_0_#35244a] ${isTouch() ? 'font-sans font-black' : 'font-display'}`}>{isTouch() ? '탭' : 'E'}</kbd>
            {ALL_SPOTS[nearSpot].label} {nearSpot === FISH_SPOT.id ? '낚시하기' : nearSpot === DIVE_SPOT.id ? '내려가기' : nearSpot === TEMPLE_SPOT.id ? '들어가기' : '살펴보기'}
          </button>
        )}
        {nearH && (
          <button onClick={() => onTalk?.(nearH)} className="panel-flat pop-in pointer-events-auto absolute flex items-center gap-1.5 bg-[#fff0f6] px-2.5 py-1 text-[12px] font-black" style={{ left: W / 2 - 58, top: heroY + (near ? 56 : 26) }}>
            <kbd className={`rounded-[2px] border-2 border-ink bg-paper px-1 text-[10px] shadow-[1px_1px_0_#35244a] ${isTouch() ? 'font-sans font-black' : 'font-display'}`}>{isTouch() ? '탭' : 'E'}</kbd>
            <span className="text-[#ff5f98]">♥</span>{HEROINES[nearH.def.heroine!].name} 말걸기
          </button>
        )}
        {near && (
          <button onClick={() => select(near)} className="panel-flat pop-in pointer-events-auto absolute flex items-center gap-1.5 bg-white px-2.5 py-1 text-[12px] font-black" style={{ left: W / 2 - 58, top: heroY + 26 }}>
            <kbd className={`rounded-[2px] border-2 border-ink bg-paper px-1 text-[10px] shadow-[1px_1px_0_#35244a] ${isTouch() ? 'font-sans font-black' : 'font-display'}`}>{isTouch() ? '탭' : 'Enter'}</kbd>{near} 거래
          </button>
        )}
      </div>
    </div>
  );
}
