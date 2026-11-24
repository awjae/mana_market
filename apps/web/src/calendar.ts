import { hash } from './scene/hash';
import { dateShort, fantasyDate } from '@mana/engine';
export { dateLong, dateShort, fantasyDate, phaseName, skyPhase, msUntilNextDay, ERA } from '@mana/engine';

/** 게임 날짜 번호 → 화면에 쓰는 짧은 날짜 ("소나기달 12일", 축제일은 "별빛제") */
export const dayLabel = (day: number) => dateShort(day);
/** HUD 깃발에 들어가는 두 줄: [위(작게), 아래(크게)] */
export const flagParts = (day: number): [string, string] => {
  const d = fantasyDate(day);
  return d.festival ? ['축제', d.festival.replace('제', '')] : [d.monthName, String(d.day)];
};

/** 하늘 상태: 시장과 무관하게 날짜로만 정해 모두에게 같다. 한국의 월별 강수일 비율(여름 장마가 가장 잦다)을 따르고, 비는 하루 걸러 이어지기도 하며(장마), 겨울에는 눈이 된다 */
export type Weather = 'clear' | 'cloud' | 'rain' | 'snow';
const RAIN = [0.1, 0.1, 0.15, 0.2, 0.22, 0.33, 0.5, 0.45, 0.27, 0.15, 0.15, 0.12], CLOUD = [0.2, 0.2, 0.22, 0.2, 0.2, 0.25, 0.25, 0.2, 0.18, 0.15, 0.2, 0.2];
const monthOf = (day: number) => Math.min(11, Math.floor((((day % 365) + 365) % 365) / 30.4));
const wet = (day: number) => hash(day, 7, 31) < RAIN[monthOf(day)] * 0.75;
export const weatherKind = (day: number): Weather => {
  const m = monthOf(day);
  if (wet(day) || (wet(day - 1) && hash(day, 8, 32) < 0.45)) return m === 11 || m <= 1 ? 'snow' : 'rain';
  return hash(day, 9, 33) < CLOUD[m] / (1 - RAIN[m]) ? 'cloud' : 'clear';
};
/** 하늘 색조용 수치: 비·눈 -1, 흐림 -0.45, 맑음 +0.3 */
export const weatherAt = (day: number) => ({ rain: -1, snow: -0.8, cloud: -0.45, clear: 0.3 })[weatherKind(day)];
export const WEATHER_NAME: Record<Weather, string> = { clear: '맑음', cloud: '흐림', rain: '비', snow: '눈' };
