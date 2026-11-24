import { mixc, rgb, sprite, type RGB, type Sprite } from './pix';

/** 던전 몬스터 7종(0~5 일반, 6 보스)을 코드로 그린 도트. 이미지 파일 없음 */
const hex = rgb, W: RGB = [255, 255, 255], INK = hex('#241838');
const lite = (c: RGB, t: number) => mixc(c, W, t), dark = (c: RGB, t: number) => mixc(c, INK, t);
export const MONSTER_COLOR = ['#52c46a', '#7a5ab0', '#7aa844', '#d8d4c4', '#8a8a96', '#8d8984', '#9a5ab8', '#cfe4f4', '#3a2f44', '#d8602a', '#6a3a8a', '#3a2a5a', '#e8432e', '#8ad0f0', '#7a2a2a'];

export function monsterSprite(kind: number): Sprite {
  return sprite(`monster:${kind}`, 56, 52, 28, 50, (s) => {
    const b = s.b, c = hex(MONSTER_COLOR[kind] ?? MONSTER_COLOR[0]), eye = (x: number, y: number, col: RGB = INK) => { b.rect(x, y, 3, 3, W); b.rect(x + 1, y + 1, 2, 2, col); };
    switch (kind) {
      case 0: // 슬라임
        b.ellipse(28, 38, 20, 12, dark(c, 0.3)); b.ellipse(28, 36, 19, 12, c); b.ellipse(22, 30, 7, 4, lite(c, 0.45)); eye(20, 34); eye(31, 34); b.rect(26, 41, 5, 1, dark(c, 0.5)); break;
      case 1: // 박쥐
        b.poly([[28, 22], [4, 12], [10, 30], [20, 26]], dark(c, 0.15)); b.poly([[28, 22], [52, 12], [46, 30], [36, 26]], dark(c, 0.15));
        b.ellipse(28, 26, 8, 10, c); b.poly([[22, 18], [24, 10], [27, 18]], c); b.poly([[29, 18], [32, 10], [34, 18]], c); eye(23, 23, hex('#e8432e')); eye(30, 23, hex('#e8432e')); b.rect(26, 32, 1, 3, W); b.rect(30, 32, 1, 3, W); break;
      case 2: // 고블린
        b.rect(20, 34, 16, 14, hex('#7a5a3c')); b.ellipse(28, 24, 12, 11, c); b.poly([[16, 22], [6, 18], [16, 28]], c); b.poly([[40, 22], [50, 18], [40, 28]], c);
        eye(21, 21, hex('#e8432e')); eye(31, 21, hex('#e8432e')); b.rect(24, 30, 8, 2, W); b.rect(44, 28, 4, 20, hex('#8a6a48')); b.ellipse(46, 26, 5, 5, hex('#6a4a30')); break;
      case 3: // 해골 병사
        b.ellipse(28, 18, 11, 10, c); b.rect(23, 26, 10, 4, c); b.ellipse(23, 18, 3, 3, INK); b.ellipse(33, 18, 3, 3, INK); b.rect(27, 22, 2, 3, INK);
        for (const y of [32, 36, 40]) b.rect(18, y, 20, 2, c); b.rect(27, 32, 2, 14, dark(c, 0.3)); b.rect(14, 32, 4, 2, c); b.rect(38, 32, 4, 2, c); b.rect(44, 20, 2, 26, hex('#b8c0cc')); b.rect(42, 36, 6, 2, hex('#7a5a3c')); break;
      case 4: // 굶주린 늑대
        b.ellipse(26, 36, 16, 9, c); b.ellipse(40, 28, 9, 8, c); b.poly([[36, 22], [38, 14], [42, 22]], dark(c, 0.2)); b.poly([[43, 22], [46, 15], [48, 24]], dark(c, 0.2));
        b.poly([[46, 28], [54, 32], [46, 34]], lite(c, 0.2)); eye(38, 25, hex('#ffd04a')); for (const x of [14, 20, 30, 36]) b.rect(x, 42, 3, 8, dark(c, 0.25)); b.poly([[10, 34], [2, 26], [12, 30]], c); b.rect(47, 33, 5, 1, W); break;
      case 5: // 돌 골렘
        b.rect(14, 8, 28, 16, c); b.rect(10, 24, 36, 18, dark(c, 0.15)); b.rect(8, 26, 8, 16, c); b.rect(40, 26, 8, 16, c); b.rect(16, 42, 10, 8, dark(c, 0.3)); b.rect(30, 42, 10, 8, dark(c, 0.3));
        b.rect(22, 14, 4, 4, hex('#ff9a3c')); b.rect(31, 14, 4, 4, hex('#ff9a3c')); for (const [x, y] of [[16, 28], [34, 32], [24, 36]]) b.rect(x, y, 4, 2, dark(c, 0.45)); b.rect(14, 8, 28, 2, lite(c, 0.3)); break;
      case 11: // 심연의 군주: 뿔 셋과 불타는 눈의 거대한 그림자
        b.ellipse(28, 36, 25, 15, dark(c, 0.4)); b.ellipse(28, 24, 15, 13, c); for (const [x0, x1] of [[12, 4], [28, 28], [44, 52]]) b.poly([[x0 - 4, 18], [x1, 2], [x0 + 4, 16]], hex('#cfc4e8'));
        eye(20, 20, hex('#ff5a3c')); eye(33, 20, hex('#ff5a3c')); b.rect(21, 29, 14, 3, hex('#e8432e')); for (const x of [22, 26, 30]) b.rect(x, 32, 2, 3, W); b.rect(4, 36, 10, 12, c); b.rect(42, 36, 10, 12, c); b.ellipse(28, 40, 6, 5, hex('#ff9a3c')); break;
      case 6: // 독버섯 몬스터
        b.rect(24, 30, 8, 16, hex('#e8d8b8')); b.ellipse(28, 26, 22, 14, c); b.rect(6, 28, 44, 3, dark(c, 0.3));
        for (const [x, y] of [[14, 20], [28, 14], [40, 22], [22, 24]]) b.ellipse(x, y, 3, 3, hex('#f4e060')); eye(23, 36, hex('#5a2a2a')); eye(29, 36, hex('#5a2a2a'));
        for (const [x, y] of [[8, 14], [46, 12], [4, 22]]) b.rect(x, y, 2, 2, hex('#7ae070')); break;
      case 7: // 유령
        b.poly([[8, 46], [10, 22], [20, 8], [36, 8], [46, 22], [48, 46], [42, 40], [36, 46], [28, 40], [20, 46], [14, 40]], lite(c, 0.1)); b.ellipse(28, 24, 18, 14, lite(c, 0.25));
        b.ellipse(21, 22, 3, 4, dark(c, 0.8)); b.ellipse(35, 22, 3, 4, dark(c, 0.8)); b.rect(24, 31, 9, 2, dark(c, 0.8)); b.rect(22, 29, 2, 2, dark(c, 0.8)); b.rect(33, 29, 2, 2, dark(c, 0.8)); break;
      case 8: // 거대 거미
        b.ellipse(28, 34, 13, 11, c); b.ellipse(28, 22, 8, 7, dark(c, 0.15)); b.rect(26, 30, 4, 6, hex('#e8e0d0')); for (const x of [23, 26, 29, 32]) b.rect(x, 18, 2, 2, hex('#e8432e'));
        for (const [x0, y0, x1, y1] of [[18, 28, 4, 18], [18, 34, 2, 36], [20, 40, 6, 50], [20, 24, 8, 10], [38, 28, 52, 18], [38, 34, 54, 36], [36, 40, 50, 50], [36, 24, 48, 10]] as [number, number, number, number][]) b.line(x0, y0, x1, y1, lite(c, 0.3)); break;
      case 9: // 불도마뱀
        b.ellipse(28, 36, 18, 9, c); b.ellipse(44, 30, 8, 7, c); b.poly([[46, 31], [54, 34], [46, 36]], lite(c, 0.2)); eye(41, 26, hex('#ffd04a')); b.poly([[10, 38], [2, 30], [12, 34]], c);
        b.ellipse(3, 28, 3, 4, hex('#ffd04a')); b.ellipse(3, 29, 2, 2, hex('#e8432e')); b.ellipse(28, 41, 14, 4, hex('#f4d8a0')); for (const x of [14, 20, 32, 38]) b.rect(x, 43, 3, 6, dark(c, 0.25)); for (const x of [18, 24, 30]) b.poly([[x, 28], [x + 2, 22], [x + 4, 28]], hex('#7a2a1a')); break;
      case 12: // 축제 도깨비: 붉은 몸에 뿔과 방망이, 축제 가면
        b.ellipse(28, 36, 16, 12, c); b.ellipse(28, 22, 12, 11, c); b.poly([[18, 14], [14, 4], [22, 12]], hex('#ffd04a')); b.poly([[38, 14], [42, 4], [34, 12]], hex('#ffd04a'));
        b.rect(20, 18, 16, 8, hex('#fff6d8')); eye(22, 20); eye(31, 20); b.rect(24, 28, 8, 2, W); b.rect(42, 14, 3, 24, hex('#8a6a48')); b.ellipse(43, 12, 6, 6, hex('#ffd04a'));
        for (const x of [20, 26, 32]) b.rect(x, 44, 4, 4, dark(c, 0.3)); break;
      case 13: // 서리 거인
        b.ellipse(28, 36, 24, 16, dark(c, 0.3)); b.ellipse(28, 24, 14, 13, c); b.poly([[16, 18], [12, 2], [22, 12]], W); b.poly([[40, 18], [44, 2], [34, 12]], W);
        eye(21, 21, hex('#2a6aff')); eye(32, 21, hex('#2a6aff')); b.rect(22, 30, 12, 2, W); b.rect(4, 36, 10, 12, c); b.rect(42, 36, 10, 12, c); for (const [x, y] of [[10, 34], [46, 34], [28, 44], [18, 40]]) b.rect(x, y, 3, 3, W); break;
      case 14: // 종말의 용
        b.ellipse(28, 38, 22, 11, c); b.ellipse(40, 24, 11, 9, c); b.poly([[44, 17], [52, 6], [48, 18]], hex('#ffd04a')); b.poly([[36, 16], [38, 4], [42, 16]], hex('#ffd04a'));
        b.poly([[8, 30], [-2, 14], [22, 28]], dark(c, 0.3)); b.poly([[20, 30], [10, 12], [34, 28]], dark(c, 0.15)); eye(41, 21, hex('#ffd04a')); b.poly([[48, 26], [54, 29], [48, 30]], lite(c, 0.2));
        b.ellipse(54, 26, 3, 3, hex('#ffb04a')); b.poly([[6, 40], [-1, 46], [10, 44]], c); for (const x of [14, 22, 32, 38]) b.rect(x, 44, 4, 6, dark(c, 0.3)); break;
      default: { // 동굴의 왕: 뿔 달린 큰 바위 짐승
        b.ellipse(28, 34, 24, 16, dark(c, 0.15)); b.ellipse(28, 24, 14, 12, c); b.poly([[14, 20], [8, 4], [20, 14]], hex('#e8e0c8')); b.poly([[42, 20], [48, 4], [36, 14]], hex('#e8e0c8'));
        eye(21, 21, hex('#ffd04a')); eye(32, 21, hex('#ffd04a')); b.rect(22, 30, 12, 2, W); for (const x of [22, 26, 30]) b.rect(x, 32, 2, 3, W);
        b.poly([[20, 8], [23, 2], [28, 8], [33, 2], [36, 8]], hex('#ffc13b')); b.rect(6, 38, 8, 10, c); b.rect(42, 38, 8, 10, c); for (const [x, y] of [[16, 36], [36, 40], [26, 42]]) b.rect(x, y, 4, 2, lite(c, 0.35)); break; }
    }
  }, { shadow: [[-0.4, -0.2], [0.5, -0.2], [0.5, 0.3], [-0.4, 0.3]] });
}
