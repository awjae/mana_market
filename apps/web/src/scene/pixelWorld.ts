import { Scene, mat, mixc, rgb, rng, sprite, type Mat, type RGB, type Sprite } from './pix';

const INK: RGB = rgb('#35244a'), PURPLE: RGB = [90, 70, 120], WHITE: RGB = [255, 255, 255];
const hex = rgb;
const lite = (c: RGB, t: number) => mixc(c, WHITE, t);
const h2 = (a: number, b: number) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/* ── 바닥 타일: 34×18 (한 칸 32×16 + 이웃과 겹치는 1칸 여유) ── */
export type GroundKind = 'grass' | 'road' | 'plaza' | 'dirt' | 'forest' | 'water' | 'sand' | 'farm' | 'gravel' | 'swamp' | 'boards';
const GP = {
  grass: { base: hex('#6c9a4f'), dark: hex('#58863f'), lite: hex('#82ae5d') },
  dirt: { base: hex('#8d7d62'), dark: hex('#7a6b52'), lite: hex('#9d8c70') },
  forest: { base: hex('#3f7a46'), dark: hex('#336a3c'), lite: hex('#52894f') },
  sand: { base: hex('#e0cd9a'), dark: hex('#cdb882'), lite: hex('#ecdcae') },
  gravel: { base: hex('#9a968f'), dark: hex('#7f7b76'), lite: hex('#b3afa6') },
  swamp: { base: hex('#4d6b3f'), dark: hex('#37583f'), lite: hex('#6b8a4a') },
  road: { stones: [hex('#aa9d88'), hex('#b4a790'), hex('#9d907a')], mortar: hex('#7e725f') },
  plaza: { stones: [hex('#cbc2ae'), hex('#d4cbb6'), hex('#c0b7a3')], mortar: hex('#9b927f') },
};
export function ground(kind: GroundKind, v: number): Sprite {
  return sprite(`g:${kind}:${v}`, 34, 18, 17, 9, (s) => {
    const r = rng(v * 977 + kind.length * 31 + 7);
    for (let y = 0; y < 18; y++) for (let x = 0; x < 34; x++) {
      if (Math.abs(x + 0.5 - 17) / 17 + Math.abs(y + 0.5 - 9) / 9 > 1) continue;
      let c: RGB;
      if (kind === 'water') {
        const q = r(); c = q < 0.08 ? hex('#3b84ae') : hex('#4a9ac4');
        if ((y + v) % 5 === 2 && ((x + v * 3) % 9 < 3)) c = hex('#8ac8e8'); // 잔물결
      } else if (kind === 'farm') {
        const row = Math.floor((y - x * 0.5 + 40) / 3) % 2;
        c = row ? hex('#8a6a3e') : hex('#d9b94e');
        if (!row && (x + y) % 3 === 0) c = hex('#ecd26a'); // 이삭
        if (row && r() < 0.08) c = hex('#74572f');
      } else if (kind === 'boards') {
        c = (x + y * 2 + v) % 6 === 0 ? hex('#6e4d32') : (Math.floor((y - x * 0.5 + 40) / 3) % 2 ? hex('#a37b4d') : hex('#94703f'));
      } else if (kind === 'swamp') {
        const q = r(); const p = GP.swamp; c = q < 0.14 ? hex('#3a5a4a') : q > 0.9 ? p.lite : p.base; if (q < 0.03) c = hex('#9acf6a');
      } else if (kind === 'road' || kind === 'plaza') {
        const bw = kind === 'plaza' ? 8 : 6, bh = kind === 'plaza' ? 4 : 3, ry = Math.floor(y / bh);
        const ux = x + (ry % 2) * (bw / 2) + v * 2, sxn = ux % bw;
        const p = GP[kind];
        c = sxn === bw - 1 || y % bh === bh - 1 ? p.mortar : p.stones[Math.floor(h2(ry + v * 3, Math.floor(ux / bw)) * 3)];
      } else {
        const p = GP[kind], q = r();
        c = q < 0.1 ? p.dark : q > 0.93 ? p.lite : p.base;
      }
      s.b.set(x, y, c);
    }
    if (kind === 'grass') for (let i = 0; i < 3; i++) { // 풀잎
      const x = 8 + Math.floor(r() * 18), y = 5 + Math.floor(r() * 8);
      if (Math.abs(x + 0.5 - 17) / 15 + Math.abs(y + 0.5 - 9) / 7 < 1) { s.b.set(x, y, GP.grass.lite); s.b.set(x, y - 1, GP.grass.lite); s.b.set(x + 1, y - 1, GP.grass.dark); }
    }
  }, { outline: false });
}

