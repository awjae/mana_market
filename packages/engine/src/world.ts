import { DEFAULT_CONFIG } from './config';
import { createMarket, nextDay } from './step';
import type { EngineConfig, MarketState } from './types';

/** 모든 플레이어가 공유하는 세계의 시드. 시장은 (시드, 날짜)만으로 정해진다 → 서버 없이도 같은 날엔 같은 시장 */
export const WORLD_SEED = 20260101;
/** 세계 버전: 이벤트 풀·난수 소비·가격 규칙을 바꾸면 모든 플레이어의 과거 시세가 달라진다. 바꿀 땐 이 값을 올리고 `test/world.test.ts`의 골든 값을 의도적으로 갱신한다 */
export const WORLD_VERSION = 12; // 12: 공시의 첫 충격을 공시가 보이는 날 시가에 반영, 여진 방향 반반("호재 공시를 보고 사면 이긴다" 해소) / 11: 국면 길이를 3~8일로 더 짧게·소식 빈도 상향·기본 드리프트 재조정("들어와서 할 게 없다" 피드백) / 10: 평온 국면 변동 ×1.25·호황 ×1.1(초반이 밋밋하다는 피드백) / 9: 변동성 추가 상향(시장 1.6%·업종 1.1%·종목 고유 ×1.3, 사용자 "가상 자산이니 더 크게") / 8: 국면 길이를 열흘~보름 단위로 단축(첫 평온 60→7일, 국면 40~70→8~16일)과 강도 재조정 / 7: 시장 전체 변동성 상향(marketVol 0.7→1.2%) / 6: 변동성 상향(시장·업종 노이즈, 종목 개성, 이벤트 빈도, 급등락 이벤트 2종, 국면 강도, 기본 드리프트 0) / 5: 업종 균형 보정(마나 폭풍 중복 정의 제거, 마법·금융 호재와 무기 악재 추가) / 4: 업종 연쇄 이벤트 4종 추가

/** 건국 0일부터 `day`일까지 시뮬레이션한 시장 */
export function marketAtDay(day: number, cfg: EngineConfig = DEFAULT_CONFIG): MarketState {
  let m = createMarket(WORLD_SEED, cfg);
  for (let i = 0; i < day; i++) m = nextDay(m, cfg);
  return m;
}
