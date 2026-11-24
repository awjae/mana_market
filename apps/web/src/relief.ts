/** 왕실 구호 지원: 총자산이 바닥까지 떨어진 상인에게 한 달에 한 번 마나를 지원한다(파산해 이탈하는 것을 막는 안전망). 투자 조언이 아니라 게임 규칙 */
export const RELIEF_BELOW = 3000, RELIEF_AMOUNT = 3000, RELIEF_COOLDOWN = 30;
export const reliefDue = (worth: number, day: number, last: number) => worth < RELIEF_BELOW && day - last >= RELIEF_COOLDOWN;