/* ── 집 ── */
export type HouseKind = 'timber' | 'stone' | 'thatch' | 'town';
export const PLASTER = ['#e8dcc0', '#dccaa0', '#d6c4a6', '#e2d4b4'];
export const STONE = ['#a6a095', '#9b958a', '#b3ab9c'];
export const ROOFS: Record<HouseKind, string[]> = {
  timber: ['#b4553a', '#a64b32', '#c0633f', '#5d6779'], stone: ['#5d6779', '#6a7385', '#6e4d38'], thatch: ['#c8a55a', '#bb9a52'], town: ['#b4553a', '#a64b32', '#5d6779', '#6a7385'],
};
/** v: 층수·문 위치 변주(0~3) */
export interface HouseOpt { kind: HouseKind; wall: number; roof: number; ridge: 'x' | 'y'; seed: number; v: number }

export function house(o: HouseOpt): Sprite {
  const key = `h:${o.kind}:${o.wall}:${o.roof}:${o.ridge}:${o.v}:${o.seed % 3}`;
  return sprite(key, 48, 72, 24, 58, (s) => drawHouse(s, o), { shadow: [[-0.4, -0.4], [0.85, -0.3], [0.85, 0.5], [-0.4, 0.4]] });
}

function drawHouse(s: Scene, o: HouseOpt) {
  const rnd = rng(o.seed * 7919 + o.wall * 31 + o.roof);
  const T = hex('#4a3224'), shut = hex('#6b4a32'), door = hex('#5c3f2c');
  const wallHex = o.kind === 'stone' ? STONE[o.wall % STONE.length] : PLASTER[o.wall % PLASTER.length];
  const M = mat(wallHex);
  const half = o.kind === 'town' ? 0.32 : 0.4;
  const tall = o.v >= 2, flipDoor = o.v % 2 === 1;
  const floors = o.kind === 'timber' ? (tall ? [13, 13, 12] : [13, 13]) : o.kind === 'stone' ? (tall ? [14, 12] : [22]) : o.kind === 'thatch' ? (tall ? [18] : [15]) : tall ? [12, 12] : [12, 12, 12];
  let z = 0, last = { bx: 0, by: 0, bw: 0, bd: 0 };
  floors.forEach((fh, i) => {
    const grow = o.kind === 'timber' && i === 1 ? 0.05 : 0;
    const bx = -half - grow, by = -half - grow, bw = half * 2 + grow * 2, bd = bw;
    s.box(bx, by, z, bw, bd, fh, M);
    const fl = (u: number, zz: number) => s.pt(bx + u * bw, by + bd, z + zz);
    const fr = (u: number, zz: number) => s.pt(bx + bw, by + bd - u * bd, z + zz);
    const Lq = (u0: number, u1: number, z0: number, z1: number, c: RGB) => s.b.poly([fl(u0, z0), fl(u1, z0), fl(u1, z1), fl(u0, z1)], c);
    const Rq = (u0: number, u1: number, z0: number, z1: number, c: RGB) => s.b.poly([fr(u0, z0), fr(u1, z0), fr(u1, z1), fr(u0, z1)], c);
    // 목골: 기둥·보·대각 가새
    if (o.kind === 'timber' || o.kind === 'town') {
      for (const f of [fl, fr]) {
        for (const u of [0, 0.5, 1]) { const a = f(u, 0), b = f(u, fh); s.b.line(a[0], a[1], b[0], b[1], T); }
        for (const zz of [0, fh]) { const a = f(0, zz), b = f(1, zz); s.b.line(a[0], a[1], b[0], b[1], T); }
        const a = f(0, fh * 0.5), b = f(0.5, fh); s.b.line(a[0], a[1], b[0], b[1], T);
      }
    }
    // 돌 줄눈
    if (o.kind === 'stone') for (const f of [fl, fr]) for (let zz = 4; zz < fh; zz += 4) { const a = f(0, zz), b = f(1, zz); s.b.line(a[0], a[1], b[0], b[1], mixc(M.left, INK, 0.25)); }
    // 창: 불 켜진 창/푸른 유리
    const glass = (side: 'L' | 'R') => (rnd() < 0.55 ? (side === 'L' ? hex('#f4d67e') : mixc(hex('#f4d67e'), PURPLE, 0.35)) : side === 'L' ? hex('#7fa1c4') : mixc(hex('#7fa1c4'), PURPLE, 0.4));
    const wz0 = 4, wz1 = Math.min(fh - 3, 10);
    if (i === 0) {
      const d0 = flipDoor ? 0.2 : 0.56, w0 = flipDoor ? 0.64 : 0.12;
      Lq(d0, d0 + 0.24, 0, Math.min(9, fh - 2), door); Lq(d0, d0 + 0.24, 8, 9, mixc(door, WHITE, 0.25)); // 문
      Lq(w0, w0 + 0.22, wz0, wz1, glass('L')); Lq(w0 - 0.02, w0, wz0, wz1, shut); Lq(w0 + 0.22, w0 + 0.24, wz0, wz1, shut);
    } else { Lq(0.14, 0.36, wz0, wz1, glass('L')); Lq(0.62, 0.84, wz0, wz1, glass('L')); Lq(0.12, 0.14, wz0, wz1, shut); Lq(0.36, 0.38, wz0, wz1, shut); }
    Rq(0.2, 0.42, wz0, wz1, glass('R')); Rq(0.6, 0.82, wz0, wz1, glass('R'));
    z += fh; last = { bx, by, bw, bd };
  });
  const rh = o.kind === 'thatch' ? 13 : o.kind === 'town' ? 14 : 10 + (o.seed % 3);
  const roofHex = ROOFS[o.kind][o.roof % ROOFS[o.kind].length];
  s.gable(last.bx, last.by, z, last.bw, last.bd, rh, o.ridge, roofHex, M, o.kind === 'thatch' ? 0.12 : 0.06);
  if (o.kind !== 'thatch' && rnd() > 0.45) { // 굴뚝은 용마루 위에 얹는다
    const cm = mat('#8a847a');
    if (o.ridge === 'x') s.box(0.12, -0.07, z + rh - 2, 0.14, 0.14, 8, cm); else s.box(-0.07, 0.1, z + rh - 2, 0.14, 0.14, 8, cm);
  }
}

