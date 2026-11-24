import { Scene, mat, mixc, rgb, sprite, type RGB, type Sprite } from './pix';

/** 거래할 수 있는 길드 10종과 왕국 성: 뒷배경 집보다 크고 채도 높게, 업종이 한눈에 보이는 소품을 단다 */
const hex = rgb, PURPLE: RGB = [90, 70, 120], WHITE: RGB = [255, 255, 255];
const LIT = hex('#ffe08a'), DARK = hex('#2a2024'), WOOD = hex('#7a5a40'), CREAM = hex('#efe4c8');
const shade = (c: RGB, t = 0.3) => mixc(c, PURPLE, t);
const lite = (c: RGB, t = 0.3) => mixc(c, WHITE, t);

/** 빈 칸에만 반투명 번짐(연기·빛) */
const glow = (s: Scene, x: number, y: number, z: number, r: number, c: RGB, a: number) => {
  const [px, py] = s.pt(x, y, z);
  for (let j = Math.floor(py - r); j <= Math.ceil(py + r); j++) for (let i = Math.floor(px - r); i <= Math.ceil(px + r); i++)
    if (s.b.alpha(i, j) === 0 && Math.hypot(i + 0.5 - px, j + 0.5 - py) <= r) s.b.set(i, j, c, a);
};
const flag = (s: Scene, x: number, y: number, z: number, len: number, c: RGB) => {
  s.line([x, y, z], [x, y, z + len], hex('#4a3224'));
  s.poly(c, [x, y, z + len], [x, y + 0.3, z + len - 3], [x, y, z + len - 7]);
};
const lines = (_s: Scene, f: ReturnType<Scene['face']>, zs: number[], c: RGB) => zs.forEach((z) => { f.ll(0, z, 1, z, c); f.rl(0, z, 1, z, c); });

