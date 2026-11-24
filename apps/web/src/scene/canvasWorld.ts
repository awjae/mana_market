import { P, sx, sy } from './iso';
import type { Npc } from './npcs';
import { PERSON_PS, personSprite } from './npcSprite';
import { PS } from './pix';
import { animal } from './pixelWorld';
import type { DrawItem, DrawList, Tile } from './world';

/** 월드를 캔버스 하나에 그린다. 이미지 수백 개를 SVG 요소로 올리면 NPC가 움직일 때마다 폰의 Safari가 그 큰 SVG를 다시 그려 배경이 깜빡였다.
 *  캔버스는 그린 결과만 화면에 올라가서 그런 재그리기·층 재합성이 없다. */
const imgs = new Map<string, HTMLImageElement>();
/** 스프라이트(data URL)를 이미지로 한 번만 디코딩해 둔다. 아직 안 불러졌으면 null(다 불러오면 onLoad로 다시 그린다) */
export function imageFor(href: string, onLoad: () => void): HTMLImageElement | null {
  let im = imgs.get(href);
  if (!im) { im = new Image(); im.onload = onLoad; im.src = href; imgs.set(href, im); }
  return im.complete && im.naturalWidth > 0 ? im : null;
}

const edgePaths = new WeakMap<DrawList, Path2D>();

export interface Frame {
  /** 화면 틀 크기(CSS px) */ W: number; H: number; heroY: number; K: number;
  /** 장치 픽셀 ÷ CSS px (스테이지 확대 × 화면 배율) */ scale: number;
  /** 영웅의 타일 좌표 */ hx: number; hy: number;
  list: DrawList; npcs: Npc[];
  selected: string; near: string | null;
  /** 걷는 중이면 캐릭터를 가릴 수 있는 앞쪽 건물이 반투명해진다 */ walking: boolean;
  now: number; onLoad: () => void;
}

