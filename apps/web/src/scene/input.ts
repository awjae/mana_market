/** 가상 패드가 쓰는 입력 채널: 화면 방향(-1~1). IsoWorld가 매 프레임 읽는다 */
export const pad = { x: 0, y: 0 };

/** 터치 기기인지 (가상 패드 표시 여부) */
export const isTouch = () => typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);

/** 주인공의 현재 타일 좌표(소수): IsoWorld가 매 프레임 갱신하고 마을 지도가 읽는다 */
export const heroPos = { x: 22.5, y: 24.5 };