/* ── 나무 ── */
export function tree(v: number): Sprite {
  return sprite(`t:${v}`, 40, 54, 20, 44, (s) => {
    const b = s.b;
    if (v === 2) { // 전나무
      b.rect(19, 34, 2, 10, hex('#7a5230'));
      const g = hex('#3f7a52');
      [[34, 12, 10], [26, 10, 9], [19, 8, 8], [12, 6, 7]].forEach(([y, hw, hh], k) => {
        b.poly([[20 - hw, y], [20 + hw, y], [20, y - hh - 2]], mixc(g, PURPLE, 0.25));
        b.poly([[20 - hw, y], [20, y], [20, y - hh - 2]], mixc(g, WHITE, 0.12 + k * 0.03));
      });
      return;
    }
    const g = hex(v === 0 ? '#4d8a47' : '#5f9a4a');
    b.rect(19, 30, 2, 14, hex('#7a5230')); b.rect(20, 30, 1, 14, hex('#5e3d25'));
    const discs: [number, number, number][] = [[20, 24, 10], [13, 28, 7], [27, 28, 7.5], [20, 15, 7]];
    for (const [x, y, r] of discs) b.ellipse(x, y, r, r, mixc(g, PURPLE, 0.38));
    for (const [x, y, r] of discs) b.ellipse(x - 1.5, y - 1.5, r - 1.8, r - 1.8, g);
    for (const [x, y, r] of discs) b.ellipse(x - 3, y - 3, r * 0.45, r * 0.45, mixc(g, WHITE, 0.3));
    const r = rng(v + 91);
    for (let i = 0; i < 9; i++) b.set(10 + Math.floor(r() * 20), 12 + Math.floor(r() * 20), mixc(g, WHITE, 0.45));
  }, { shadow: [[-0.1, -0.1], [0.95, -0.05], [0.95, 0.5], [-0.1, 0.4]] });
}

/* ── 가로등 ── */
export function lamp(festival = false): Sprite {
  return sprite(festival ? 'lamp-fest' : 'lamp', 24, 48, 12, 40, (s) => {
    const dark = hex('#3d3540');
    s.b.rect(11, 14, 2, 26, dark);
    if (!festival) { s.b.rect(9, 10, 6, 6, hex('#ffe9a0')); s.b.rect(9, 8, 6, 2, dark); s.b.rect(11, 6, 2, 2, dark); return; }
    // 연말 축제: 붉은 종이등과 양옆으로 늘어진 삼각 깃발
    s.b.rect(8, 9, 8, 7, hex('#ff6b5a')); s.b.rect(9, 8, 6, 1, dark); s.b.rect(9, 16, 6, 1, dark); s.b.rect(11, 10, 2, 5, hex('#ffe9a0')); s.b.rect(11, 6, 2, 2, dark);
    for (let i = 0; i < 4; i++) { const c = hex(['#ffc13b', '#ff8fb8', '#3fb8ff', '#6fcf4a'][i]); s.b.rect(1 + i * 2, 18 + i % 2, 2, 3 - (i % 2), c); s.b.rect(15 + i * 2, 18 + (i + 1) % 2, 2, 3 - ((i + 1) % 2), c); }
  }, { shadow: [[0, 0], [0.5, 0.05], [0.5, 0.2], [0, 0.15]], post: (s) => {
    for (let y = 0; y < 48; y++) for (let x = 0; x < 24; x++) if (s.b.alpha(x, y) === 0 && Math.hypot(x + 0.5 - 12, y + 0.5 - 14) < 9) s.b.set(x, y, festival ? [255, 150, 130] : [255, 226, 130], 64);
  } });
}