export function drawWorld(ctx: CanvasRenderingContext2D, f: Frame) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const s = f.K * f.scale; // 월드 1단위 = 장치 픽셀 s
  const ox = (f.W / 2 - sx(f.hx, f.hy) * f.K) * f.scale, oy = (f.heroY - sy(f.hx, f.hy) * f.K) * f.scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  ctx.fillStyle = '#2c5236'; ctx.fillRect(0, 0, cw, ch);

  /** 장치 픽셀에 딱 맞춰(반올림) 그린다: 도트 가장자리가 프레임마다 흔들리지 않고 타일 사이에 틈이 생기지 않는다 */
  const blit = (t: Tile, flipAround?: number, alpha = 1) => {
    let x0 = t.x * s + ox, x1 = (t.x + t.w) * s + ox;
    if (flipAround !== undefined) { const c = flipAround * s + ox; x0 = 2 * c - (t.x + t.w) * s - ox; x1 = 2 * c - t.x * s - ox; }
    const X0 = Math.round(x0), X1 = Math.round(x1), Y0 = Math.round(t.y * s + oy), Y1 = Math.round((t.y + t.h) * s + oy);
    if (X1 < 0 || Y1 < 0 || X0 > cw || Y0 > ch) return;
    const im = imageFor(t.sp.href, f.onLoad);
    if (!im) return;
    if (alpha !== 1) ctx.globalAlpha = alpha;
    ctx.drawImage(im, X0, Y0, Math.max(1, X1 - X0), Math.max(1, Y1 - Y0));
    if (alpha !== 1) ctx.globalAlpha = 1;
  };

  for (const t of f.list.tiles) blit(t);

  // 길(포장) 가장자리의 가는 선
  let ep = edgePaths.get(f.list);
  if (!ep) { ep = new Path2D(f.list.edges); edgePaths.set(f.list, ep); }
  ctx.setTransform(s, 0, 0, s, ox, oy);
  ctx.strokeStyle = 'rgba(42,31,56,.4)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke(ep);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const hs = f.hx + f.hy, hu = f.hx - f.hy;
  const drawGuildPad = (it: DrawItem) => {
    const sel = f.selected === it.guild, focus = f.near === it.guild, gx = it.gx, gy = it.gy;
    ctx.setTransform(s, 0, 0, s, ox, oy);
    ctx.beginPath();
    for (const [i, p] of [[gx, gy], [gx + 1, gy], [gx + 1, gy + 1], [gx, gy + 1]].entries()) { const [x, y] = P(p[0], p[1]).split(',').map(Number); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.closePath();
    ctx.fillStyle = focus ? 'rgba(255,211,107,.65)' : 'rgba(255,211,107,.42)'; ctx.fill();
    ctx.setLineDash([4, 3]); ctx.strokeStyle = '#35244a'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    if (sel) { ctx.fillStyle = 'rgba(255,211,107,.3)'; ctx.fill(); ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
  const drawStatic = (it: DrawItem) => {
    if (it.guild) {
      drawGuildPad(it);
      const sel = f.selected === it.guild, focus = f.near === it.guild;
      if (sel || focus) { ctx.shadowColor = sel ? '#ffd36b' : `rgba(255,211,107,${0.6 + 0.4 * Math.sin(f.now / 160)})`; ctx.shadowBlur = (sel ? 8 : 3.5) * s * 0.7; }
      blit(it);
      ctx.shadowBlur = 0;
      return;
    }
    // 걷는 동안 캐릭터를 가릴 수 있는 앞쪽 건물만 반투명(앞쪽 = 영웅보다 깊이가 크고 화면 가로로 가까운 것)
    const hide = f.walking && it.sum >= hs - 0.6 && it.sum - hs < 5.5 && Math.abs(it.gx - it.gy - hu) < 3.4;
    const want = hide ? 0.22 : 1;
    it.a += (want - it.a) * 0.3; if (Math.abs(it.a - want) < 0.02) it.a = want;
    blit(it, undefined, it.a);
  };

  const drawShadow = (X: number, Y: number, rx: number, ry: number, fill: string) => {
    ctx.setTransform(s, 0, 0, s, ox, oy);
    ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
  const drawNpc = (n: Npc) => {
    const X = sx(n.x, n.y), Y = sy(n.x, n.y);
    if (n.def.look) {
      const sp = personSprite(n.def.look, n.back), hop = n.moving ? Math.abs(Math.sin(f.now / 90 + n.phase * 3)) * 2.5 : 0;
      drawShadow(X, Y, 10, 3.4, 'rgba(60,40,140,.28)');
      blit({ sp, x: X - sp.ox * PERSON_PS, y: Y - sp.oy * PERSON_PS - hop, w: sp.w * PERSON_PS, h: sp.h * PERSON_PS }, n.flip ? X : undefined);
    } else {
      const [kind, v] = n.def.animal!, sp = animal(kind, v), fly = kind === 'gull';
      const lift = fly ? 30 + Math.sin(n.phase * 3) * 3 : n.moving ? Math.abs(Math.sin(f.now / 100 + n.phase * 3)) * 2 : 0;
      if (fly) drawShadow(X, Y, 6, 2, 'rgba(60,40,140,.22)');
      blit({ sp, x: X - sp.ox * PS, y: Y - sp.oy * PS - lift, w: sp.w * PS, h: sp.h * PS }, n.flip ? X : undefined);
    }
  };

  // 깊이(x+y) 순서로 건물과 NPC를 섞어 그린다: 건물 뒤로 걸어가면 가려진다
  const live = f.npcs.filter((n) => Math.abs(n.x - f.hx) < 16 && Math.abs(n.y - f.hy) < 16).map((n) => ({ n, sum: n.x + n.y })).sort((a, b) => a.sum - b.sum);
  let i = 0;
  for (const it of f.list.ents) {
    while (i < live.length && live[i].sum < it.sum) drawNpc(live[i++].n);
    drawStatic(it);
  }
  while (i < live.length) drawNpc(live[i++].n);
}
