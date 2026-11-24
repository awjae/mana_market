/** 국면 계산용 결정적 해시(0~1): 엔진의 난수 순서에 영향을 주지 않으려고 별도로 둔다 */
export const hash = (a: number, b: number, s: number) => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(s + 1, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
