import { hash } from './hash';

/** 던전 배경: 층 구간별 벽돌 도트 타일 한 장을 캔버스로 그려 CSS 배경으로 쓴다(이미지 파일 없음, 구간당 한 번만 그림) */
export type Tier = 0 | 1 | 2 | 3;
export const tierOf = (floor: number): Tier => (floor === 10 ? 3 : floor >= 6 ? 2 : floor === 5 ? 1 : 0);
const BASE: string[] = ['#3b3050', '#4f2c3e', '#2c3f52', '#2d1d46'], MORTAR: string[] = ['#241a34', '#2e1824', '#1a2836', '#1a1030'];
const cache = new Map<number, string>();
export function dungeonTile(tier: Tier): string {
  const hit = cache.get(tier); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'); if (!g) return '';
  g.fillStyle = MORTAR[tier]; g.fillRect(0, 0, 32, 32);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) {
    const x = col * 16 + (row % 2 ? 8 : 0) - (row % 2 ? 0 : 0), y = row * 8;
    for (const dx of [0, -32]) {
      g.fillStyle = BASE[tier]; g.fillRect(x + dx + 1, y + 1, 14, 6);
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + dx + 1, y + 1, 14, 1);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + dx + 1, y + 6, 14, 1);
      for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(255,255,255,${0.05 + hash(row, col, 70 + k) * 0.06})`; g.fillRect(x + dx + 2 + Math.floor(hash(row + k, col, 80) * 11), y + 2 + Math.floor(hash(row, col + k, 81) * 3), 1, 1); }
    }
  }
  const url = c.toDataURL(); cache.set(tier, url); return url;
}