const iron = (s: Scene) => {
  const m = mat('#9a968f'), f = s.face(-0.45, -0.45, 0, 0.9, 0.9);
  s.box(-0.45, -0.45, 0, 0.9, 0.9, 18, m);
  lines(s, f, [5, 10, 15], shade(m.left, 0.25));
  f.L(0.12, 0.54, 0, 14, DARK); f.L(0.17, 0.49, 0, 11, hex('#ff7a1a')); f.L(0.24, 0.42, 0, 7, hex('#ffd25a')); // 용광로
  f.L(0.66, 0.88, 8, 14, LIT); f.R(0.3, 0.62, 8, 14, shade(LIT, 0.3));
  s.gable(-0.45, -0.45, 18, 0.9, 0.9, 9, 'x', '#58637a', m, 0.07);
  s.box(0.14, -0.1, 25, 0.22, 0.22, 13, mat('#6b665f'));
  s.b.rect(...s.pt(0.14, -0.1, 38).map(Math.round) as [number, number], 1, 1, hex('#ff8a1f')); // 굴뚝 불씨
  s.box(0.02, 0.47, 0, 0.26, 0.12, 5, mat('#4a4540')); s.box(0.08, 0.49, 5, 0.14, 0.08, 2, mat('#5a5550')); // 모루
  flag(s, -0.4, 0.4, 18, 16, hex('#d9453a'));
};
const merc = (s: Scene) => {
  const m = mat('#b98a58'), f = s.face(-0.45, -0.45, 0, 0.9, 0.9);
  s.box(-0.45, -0.45, 0, 0.9, 0.9, 20, m);
  lines(s, f, [10], shade(m.left, 0.3));
  s.gable(-0.45, -0.45, 20, 0.9, 0.9, 10, 'y', '#b5392b', m, 0.07);
  f.L(0.3, 0.55, 0, 12, DARK); f.R(0.3, 0.6, 9, 16, shade(LIT, 0.3));
  f.L(0.66, 0.9, 7, 17, hex('#e6c25a')); f.L(0.69, 0.87, 8, 16, hex('#b8352b')); f.ll(0.69, 8, 0.87, 16, hex('#e6c25a')); f.ll(0.69, 16, 0.87, 8, hex('#e6c25a')); // 방패 문장
  for (let i = 0; i < 6; i++) { const x = -0.42 + i * 0.17; s.line([x, 0.55, 0], [x, 0.55, 11], WOOD); s.b.set(...(s.pt(x, 0.55, 12).map(Math.round) as [number, number]), hex('#a07850')); } // 목책
  flag(s, 0.34, -0.32, 22, 22, hex('#b8352b'));
};
const gran = (s: Scene) => {
  const m = mat('#b04a3a'), f = s.face(-0.45, -0.42, 0, 0.62, 0.84);
  s.box(-0.45, -0.42, 0, 0.62, 0.84, 18, m);
  f.L(0.14, 0.86, 0, 13, CREAM); f.ll(0.14, 0, 0.86, 13, hex('#7a2c22')); f.ll(0.14, 13, 0.86, 0, hex('#7a2c22'));
  f.ll(0.5, 0, 0.5, 13, hex('#7a2c22')); f.ll(0.14, 6, 0.86, 6, hex('#7a2c22'));
  s.gable(-0.45, -0.42, 18, 0.62, 0.84, 11, 'y', '#6b4a35', m, 0.06);
  s.cyl(0.3, -0.1, 0.2, 0, 34, hex('#d9cdaa'), lite(hex('#d9cdaa'), 0.2)); s.pyr(0.14, -0.26, 34, 0.32, 0.32, 10, '#7a5a40', 0.02); // 사일로
  for (const [x, y] of [[0.05, 0.5], [0.3, 0.46]]) s.box(x, y, 0, 0.2, 0.16, 6, mat('#d3b45e'));
};
const rnch = (s: Scene) => {
  const m = mat('#b98f5c'), f = s.face(-0.45, -0.38, 0, 0.9, 0.76);
  s.box(-0.45, -0.38, 0, 0.9, 0.76, 14, m);
  f.L(0.12, 0.88, 0, 10, DARK); f.L(0.16, 0.84, 0, 5, hex('#d9b95e')); // 건초 가득한 입구
  s.gable(-0.45, -0.38, 14, 0.9, 0.76, 9, 'x', '#8a5a3a', m, 0.1);
  s.cyl(0.32, 0.38, 0.22, 0, 8, hex('#cfae5e'), hex('#e0c47a')); s.pyr(0.2, 0.26, 8, 0.24, 0.24, 7, '#cfae5e', 0);
  for (const x of [-0.4, -0.15, 0.1]) s.line([x, 0.56, 0], [x, 0.56, 8], WOOD);
  s.line([-0.4, 0.56, 6], [0.1, 0.56, 6], WOOD); s.line([-0.4, 0.56, 3], [0.1, 0.56, 3], WOOD);
  s.box(-0.3, 0.46, 0, 0.22, 0.12, 5, mat('#f4f1e8')); s.box(-0.24, 0.5, 4, 0.08, 0.06, 2, mat('#2a2830')); // 젖소
  s.box(-0.3, 0.52, 0, 0.04, 0.04, 2, mat('#e7a0a0'));
};
const towr = (s: Scene) => {
  s.box(-0.4, -0.4, 0, 0.8, 0.8, 10, mat('#85819e'));
  const m = mat('#9a95b6'), f = s.face(-0.27, -0.27, 10, 0.54, 0.54);
  s.box(-0.27, -0.27, 10, 0.54, 0.54, 52, m);
  for (const z of [6, 22, 38]) { f.L(0.3, 0.7, z, z + 8, hex('#9ae6ff')); f.R(0.3, 0.7, z + 4, z + 12, shade(hex('#9ae6ff'), 0.3)); }
  s.box(-0.36, -0.36, 48, 0.72, 0.72, 3, mat('#7a7595'));
  s.pyr(-0.3, -0.3, 62, 0.6, 0.6, 24, '#5b3f94', 0.08);
  const [cx, cy] = s.pt(0, 0, 96), c = hex('#9ae6ff');
  s.b.poly([[cx, cy - 8], [cx + 4.5, cy], [cx, cy + 8], [cx - 4.5, cy]], c); s.b.poly([[cx, cy - 8], [cx, cy + 8], [cx - 4.5, cy]], lite(c, 0.55));
  s.line([0, 0, 86], [0, 0, 90], hex('#c9a8ff'));
};
const alch = (s: Scene) => {
  const m = mat('#7f9d80'), f = s.face(-0.42, -0.42, 0, 0.84, 0.84);
  s.box(-0.42, -0.42, 0, 0.84, 0.84, 18, m);
  s.box(0.2, -0.34, 12, 0.14, 0.14, 20, mat('#7a6a8a'));
  s.pyr(-0.42, -0.42, 18, 0.84, 0.84, 18, '#6b4a8a', 0.08);
  const [wx, wy] = f.fl(0.32, 10); s.b.ellipse(wx, wy, 4.6, 4.6, DARK); s.b.ellipse(wx, wy, 3.4, 3.4, hex('#c9e8a8')); s.b.ellipse(wx - 1, wy - 1, 1.2, 1.2, WHITE); // 둥근 창
  f.L(0.62, 0.86, 0, 11, hex('#5c3f2c'));
  f.R(0.25, 0.7, 7, 14, shade(hex('#c9e8a8'), 0.3));
  s.cyl(0.4, 0.46, 0.2, 0, 6, hex('#3d3846'), hex('#8fe36a')); // 가마솥
  const [bx, by] = s.pt(0.4, 0.46, 6); for (const [dx, dy] of [[-2, -2], [2, -3], [0, -5]]) s.b.set(bx + dx, by + dy, hex('#d4ffb0'));
};
const ship = (s: Scene) => {
  const m = mat('#a98458'), f = s.face(-0.45, -0.38, 0, 0.9, 0.76);
  s.box(-0.45, -0.38, 0, 0.9, 0.76, 16, m);
  lines(s, f, [5, 10], shade(m.left, 0.25));
  f.L(0.3, 0.7, 0, 11, DARK); for (const u of [0.4, 0.5, 0.6]) f.ll(u, 0, u, 11, hex('#4a3a2e'));
  f.R(0.3, 0.6, 7, 13, shade(LIT, 0.3));
  s.gable(-0.45, -0.38, 16, 0.9, 0.76, 9, 'x', '#4a6a82', m, 0.07);
  s.line([-0.2, 0, 20], [-0.2, 0, 70], hex('#6b4a32')); s.line([-0.2, 0.02, 20], [-0.2, 0.02, 70], WOOD);
  s.poly(lite(CREAM, 0.3), [-0.2, 0, 62], [-0.2, 0, 32], [0.3, 0, 32]); s.poly(CREAM, [-0.2, 0, 62], [0.3, 0, 32], [0.3, 0, 28], [-0.2, 0, 28]); s.line([-0.2, 0, 44], [0.15, 0, 36], shade(CREAM, 0.3));
  s.poly(hex('#d9453a'), [-0.2, 0, 70], [-0.05, 0, 68], [-0.2, 0, 65]);
  s.box(0.1, 0.46, 0, 0.2, 0.2, 8, mat('#9a7448')); s.cyl(-0.2, 0.5, 0.18, 0, 8, hex('#8d6a3a'), hex('#b08650'));
};
const spce = (s: Scene) => {
  const m = mat('#c98f55'), f = s.face(-0.45, -0.4, 0, 0.9, 0.8);
  s.box(-0.45, -0.4, 0, 0.9, 0.8, 20, m);
  s.gable(-0.45, -0.4, 20, 0.9, 0.8, 10, 'y', '#a8482e', m, 0.07);
  f.L(0.62, 0.88, 0, 12, DARK); f.R(0.3, 0.62, 9, 16, shade(LIT, 0.3));
  for (let i = 0; i < 6; i++) { const x0 = -0.42 + i * 0.14, x1 = x0 + 0.14; s.poly(i % 2 ? CREAM : hex('#c8453b'), [x0, 0.4, 17], [x1, 0.4, 17], [x1, 0.66, 12], [x0, 0.66, 12]); }
  [[-0.32, '#d9453a'], [-0.12, '#e6b23a'], [0.08, '#7aa84a']].forEach(([x, c]) => { const [px, py] = s.pt(x as number, 0.58, 0); s.b.ellipse(px, py - 1.5, 4.5, 2.6, hex(c as string)); s.b.ellipse(px - 1, py - 2.5, 1.8, 0.9, lite(hex(c as string), 0.4)); });
  s.cyl(0.3, 0.55, 0.16, 0, 8, hex('#a8844f'), hex('#c9a96a'));
};
const bank = (s: Scene) => {
  s.box(-0.48, -0.42, 0, 0.96, 0.88, 3, mat('#bfb298'));
  const m = mat('#e8dfca'), f = s.face(-0.4, -0.36, 3, 0.8, 0.72);
  s.box(-0.4, -0.36, 3, 0.8, 0.72, 22, m);
  for (let i = 0; i < 4; i++) { const u = 0.08 + i * 0.23; f.L(u, u + 0.1, 1, 21, hex('#f7f1e1')); f.L(u + 0.1, u + 0.13, 1, 21, shade(hex('#d9cfb8'), 0.3)); }
  f.R(0.3, 0.7, 6, 16, shade(hex('#4a6aa8'), 0.1)); f.R(0.4, 0.6, 9, 13, hex('#ffc13b'));
  s.gable(-0.4, -0.36, 25, 0.8, 0.72, 8, 'y', '#b8a070', mat('#efe7d4'), 0.05);
  s.cyl(0, -0.08, 0.3, 28, 6, hex('#d9aa3a'), hex('#f0cf6a')); const [dx, dy] = s.pt(0, -0.08, 34);
  s.b.ellipse(dx, dy - 1, 5.8, 3, hex('#e8c24a')); s.b.ellipse(dx - 2, dy - 2, 2.4, 1.2, hex('#fff0a8')); s.b.line(dx, dy - 4, dx, dy - 9, hex('#d9aa3a'));
};
const insr = (s: Scene) => {
  const m = mat('#7d8fb0'), f = s.face(-0.45, -0.45, 0, 0.9, 0.9);
  s.box(-0.45, -0.45, 0, 0.9, 0.9, 26, m);
  lines(s, f, [7, 14, 21], shade(m.left, 0.25));
  f.L(0.3, 0.7, 0, 14, DARK);
  const g = hex('#ffc13b'); s.b.poly([f.fl(0.38, 25), f.fl(0.62, 25), f.fl(0.62, 19), f.fl(0.5, 15), f.fl(0.38, 19)], g); s.b.poly([f.fl(0.43, 23), f.fl(0.57, 23), f.fl(0.57, 20), f.fl(0.5, 17.5), f.fl(0.43, 20)], hex('#2f4a8a'));
  f.R(0.25, 0.4, 14, 22, shade(LIT, 0.3)); f.R(0.6, 0.75, 14, 22, shade(LIT, 0.3));
  for (let i = 0; i < 4; i++) { s.box(-0.45 + i * 0.26, 0.31, 26, 0.14, 0.14, 5, m); s.box(0.31, -0.45 + i * 0.26, 26, 0.14, 0.14, 5, m); }
  s.box(0.3, 0.3, 0, 0.22, 0.22, 36, m); s.pyr(0.3, 0.3, 36, 0.22, 0.22, 10, '#2f4a8a', 0.04);
  flag(s, -0.1, -0.1, 31, 18, hex('#ffc13b'));
};