/* ── 기부로 생기는 마을 장식: 깃발, 등롱 ── */
export function banner(v: number): Sprite {
  const cols = ['#e8432e', '#3fb8ff', '#ffc13b', '#6fcf4a'];
  return sprite(`banner:${v}`, 24, 46, 8, 40, (s) => {
    const dark = hex('#3d3540'), c = hex(cols[v % 4]);
    s.b.rect(7, 6, 2, 34, dark); s.b.rect(6, 4, 4, 3, hex('#ffd25a'));
    s.b.rect(9, 8, 10, 11, c); s.b.rect(9, 8, 10, 3, lite(c, 0.35)); s.b.rect(12, 19, 4, 2, c); s.b.rect(13, 21, 2, 1, c);
    s.b.rect(13, 12, 2, 5, hex('#fff6e0'));
  }, { shadow: [[0, 0], [0.5, 0.05], [0.5, 0.2], [0, 0.15]] });
}
export function lantern(): Sprite {
  return sprite('lantern', 28, 46, 10, 40, (s) => {
    const dark = hex('#3d3540');
    s.b.rect(9, 10, 2, 30, dark); s.b.rect(9, 8, 12, 2, dark);
    s.b.rect(17, 10, 1, 2, dark); s.b.rect(15, 12, 6, 8, hex('#ff6b5a')); s.b.rect(15, 11, 6, 1, dark); s.b.rect(15, 20, 6, 1, dark); s.b.rect(17, 14, 2, 4, hex('#ffe9a0'));
  }, { shadow: [[0, 0], [0.5, 0.05], [0.5, 0.2], [0, 0.15]], post: (s) => {
    for (let y = 0; y < 46; y++) for (let x = 0; x < 28; x++) if (s.b.alpha(x, y) === 0 && Math.hypot(x + 0.5 - 18, y + 0.5 - 16) < 8) s.b.set(x, y, [255, 150, 130], 60);
  } });
}

/* ── 분수 ── */
export function fountain(): Sprite {
  return sprite('fountain', 80, 66, 40, 46, (s) => {
    const stone = hex('#b3ab9c'), water = hex('#7ab7cf'), [px, py] = s.pt(0, 0, 0);
    s.cyl(0, 0, 1.35, 0, 7, stone, mixc(stone, WHITE, 0.3));
    s.b.ellipse(px, py - 7, 1.35 * 22.6 - 3.5, 1.35 * 11.3 - 2, water);
    s.b.ellipse(px - 6, py - 8, 8, 3, mixc(water, WHITE, 0.35));
    s.cyl(0, 0, 0.2, 7, 14, hex('#b3ab9c'), mixc(stone, WHITE, 0.3));
    s.cyl(0, 0, 0.62, 21, 3, stone, mixc(water, WHITE, 0.2));
    for (let k = 0; k < 9; k++) s.b.set(px, py - 25 - k, mixc(water, WHITE, 0.55));
    for (const [dx, dy] of [[-3, -33], [3, -33], [-5, -30], [5, -30], [-2, -35], [2, -35]]) s.b.set(px + dx, py + dy, mixc(water, WHITE, 0.7));
  }, { shadow: [[-1.2, -1.2], [1.9, -1.1], [1.9, 1.5], [-1.2, 1.3]] });
}

/* ── 빈 터: 덤불, 꽃밭 ── */
export function bush(v: number): Sprite {
  return sprite(`bush:${v}`, 36, 26, 18, 18, (s) => {
    const g = hex(v ? '#5a9a46' : '#4d8a47'), b = s.b;
    for (const [x, y, r] of [[13, 14, 7], [22, 15, 7], [18, 10, 6.5]] as [number, number, number][]) b.ellipse(x, y, r, r - 1, mixc(g, PURPLE, 0.35));
    for (const [x, y, r] of [[13, 14, 7], [22, 15, 7], [18, 10, 6.5]] as [number, number, number][]) b.ellipse(x - 1, y - 1.2, r - 1.8, r - 2.6, g);
    b.ellipse(15, 8, 2.6, 1.6, mixc(g, WHITE, 0.3));
    const r = rng(v + 5);
    for (let i = 0; i < 4; i++) b.set(10 + Math.floor(r() * 16), 9 + Math.floor(r() * 9), hex(['#e84a5f', '#ffd25a', '#fff'][i % 3])); // 열매·꽃
  }, { shadow: [[-0.25, -0.2], [0.7, -0.15], [0.7, 0.4], [-0.25, 0.35]] });
}
export function flowers(v: number): Sprite {
  return sprite(`flowers:${v}`, 36, 22, 18, 14, (s) => {
    const r = rng(v * 13 + 3), cols = ['#ff8fb8', '#ffd25a', '#fff6e0', '#a98bff'];
    for (let i = 0; i < 9; i++) {
      const x = 7 + Math.floor(r() * 22), y = 6 + Math.floor(r() * 9);
      if (Math.abs(x - 18) / 13 + Math.abs(y - 11) / 6 > 1) continue;
      const c = hex(cols[Math.floor(r() * cols.length)]);
      s.b.set(x, y, c); s.b.set(x + 1, y, c); s.b.set(x, y - 1, c); s.b.set(x, y + 1, hex('#4d8a47'));
    }
  }, { outline: false });
}

