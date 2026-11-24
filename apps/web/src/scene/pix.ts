/**
 * 도트 래스터라이저: 아이소 2:1 타일을 32×16 픽셀로 그려 이미지(스프라이트)로 캐시한다.
 * 도트 하나 = 월드 1.75 단위(캐릭터와 같은 격자). 같은 키는 한 번만 그린다.
 * 좌표: 타일 중심이 (0,0), x는 오른쪽 아래, y는 왼쪽 아래, z는 픽셀 높이.
 */
export const PS = 1.75;
export type RGB = [number, number, number];
export type Pt = [number, number];

export const rgb = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
export const mixc = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const WHITE: RGB = [255, 255, 255], PURPLE: RGB = [90, 70, 120], INK: RGB = [53, 36, 74];

export const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** 윗면은 밝게, 왼쪽은 원색, 오른쪽은 보랏빛 그늘 */
export interface Mat { top: RGB; left: RGB; right: RGB }
export const mat = (hex: string): Mat => { const b = rgb(hex); return { top: mixc(b, WHITE, 0.36), left: mixc(b, WHITE, 0.04), right: mixc(b, PURPLE, 0.4) }; };

export class Buf {
  data: Uint8ClampedArray<ArrayBuffer>;
  constructor(public w: number, public h: number) { this.data = new Uint8ClampedArray(new ArrayBuffer(w * h * 4)); }
  private i(x: number, y: number) { return (y * this.w + x) * 4; }
  set(x: number, y: number, c: RGB, a = 255) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = this.i(x, y);
    this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2]; this.data[i + 3] = a;
  }
  alpha(x: number, y: number) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.data[this.i(x, y) + 3]; }
  get(x: number, y: number): RGB { const i = this.i(x, y); return [this.data[i], this.data[i + 1], this.data[i + 2]]; }

  /** 다각형 채우기: 픽셀 중심이 안에 들어오는 칸만 칠한다(안티앨리어싱 없음) */
  poly(pts: Pt[], c: RGB) {
    let min = Infinity, max = -Infinity;
    for (const p of pts) { min = Math.min(min, p[1]); max = Math.max(max, p[1]); }
    for (let y = Math.ceil(min - 0.5); y <= Math.floor(max - 0.5); y++) {
      const yc = y + 0.5, xs: number[] = [];
      for (let k = 0; k < pts.length; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[(k + 1) % pts.length];
        if ((y0 <= yc && yc < y1) || (y1 <= yc && yc < y0)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x < Math.ceil(xs[k + 1] - 0.5); x++) this.set(x, y, c);
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  /** 타원(원): 중심, 반지름 */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }

  /** 실루엣 바깥 한 칸에 윤곽선을 두른다. 색은 맞닿은 면의 색을 어둡게 눌러 만든다(셀프 아웃라인) */
  outline() {
    const add: [number, number, RGB][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.alpha(x, y) !== 0) continue;
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) if (this.alpha(x + dx, y + dy) === 255) { add.push([x, y, mixc(this.get(x + dx, y + dy), INK, 0.62)]); break; }
    }
    for (const [x, y, c] of add) this.set(x, y, c);
  }
  /** 빈 칸에만 반투명 그림자를 깐다(윤곽선 뒤, 건물 아래) */
  shadow(pts: Pt[]) {
    const t = new Buf(this.w, this.h);
    t.poly(pts, INK);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (t.alpha(x, y) && this.alpha(x, y) === 0) this.set(x, y, [60, 40, 120], 84);
  }
  url() {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    cv.getContext('2d')!.putImageData(new ImageData(this.data, this.w, this.h), 0, 0);
    return cv.toDataURL('image/png');
  }
}