/** 왕국 성: 블록 하나(3×3 타일). 성벽·네 모서리 탑·중앙 본성·문 */
const castle = (s: Scene) => {
  const wm = mat('#a9a39a'), tm = mat('#bdb6a8'), km = mat('#cfc6b4');
  const tower = (x: number, y: number) => { s.box(x, y, 0, 0.5, 0.5, 36, tm); const f = s.face(x, y, 0, 0.5, 0.5); f.L(0.35, 0.65, 18, 28, shade(LIT, 0.2)); f.R(0.35, 0.65, 20, 30, shade(LIT, 0.4)); s.pyr(x, y, 36, 0.5, 0.5, 18, '#a8482e', 0.07); };
  const crenel = (x: number, y: number, along: 'x' | 'y', n: number) => { for (let i = 0; i < n; i++) s.box(along === 'x' ? x + i * 0.32 : x, along === 'y' ? y + i * 0.32 : y, 12, 0.14, 0.14, 4, wm); };
  tower(-1.5, -1.5);
  s.box(-1.4, -1.4, 0, 2.8, 0.22, 12, wm); s.box(-1.4, -1.4, 0, 0.22, 2.8, 12, wm); crenel(-1.2, -1.4, 'x', 8); crenel(-1.4, -1.2, 'y', 8);
  tower(1.0, -1.5); tower(-1.5, 1.0);
  const kf = s.face(-0.5, -0.5, 0, 1, 1);
  s.box(-0.5, -0.5, 0, 1, 1, 42, km); for (const z of [10, 26]) { kf.L(0.2, 0.4, z, z + 10, shade(LIT, 0.1)); kf.L(0.6, 0.8, z, z + 10, shade(LIT, 0.1)); kf.R(0.4, 0.6, z + 4, z + 14, shade(LIT, 0.4)); }
  s.pyr(-0.5, -0.5, 42, 1, 1, 24, '#a8482e', 0.1);
  flag(s, 0, 0, 66, 18, hex('#d9453a'));
  s.box(-1.4, 1.18, 0, 2.8, 0.22, 12, wm); const wf = s.face(-1.4, 1.18, 0, 2.8, 0.22);
  wf.L(0.4, 0.6, 0, 11, DARK); wf.L(0.43, 0.57, 0, 8, hex('#ffb347')); crenel(-1.2, 1.18, 'x', 8);
  s.box(1.18, -1.4, 0, 0.22, 2.8, 12, wm); crenel(1.18, -1.2, 'y', 8);
  tower(1.0, 1.0);
  flag(s, 1.25, 1.25, 54, 12, hex('#d9453a'));
};

