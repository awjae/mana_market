export const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
export const fmt0 = (n: number) => Math.round(n).toLocaleString('ko-KR');
export const pct = (r: number) => `${r > 0 ? '+' : ''}${(r * 100).toFixed(2)}%`;
export const change = (h: number[]) => (h.length > 1 ? h[h.length - 1] / h[h.length - 2] - 1 : 0);