/** 타일 중심이 (ox, oy)에 오는 도트 캔버스 위의 아이소 투영 */
export class Scene {
  /** k: 가로·세로 배율(건물을 키울 때). 도트 한 칸의 크기는 그대로 두고 건물 자체를 키운다 */
  constructor(public b: Buf, public ox: number, public oy: number, public k = 1) {}
  pt = (x: number, y: number, z = 0): Pt => [this.ox + (x - y) * 16 * this.k, this.oy + (x + y) * 8 * this.k - z * this.k];
  poly(c: RGB, ...pts: [number, number, number][]) { this.b.poly(pts.map((p) => this.pt(...p)), c); }
  line(a: [number, number, number], b: [number, number, number], c: RGB) { const p = this.pt(...a), q = this.pt(...b); this.b.line(p[0], p[1], q[0], q[1], c); }
  box(x: number, y: number, z: number, w: number, d: number, h: number, m: Mat) {
    this.poly(m.left, [x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]);
    this.poly(m.right, [x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]);
    this.poly(m.top, [x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]);
  }
  /** 박공지붕: ridge 'x' = 마루가 x 방향. 앞 경사 + 박공 끝면 + 기와 줄 */
  gable(x: number, y: number, z: number, w: number, d: number, rh: number, ridge: 'x' | 'y', roof: string, wall: Mat, ov = 0.06) {
    const r = mat(roof), x0 = x - ov, x1 = x + w + ov, y0 = y - ov, y1 = y + d + ov, xm = x + w / 2, ym = y + d / 2;
    const dark = mixc(r.left, INK, 0.28), lite = mixc(r.top, WHITE, 0.2);
    if (ridge === 'x') {
      this.poly(wall.right, [x + w, y, z], [x + w, y + d, z], [x + w, ym, z + rh]);
      this.poly(r.left, [x0, y1, z], [x1, y1, z], [x1, ym, z + rh], [x0, ym, z + rh]);
      for (const t of [0.34, 0.67]) this.line([x0, y1 - t * (y1 - ym), z + t * rh], [x1, y1 - t * (y1 - ym), z + t * rh], dark);
      this.line([x0, y1, z], [x1, y1, z], mixc(r.left, INK, 0.45));
      this.line([x0, ym, z + rh], [x1, ym, z + rh], lite);
    } else {
      this.poly(wall.left, [x, y + d, z], [x + w, y + d, z], [xm, y + d, z + rh]);
      this.poly(r.right, [x1, y0, z], [x1, y1, z], [xm, y1, z + rh], [xm, y0, z + rh]);
      for (const t of [0.34, 0.67]) this.line([x1 - t * (x1 - xm), y0, z + t * rh], [x1 - t * (x1 - xm), y1, z + t * rh], mixc(r.right, INK, 0.28));
      this.line([x1, y0, z], [x1, y1, z], mixc(r.right, INK, 0.45));
      this.line([xm, y0, z + rh], [xm, y1, z + rh], lite);
    }
  }
  /** 한 박스의 앞 두 면 위에 도형을 놓는 도우미. u: 왼→오른 비율, zz: 높이(px) */
  face(x: number, y: number, z: number, w: number, d: number) {
    const fl = (u: number, zz: number) => this.pt(x + u * w, y + d, z + zz);
    const fr = (u: number, zz: number) => this.pt(x + w, y + d - u * d, z + zz);
    type F = typeof fl;
    const q = (f: F) => (u0: number, u1: number, z0: number, z1: number, c: RGB) => this.b.poly([f(u0, z0), f(u1, z0), f(u1, z1), f(u0, z1)], c);
    const l = (f: F) => (u0: number, z0: number, u1: number, z1: number, c: RGB) => { const a = f(u0, z0), b = f(u1, z1); this.b.line(a[0], a[1], b[0], b[1], c); };
    return { fl, fr, L: q(fl), R: q(fr), ll: l(fl), rl: l(fr) };
  }
  /** 사각뿔 지붕 */
  pyr(x: number, y: number, z: number, w: number, d: number, rh: number, roof: string, ov = 0.05) {
    const r = mat(roof), x0 = x - ov, x1 = x + w + ov, y0 = y - ov, y1 = y + d + ov, xm = x + w / 2, ym = y + d / 2;
    this.poly(r.left, [x0, y1, z], [x1, y1, z], [xm, ym, z + rh]);
    this.poly(r.right, [x1, y0, z], [x1, y1, z], [xm, ym, z + rh]);
    this.line([x1, y1, z], [xm, ym, z + rh], mixc(r.top, WHITE, 0.2));
    this.line([x0, y1, z], [x1, y1, z], mixc(r.left, INK, 0.45));
  }
  /** 원기둥(타원 쌓기) */
  cyl(cx: number, cy: number, r: number, z: number, h: number, side: RGB, top: RGB) {
    const [px, py] = this.pt(cx, cy, 0), rx = r * 22.6 * this.k, ry = r * 11.3 * this.k;
    for (let k = 0; k <= h; k++) this.b.ellipse(px, py - z - k, rx, ry, k === h ? top : mixc(side, PURPLE, 0.0));
    // 오른쪽 그늘 띠
    for (let k = 0; k < h; k++) this.b.line(px + rx - 1.5, py - z - k, px + rx - 0.5, py - z - k, mixc(side, PURPLE, 0.45));
  }
}

export interface Sprite { href: string; w: number; h: number; ox: number; oy: number; /** 그림이 시작되는 첫 줄(px) */ top: number }
const cache = new Map<string, Sprite>();
/** key로 한 번만 그린다. draw 안에서 s.b 로 직접 칠하거나 s.box / s.gable 등을 쓴다 */
export function sprite(key: string, w: number, h: number, ox: number, oy: number, draw: (s: Scene) => void, opt: { outline?: boolean; shadow?: Pt[]; post?: (s: Scene) => void; k?: number } = {}): Sprite {
  const hit = cache.get(key);
  if (hit) return hit;
  const b = new Buf(w, h), s = new Scene(b, ox, oy, opt.k ?? 1);
  draw(s);
  if (opt.outline !== false) b.outline();
  if (opt.shadow) b.shadow(opt.shadow.map(([x, y]) => s.pt(x, y)));
  opt.post?.(s);
  let top = 0;
  while (top < h && ![...Array(w).keys()].some((x) => b.alpha(x, top) > 0)) top++;
  const sp = { href: b.url(), w, h, ox, oy, top };
  cache.set(key, sp);
  return sp;
}