type Maker = { draw: (s: Scene) => void; w: number; h: number; ox: number; oy: number; shadow: [number, number][] };
const K = 1.2; // 길드는 배경 집보다 한 뼘 크게
const std = (draw: (s: Scene) => void): Maker => ({ draw, w: 88, h: 128, ox: 44, oy: 104, shadow: [[-0.45, -0.45], [1.0, -0.35], [1.0, 0.55], [-0.45, 0.45]] });
const MAKERS: Record<string, Maker> = {
  IRON: std(iron), MERC: std(merc), GRAN: std(gran), RNCH: std(rnch), ALCH: std(alch), SHIP: { ...std(ship), h: 138, oy: 114 }, SPCE: std(spce), BANK: std(bank), INSR: std(insr),
  TOWR: { ...std(towr), h: 170, oy: 148 },
};
export const guildSprite = (id: string): Sprite => { const m = MAKERS[id]; return sprite(`guild:${id}`, m.w, m.h, m.ox, m.oy, m.draw, { k: K, shadow: m.shadow, post: id === 'IRON' ? (s) => glow(s, 0.25, 0, 44, 6, hex('#9aa0a8'), 120) : id === 'ALCH' ? (s) => glow(s, 0.27, -0.27, 36, 6, hex('#c9e8a8'), 120) : id === 'TOWR' ? (s) => glow(s, 0, 0, 96, 12, hex('#9ae6ff'), 80) : undefined }); };
export const castleSprite = () => sprite('castle', 136, 140, 68, 100, castle, { shadow: [[-1.5, -1.5], [3, -1.2], [3, 1.9], [-1.5, 1.7]] });
