/** 간단한 그래픽: 장식 애니메이션(꽃잎·비·눈·구름·빛줄기·반짝임)과 하늘 덮개를 끈다. 폰에서 깜빡임·끊김이 있을 때 켠다 */
const KEY = 'mana-lite';
export const liteOn = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
export const applyLite = (on = liteOn()) => document.documentElement.classList.toggle('lite', on);
export const setLite = (on: boolean) => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* 저장 못 해도 이번 접속엔 적용 */ } applyLite(on); };