/* ── 풍경 소품 ── */
export function rock(v: number): Sprite {
  return sprite(`rock:${v}`, 36, 28, 18, 20, (s) => {
    const g = hex(v ? '#6f6a66' : '#8d8984'), b = s.b;
    b.poly([[8, 18], [11, 9], [19, 5], [27, 10], [30, 18], [20, 22]], mixc(g, PURPLE, 0.3));
    b.poly([[8, 18], [11, 9], [19, 5], [20, 14], [19, 21]], lite(g, 0.18));
    b.poly([[19, 5], [27, 10], [20, 14]], lite(g, 0.32));
    if (v) for (const [x, y] of [[14, 12], [22, 14], [18, 17]]) { b.set(x, y, hex('#c9703a')); b.set(x + 1, y, hex('#e8a05a')); } // 철광석 줄기
  }, { shadow: [[-0.3, -0.2], [0.7, -0.15], [0.7, 0.4], [-0.3, 0.35]] });
}
/** 던전 입구: 바위 언덕에 뚫린 어두운 동굴, 나무 틀과 양옆 횃불. 눈에 띄도록 일반 바위보다 훨씬 크다 */
export function cave(): Sprite {
  return sprite('cave', 72, 60, 36, 50, (s) => {
    const b = s.b, g = hex('#7d7873'), dark = hex('#1b1226'), wood = hex('#7a5a3c');
    b.poly([[3, 50], [7, 28], [18, 12], [34, 5], [52, 11], [64, 27], [69, 50], [36, 57]], mixc(g, PURPLE, 0.3));
    b.poly([[3, 50], [7, 28], [18, 12], [34, 5], [30, 30], [36, 57]], lite(g, 0.16));
    b.poly([[18, 12], [34, 5], [52, 11], [40, 20]], lite(g, 0.34));
    for (const [x, y] of [[14, 24], [54, 22], [60, 38], [10, 40], [44, 14]]) { b.rect(x, y, 3, 2, mixc(g, PURPLE, 0.55)); }
    b.ellipse(36, 41, 13, 14, dark); b.rect(23, 41, 27, 14, dark);
    b.ellipse(36, 47, 6, 7, hex('#4a2418')); b.ellipse(36, 50, 3, 3, hex('#8a3a1c'));
    b.rect(21, 27, 3, 29, wood); b.rect(49, 27, 3, 29, wood); b.rect(19, 24, 35, 4, mixc(wood, WHITE, 0.15));
    b.rect(20, 25, 33, 1, lite(wood, 0.35));
    for (const x of [14, 57]) { b.rect(x, 33, 2, 13, hex('#5a4030')); b.ellipse(x + 1, 31, 2.4, 3.4, hex('#e8662a')); b.ellipse(x + 1, 31.5, 1.2, 2, hex('#ffd04a')); }
    b.rect(30, 20, 13, 4, hex('#d8d0b8')); b.set(32, 21, dark); b.set(36, 21, dark); b.set(40, 21, dark); // 간판 대신 뼈 표식
  });
}
/** 성당: 직업을 내려 주는 곳. 흰 돌벽에 푸른 지붕, 가운데 종탑과 별 문양 */
export function temple(): Sprite {
  return sprite('temple', 76, 70, 38, 62, (s) => {
    const b = s.b, stone = hex('#e8e2f0'), roof = hex('#4a6fd0'), dark = hex('#2a1f38'), gold = hex('#ffc13b');
    b.rect(8, 34, 60, 26, mixc(stone, PURPLE, 0.12)); b.rect(8, 34, 8, 26, lite(stone, 0.12)); b.rect(8, 56, 60, 4, mixc(stone, PURPLE, 0.4));
    b.poly([[4, 36], [38, 20], [72, 36], [38, 40]], roof); b.poly([[4, 36], [38, 20], [38, 40]], lite(roof, 0.2));
    b.rect(28, 8, 20, 36, mixc(stone, PURPLE, 0.08)); b.rect(28, 8, 6, 36, lite(stone, 0.14));
    b.poly([[26, 10], [38, 0], [50, 10]], roof); b.poly([[26, 10], [38, 0], [38, 10]], lite(roof, 0.25));
    b.ellipse(38, 18, 4.5, 4.5, dark); b.ellipse(38, 18, 3, 3, gold); b.set(38, 18, hex('#fff2b8'));
    b.rect(32, 28, 12, 4, dark); b.rect(33, 29, 10, 2, hex('#6a5a8a'));
    b.ellipse(38, 52, 7, 8, dark); b.rect(31, 52, 14, 8, dark); b.rect(32, 53, 12, 6, hex('#7a4a8a'));
    for (const x of [14, 56]) { b.rect(x, 42, 6, 12, dark); b.ellipse(x + 3, 42, 3, 3, dark); b.rect(x + 1, 44, 4, 9, hex('#9ad0ff')); }
    b.rect(36, 3, 3, 1, gold); b.rect(37, 0, 1, 4, gold);
  });
}
export function fence(o: 'x' | 'y'): Sprite {
  return sprite(`fence:${o}`, 40, 28, 20, 20, (s) => {
    const m = mat('#8a6a48');
    for (const t of [-0.5, 0, 0.5]) { const [x, y] = o === 'x' ? [t, 0] : [0, t]; s.box(x - 0.05, y - 0.05, 0, 0.1, 0.1, 10, m); }
    for (const z of [3, 7]) { if (o === 'x') s.box(-0.5, -0.03, z, 1, 0.06, 1.6, m); else s.box(-0.03, -0.5, z, 0.06, 1, 1.6, m); }
  });
}
export function hay(): Sprite {
  return sprite('hay', 32, 30, 16, 22, (s) => { s.cyl(0, 0, 0.26, 0, 9, hex('#cfae5e'), hex('#e0c47a')); s.pyr(-0.14, -0.14, 9, 0.28, 0.28, 6, '#cfae5e', 0); const [x, y] = s.pt(0, 0, 4); s.b.line(x - 4, y, x + 4, y, hex('#a98a3e')); }, { shadow: [[-0.25, -0.2], [0.7, -0.15], [0.7, 0.35], [-0.25, 0.3]] });
}
export function scarecrow(): Sprite {
  return sprite('scarecrow', 28, 40, 14, 32, (s) => {
    const b = s.b, [x, y] = s.pt(0, 0, 0), w = hex('#7a5a40');
    b.rect(x, y - 16, 1, 16, w); b.rect(x - 5, y - 13, 11, 1, w); b.rect(x - 2, y - 11, 5, 5, hex('#c9703a')); b.ellipse(x + 0.5, y - 19, 3, 3, hex('#e8d9a8')); b.poly([[x - 4, y - 20], [x + 5, y - 20], [x + 0.5, y - 26]], hex('#6b4a8a'));
    b.set(x - 1, y - 19, hex('#35244a')); b.set(x + 2, y - 19, hex('#35244a'));
  });
}
export function boat(v: number): Sprite {
  return sprite(`boat:${v}`, 44, 34, 22, 24, (s) => {
    const b = s.b, [x, y] = s.pt(0, 0, 0), w = hex('#8a5a35');
    b.poly([[x - 10, y - 4], [x + 10, y - 4], [x + 6, y + 2], [x - 6, y + 2]], w); b.poly([[x - 10, y - 4], [x + 10, y - 4], [x + 9, y - 6], [x - 9, y - 6]], hex('#b07a4a'));
    b.rect(x, y - 20, 1, 15, hex('#6b4a32')); b.poly([[x + 1, y - 19], [x + 1, y - 7], [x + 9, y - 7]], hex('#f1e6cc')); b.poly([[x - 1, y - 17], [x - 1, y - 7], [x - 7, y - 7]], hex(v ? '#d9453a' : '#e8dcc0'));
  }, { shadow: [[-0.4, -0.1], [0.8, 0], [0.8, 0.5], [-0.4, 0.4]] });
}
export function mushroom(v: number): Sprite {
  return sprite(`mush:${v}`, 24, 22, 12, 16, (s) => {
    const b = s.b, [x, y] = s.pt(0, 0, 0), cap = hex(['#d9453a', '#b06cff', '#ffc13b'][v % 3]);
    b.rect(x - 1, y - 5, 3, 5, hex('#efe4c8')); b.ellipse(x + 0.5, y - 7, 5, 3.4, cap); b.set(x - 2, y - 8, WHITE); b.set(x + 2, y - 7, WHITE); b.set(x, y - 9, WHITE);
  });
}
export function dummy(): Sprite {
  return sprite('dummy', 28, 40, 14, 32, (s) => {
    const b = s.b, [x, y] = s.pt(0, 0, 0), w = hex('#7a5a40');
    b.rect(x, y - 15, 2, 15, w); b.rect(x - 5, y - 13, 12, 2, w); b.rect(x - 3, y - 17, 8, 7, hex('#d9b95e')); b.ellipse(x + 1, y - 21, 3.4, 3.4, hex('#d9b95e'));
    b.rect(x - 2, y - 16, 6, 1, hex('#b8352b')); b.set(x - 1, y - 21, hex('#35244a')); b.set(x + 2, y - 21, hex('#35244a'));
  }, { shadow: [[-0.1, -0.1], [0.6, -0.05], [0.6, 0.3], [-0.1, 0.25]] });
}
export function cow(v: number): Sprite {
  return sprite(`cow:${v}`, 34, 26, 17, 18, (s) => {
    s.box(-0.28, -0.12, 3, 0.5, 0.26, 7, mat(v ? '#f4f1e8' : '#e9c9a0'));
    s.box(0.2, -0.1, 7, 0.2, 0.2, 5, mat(v ? '#e9e6dc' : '#d9b78c')); s.box(0.34, -0.04, 7, 0.06, 0.12, 2, mat('#2a2830'));
    for (const [x, y] of [[-0.24, 0.1], [0.22, 0.1], [-0.24, -0.1], [0.22, -0.1]]) s.box(x - 0.03, y - 0.03, 0, 0.06, 0.06, 3, mat('#4a4048'));
    const [px, py] = s.pt(-0.05, 0.05, 10); s.b.rect(px - 2, py, 3, 2, hex('#2a2830'));
  }, { shadow: [[-0.3, -0.2], [0.6, -0.1], [0.6, 0.35], [-0.3, 0.3]] });
}

