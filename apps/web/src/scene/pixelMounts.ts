import { mixc, rgb, sprite, type RGB, type Sprite } from './pix';

/** 탈것 도트 3종(코드로 그림, 오른쪽을 본다): 1 말, 2 마차, 3 하늘을 나는 빗자루. 영웅 아래에 깔리고 영웅과 함께 좌우로 뒤집힌다 */
const hex = rgb, W: RGB = [255, 255, 255], INK = hex('#241838');
const lite = (c: RGB, t: number) => mixc(c, W, t), dark = (c: RGB, t: number) => mixc(c, INK, t);
export const MOUNT_NAMES = ['없음', '말', '마차', '하늘 빗자루'];

export function mountSprite(kind: number): Sprite {
  return sprite(`mount:${kind}`, 56, 40, 28, 36, (s) => {
    const b = s.b;
    if (kind === 1) { // 말
      const c = hex('#9a6a3c');
      for (const x of [14, 19, 33, 38]) b.rect(x, 24, 3, 11, dark(c, 0.25));
      b.ellipse(26, 22, 15, 8, c); b.ellipse(24, 19, 10, 3, lite(c, 0.25)); b.poly([[36, 18], [42, 8], [48, 12], [46, 22], [38, 24]], c); b.ellipse(46, 16, 5, 4, lite(c, 0.12));
      b.rect(47, 14, 2, 2, INK); b.poly([[38, 9], [41, 4], [43, 9]], dark(c, 0.15)); b.rect(36, 10, 4, 10, dark(c, 0.45)); b.poly([[11, 20], [4, 28], [12, 26]], dark(c, 0.45));
      for (const x of [14, 19, 33, 38]) b.rect(x, 34, 3, 2, INK); b.rect(22, 14, 8, 3, hex('#c0392b')); // 안장
    } else if (kind === 2) { // 마차
      const wood = hex('#7a5a3c'), red = hex('#c0392b');
      b.rect(6, 12, 34, 16, wood); b.rect(6, 12, 34, 3, lite(wood, 0.3)); b.poly([[4, 12], [10, 5], [36, 5], [42, 12]], red); b.rect(12, 17, 8, 7, hex('#cfe4f4')); b.rect(24, 17, 8, 7, hex('#cfe4f4'));
      for (const x of [14, 34]) { b.ellipse(x, 30, 6, 6, dark(wood, 0.4)); b.ellipse(x, 30, 3, 3, lite(wood, 0.35)); }
      b.rect(40, 24, 12, 2, wood); b.ellipse(50, 20, 5, 4, hex('#9a6a3c')); b.rect(46, 24, 2, 8, dark(hex('#9a6a3c'), 0.25));
    } else { // 하늘 빗자루
      const wood = hex('#8a6a48');
      b.rect(6, 25, 36, 3, wood); b.rect(6, 25, 36, 1, lite(wood, 0.35));
      b.poly([[42, 22], [54, 18], [54, 33], [42, 29]], hex('#d8b24a')); for (const y of [21, 25, 29]) b.line(44, y, 53, y - 1, dark(hex('#d8b24a'), 0.3));
      b.ellipse(24, 34, 14, 3, hex('#7a5ab0')); for (const [x, y] of [[8, 14], [15, 10], [4, 20]]) { b.rect(x, y, 2, 2, hex('#ffd04a')); b.rect(x + 1, y - 1, 1, 1, W); }
    }
  }, { shadow: [[-0.4, -0.2], [0.5, -0.2], [0.5, 0.3], [-0.4, 0.3]] });
}
