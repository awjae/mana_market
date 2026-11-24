/** 아이소메트릭(2:1) 투영. 타일 좌표(gx, gy)와 높이 z → 월드 좌표 (타일 한 칸 = 56×28) */
export const TW = 56;
export const TH = 28;
export const sx = (gx: number, gy: number) => ((gx - gy) * TW) / 2;
export const sy = (gx: number, gy: number, z = 0) => ((gx + gy) * TH) / 2 - z;
export const P = (gx: number, gy: number, z = 0) => `${sx(gx, gy)},${sy(gx, gy, z)}`;