/* ── 동물(돌아다니는 NPC): 발밑 중심이 (ox, oy) ── */
export type AnimalKind = 'chicken' | 'sheep' | 'dog' | 'cat' | 'duck' | 'gull';
export function animal(kind: AnimalKind, v = 0): Sprite {
  return sprite(`animal:${kind}:${v}`, 28, 24, 14, 20, (s) => {
    const b = s.b, X = 14, Y = 20, w = hex('#f4f1e8'), ink = hex('#35244a');
    if (kind === 'chicken') {
      b.ellipse(X, Y - 6, 5, 4, w); b.poly([[X - 5, Y - 7], [X - 8, Y - 12], [X - 4, Y - 10]], mixc(w, PURPLE, 0.2)); b.ellipse(X + 4, Y - 11, 2.6, 2.6, w);
      b.set(X + 4, Y - 14, hex('#d9453a')); b.set(X + 5, Y - 14, hex('#d9453a')); b.set(X + 7, Y - 11, hex('#ffb23b')); b.set(X + 5, Y - 11, ink);
      b.rect(X - 1, Y - 3, 1, 3, hex('#ffb23b')); b.rect(X + 2, Y - 3, 1, 3, hex('#ffb23b'));
    } else if (kind === 'sheep') {
      for (const [dx, dy, r] of [[-3, -8, 4], [2, -9, 4.4], [-1, -5, 4], [4, -5, 3.4]] as [number, number, number][]) b.ellipse(X + dx, Y + dy, r, r, mixc(w, PURPLE, 0.12));
      for (const [dx, dy, r] of [[-3, -9, 3], [2, -10, 3.4]] as [number, number, number][]) b.ellipse(X + dx, Y + dy, r, r, w);
      b.ellipse(X + 7, Y - 8, 2.6, 2.8, hex('#4a4048')); b.set(X + 8, Y - 9, WHITE);
      b.rect(X - 4, Y - 3, 1, 3, hex('#4a4048')); b.rect(X + 3, Y - 3, 1, 3, hex('#4a4048'));
    } else if (kind === 'dog') {
      const c = hex(v ? '#d9a050' : '#8a5a35');
      b.ellipse(X - 1, Y - 6, 6, 3.6, c); b.ellipse(X + 6, Y - 9, 3, 3, c); b.rect(X + 8, Y - 8, 2, 2, mixc(c, PURPLE, 0.3)); b.set(X + 7, Y - 10, ink);
      b.poly([[X + 4, Y - 12], [X + 6, Y - 12], [X + 5, Y - 9]], mixc(c, PURPLE, 0.4)); b.poly([[X - 6, Y - 8], [X - 9, Y - 11], [X - 7, Y - 6]], c);
      for (const dx of [-5, -1, 2, 5]) b.rect(X + dx, Y - 3, 1, 3, mixc(c, PURPLE, 0.35));
    } else if (kind === 'cat') {
      const c = hex(v ? '#e89a4a' : '#8a8a98');
      b.ellipse(X, Y - 5, 5, 3.4, c); b.ellipse(X + 5, Y - 8, 3, 2.8, c); b.poly([[X + 3, Y - 11], [X + 5, Y - 11], [X + 4, Y - 9]], c); b.poly([[X + 6, Y - 11], [X + 8, Y - 11], [X + 7, Y - 9]], c);
      b.set(X + 6, Y - 8, hex('#9ae6a0')); b.poly([[X - 5, Y - 6], [X - 9, Y - 12], [X - 8, Y - 6]], mixc(c, PURPLE, 0.2));
      for (const dx of [-3, 2]) b.rect(X + dx, Y - 3, 1, 3, mixc(c, PURPLE, 0.35));
    } else if (kind === 'duck') {
      b.ellipse(X, Y - 4, 5, 3.2, w); b.ellipse(X + 4, Y - 8, 2.8, 2.8, hex('#4f9a58')); b.poly([[X + 6, Y - 8], [X + 9, Y - 7], [X + 6, Y - 6]], hex('#ffb23b')); b.set(X + 4, Y - 9, ink);
      b.poly([[X - 5, Y - 5], [X - 7, Y - 8], [X - 3, Y - 6]], mixc(w, PURPLE, 0.2));
    } else { // gull
      b.poly([[X, Y - 6], [X - 9, Y - 11], [X - 5, Y - 5]], w); b.poly([[X, Y - 6], [X + 9, Y - 11], [X + 5, Y - 5]], mixc(w, PURPLE, 0.15)); b.ellipse(X, Y - 5, 3, 2.4, w); b.set(X + 3, Y - 6, hex('#ffb23b'));
    }
  }, { shadow: kind === 'gull' ? undefined : [[-0.2, -0.1], [0.4, -0.1], [0.4, 0.2], [-0.2, 0.2]] });
}

/* ── 소품 ── */
export function well(): Sprite {
  return sprite('well', 36, 44, 18, 34, (s) => {
    const stone = hex('#a6a095'), wood = hex('#7a5a40'), [px, py] = s.pt(0, 0, 0);
    s.b.rect(px - 7, py - 19, 1, 14, wood); s.b.rect(px + 6, py - 19, 1, 14, wood);
    s.cyl(0, 0, 0.3, 0, 5, stone, mixc(stone, WHITE, 0.25));
    s.b.ellipse(px, py - 5, 4.6, 2.4, hex('#3f6a80'));
    s.b.poly([[px - 10, py - 18], [px, py - 25], [px + 10, py - 18]], hex('#7a5a40'));
    s.b.poly([[px, py - 25], [px + 10, py - 18], [px, py - 18]], hex('#5e4430'));
  }, { shadow: [[-0.3, -0.3], [0.8, -0.25], [0.8, 0.4], [-0.3, 0.3]] });
}
export function stall(v: number): Sprite {
  return sprite(`stall:${v}`, 48, 44, 24, 34, (s) => {
    const col = hex(['#a8482e', '#4a6a82', '#7f9d80'][v % 3]), cream = hex('#efe4c8'), wood = hex('#7a5a40');
    s.box(-0.38, 0, 0, 0.76, 0.3, 7, mat('#8a6a48'));
    for (const x of [-0.36, 0.34]) s.line([x, 0.3, 0], [x, 0.3, 14], wood);
    [0.15, 0.3, 0.5, 0.68].forEach((u, i) => { const [x, y] = s.pt(-0.38 + 0.76 * u, 0.12, 8); s.b.rect(x - 1, y - 1, 3, 2, hex(['#c0452e', '#cfae5e', '#7a9a4a', '#c0452e'][i])); });
    for (let i = 0; i < 6; i++) { const x0 = -0.38 + i * 0.127, x1 = x0 + 0.127; s.poly(i % 2 ? cream : col, [x0, -0.1, 21], [x1, -0.1, 21], [x1, 0.34, 14], [x0, 0.34, 14]); }
  }, { shadow: [[-0.4, -0.1], [0.85, 0], [0.85, 0.55], [-0.4, 0.4]] });
}
export function cart(): Sprite {
  return sprite('cart', 40, 36, 20, 26, (s) => {
    s.box(-0.3, -0.2, 4, 0.6, 0.4, 5, mat('#8a6a48'));
    const [px, py] = s.pt(0, 0, 13);
    s.b.ellipse(px, py, 8, 4.6, hex('#cfae5e')); s.b.ellipse(px - 2, py - 1.5, 5, 2.6, hex('#e0c47a'));
    const [wx, wy] = s.pt(0.3, 0.05, 4), [vx, vy] = s.pt(-0.12, 0.2, 4);
    s.b.ellipse(wx, wy, 3, 4.6, hex('#4a3224')); s.b.ellipse(wx, wy, 1, 1.4, hex('#8a6a48'));
    s.b.ellipse(vx, vy, 4.6, 3, hex('#4a3224')); s.b.ellipse(vx, vy, 1.4, 1, hex('#8a6a48'));
  }, { shadow: [[-0.3, -0.2], [0.8, -0.1], [0.8, 0.5], [-0.3, 0.4]] });
}
export function barrels(): Sprite {
  return sprite('barrels', 36, 30, 18, 22, (s) => {
    for (const [cx, cy] of [[-0.15, 0.05], [0.2, 0.15]]) {
      s.cyl(cx, cy, 0.2, 0, 8, hex('#8d6a3a'), hex('#b08650'));
      const [px, py] = s.pt(cx, cy, 0);
      for (const k of [2, 6]) s.b.line(px - 3.6, py - k, px + 3.6, py - k, hex('#5a4630'));
    }
  }, { shadow: [[-0.35, -0.1], [0.7, 0], [0.7, 0.5], [-0.35, 0.4]] });
}

import { castleSprite } from './pixelGuilds';
export const castleSpriteLazy = () => castleSprite();
export type { Mat };
