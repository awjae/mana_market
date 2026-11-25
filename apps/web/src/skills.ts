import type { Element } from './dungeon';
import { hash } from './scene/hash';

/** 던전 RPG 성장: 경험치·레벨(1~20), 클래스 3종, 클래스당 스킬 6개(스킬 포인트로 배우고 강화, 전투에는 4칸 장착), 탐험 중 유물. 난수 없음(후보는 날짜 시드) */
export type Cls = 'warrior' | 'mage' | 'rogue' | 'alchemist' | 'swordsman' | 'hunter' | 'clockwork' | 'bard' | 'necro' | 'navigator' | 'smith' | 'priest';
export const CLS_LIST: Cls[] = ['warrior', 'mage', 'rogue', 'alchemist', 'swordsman', 'hunter', 'clockwork', 'bard', 'necro', 'navigator', 'smith', 'priest'];
export const CLASSES: Record<Cls, { name: string; desc: string }> = {
  warrior: { name: '전사', desc: '방어와 반격이 강해요. 맞으면서 버티다 크게 내리쳐요.' },
  mage: { name: '마법사', desc: '불·얼음·번개 속성 공격이 중심이에요. 몬스터의 약점 속성을 맞히면 훨씬 세져요.' },
  rogue: { name: '도적', desc: '연타와 독, 틈 노리기가 중심이에요. 몬스터가 공격하지 않는 틈을 찔러요.' },
  alchemist: { name: '연금술사', desc: '시약을 모아 터뜨리거나 마셔요. 시약이 많을수록 폭약과 회복이 세져요.' },
  swordsman: { name: '검객', desc: '자세가 상단·중단·하단으로 돌아가요. 몬스터의 행동과 자세가 맞으면 크게 베고 덜 맞아요.' },
  hunter: { name: '사냥꾼', desc: '덫을 미리 깔고 표식을 남겨요. 몬스터의 행동이 덫에 걸리면 발동해요.' },
  clockwork: { name: '시계공', desc: '태엽을 감아 두었다가 한꺼번에 풀어요. 직전의 공격을 되감아 한 번 더 때릴 수도 있어요.' },
  bard: { name: '음유시인', desc: '스킬마다 음표를 남기고, 음표 세 개가 곡이 되면 큰 효과가 터져요.' },
  necro: { name: '사령술사', desc: '영혼을 모아 해골 하수인을 불러요. 하수인이 매 턴 알아서 싸워요.' },
  navigator: { name: '항해사', desc: '두 턴마다 밀물과 썰물이 바뀌어요. 물때에 맞춰 스킬을 쓰면 훨씬 세요.' },
  smith: { name: '대장장이', desc: '막고 맞을 때마다 열이 올라요. 달궈진 망치로 열을 한꺼번에 터뜨려요.' },
  priest: { name: '사제', desc: '회복과 가호가 곧 공격이에요. 신앙이 쌓일수록 치유가 심판이 돼요.' },
};
/** 계열의 고유 자원(주 계열 스킬만 쓸 수 있다): 보조로 가져온 스킬은 자원을 모으거나 쓰지 못한다 */
export const CLS_RES: Record<Cls, { name: string; rule: string }> = {
  warrior: { name: '기세', rule: '맞을 때마다 기세가 쌓여요(최대 5). 쌓인 만큼 주 계열 스킬이 12%씩 세지고, 강타와 가르기가 기세를 모두 써요.' },
  mage: { name: '공명', rule: '주 계열이면 같은 속성을 이어 써도 무뎌지지 않고, 약점 배율이 0.1 더 붙어요.' },
  rogue: { name: '콤보', rule: '직전과 다른 스킬을 이어 쓰면 콤보가 쌓여요(최대 5). 주 계열 스킬이 8%씩 세지고, 같은 스킬이나 방어를 하면 끊겨요.' },
  alchemist: { name: '시약', rule: '주 계열 스킬을 쓸 때마다 시약이 1 차요(최대 3). 폭약과 회복 시약이 시약을 모두 써서 세져요.' },
  swordsman: { name: '자세', rule: '자세가 매 턴 상단→중단→하단으로 돌아요. 몬스터의 예고(강한 일격=상단, 공격=중단, 독·반격=하단)와 맞으면 주 계열 스킬 ×1.35, 받는 피해 ×0.7.' },
  clockwork: { name: '태엽', rule: '주 계열 스킬을 쓸 때마다 태엽이 1 감겨요(최대 4). 톱니 폭탄이 태엽을 모두 풀어 세지고, 되감기는 직전에 쓴 공격 스킬을 한 번 더 써요.' },
  bard: { name: '음표', rule: '음표 스킬(도입부 도·후렴 레·간주 미)을 쓰면 음표가 남아요. 최근 세 음표가 도-레-미면 행진곡(공격 +40%·회복), 미-레-도면 자장가(몬스터 약화·방벽)가 터져요.' },
  necro: { name: '영혼', rule: '주 계열 스킬을 쓸 때마다 영혼이 1 모여요(최대 5). 해골 소환이 영혼 2개를 써서 하수인을 불러요(영혼이 모자라면 짧게). 하수인은 매 턴 공격력의 80%로 알아서 때려요.' },
  navigator: { name: '조류', rule: '두 턴마다 밀물(처음 두 턴)과 썰물이 번갈아 와요. 물때에 맞는 주 계열 스킬은 30% 더 세요. 해일은 밀물에만 제대로 터져요.' },
  smith: { name: '열', rule: '맞거나 방어할 때마다 열이 올라요(최대 5). 달군 망치가 열을 모두 써서 열 하나당 50% 더 세고, 주 계열 방어 스킬은 열을 더 얹어요.' },
  priest: { name: '신앙', rule: '주 계열 스킬을 쓸 때마다 신앙이 쌓여요(최대 4). 신앙 하나당 주 계열 피해가 16% 세지고, 심판이 신앙을 모두 써요. 치유의 빛은 회복하면서 때려요.' },
  hunter: { name: '덫', rule: '주 계열 사격은 늘 정확해서 20% 더 세요. 덫은 한 번에 하나, 몬스터가 공격하는 턴에 발동하고 사라져요. 표식이 붙은 몬스터는 누구에게든 25% 더 아파요.' },
};
export const MAX_LEVEL = 20, MAX_RANK = 3, ENERGY_MAX = 10, ENERGY_START = 6, ENERGY_REGEN = 2, SLOT_COUNT = 5, CROSS_SLOTS = 2; // 주 계열 3칸 + 다른 계열 자유 2칸

/** 스킬 효과(한 번 쓸 때): 피해 배율·속성·여러 번 타격·관통·흡혈·방어·반격·회복·방벽·약화·독·피하기·자기 강화 */
export interface Fx {
  dmg?: number; elem?: Element | 'weak'; hits?: number; pierce?: boolean; drain?: number; vital?: number; heal?: number; guard?: number; reflect?: number;
  shield?: number; slow?: number; mpoison?: number; dodge?: boolean; buff?: { atk: number; turns: number }; free?: number;
  /** 몬스터에 거는 상태(남은 턴) */ mark?: number; burn?: number;
  /** 덫 설치 */ trap?: 'snare' | 'poison'; /** 자세를 몬스터 예고에 맞춘다 */ stance?: boolean;
  /** 계열 고유: 직전 공격 스킬 반복(시계공) / 음표(음유시인) / 하수인 소환(사령술사) / 물때(항해사): 'tide'는 밀물일 때 배율·'ebb'는 썰물일 때 / 열 얻기(대장장이) */ rewind?: boolean; note?: 'A' | 'B' | 'C'; minion?: number; tide?: 'flood' | 'ebb'; heat?: number; energy?: number;
  /** 시약: 'gain' n개 얻기 / 'spend' 모두 쓰고 시약마다 배율·회복 */ reagent?: number; spend?: boolean; perReagent?: number; /** 주 계열이면 기세를 모두 쓰고 배율 */ spendMomentum?: boolean;
}
export interface Skill { id: string; cls: Cls; name: string; desc: string; cost: number; cd: number; starter?: boolean; fx: Fx }
export const SKILLS: Skill[] = [
  { id: 'w_bash', cls: 'warrior', name: '강타', desc: '크게 내리쳐요(공격 ×2.0)', cost: 3, cd: 0, starter: true, fx: { dmg: 2.0 } },
  { id: 'w_guard', cls: 'warrior', name: '방패 올리기', desc: '이번 턴 받는 피해가 35%로 줄어요', cost: 2, cd: 0, starter: true, fx: { guard: 0.35 } },
  { id: 'w_cleave', cls: 'warrior', name: '가르기', desc: '방어를 무시하고 베요(×1.5)', cost: 3, cd: 0, fx: { dmg: 1.5, pierce: true } },
  { id: 'w_counter', cls: 'warrior', name: '반격 태세', desc: '받는 피해가 60%로 줄고 받은 피해를 그대로 돌려줘요', cost: 2, cd: 0, fx: { guard: 0.6, reflect: 1 } },
  { id: 'w_rally', cls: 'warrior', name: '전투 함성', desc: '체력을 25% 회복해요(3턴 뒤 다시)', cost: 4, cd: 3, fx: { heal: 0.25 } },
  { id: 'w_fury', cls: 'warrior', name: '분노', desc: '3턴 동안 공격이 1.5배(4턴 뒤 다시)', cost: 4, cd: 4, fx: { buff: { atk: 1.5, turns: 3 } } },
  { id: 'm_fire', cls: 'mage', name: '화염구', desc: '불 속성 공격(×1.6)', cost: 3, cd: 0, starter: true, fx: { dmg: 1.6, elem: 'fire' } },
  { id: 'm_ice', cls: 'mage', name: '서리 창', desc: '얼음 속성 공격(×1.3), 몬스터의 공격이 2턴 약해져요', cost: 3, cd: 0, starter: true, fx: { dmg: 1.3, elem: 'ice', slow: 2 } },
  { id: 'm_bolt', cls: 'mage', name: '번개 줄기', desc: '번개 속성 공격(×1.5)', cost: 3, cd: 0, fx: { dmg: 1.5, elem: 'bolt' } },
  { id: 'm_barrier', cls: 'mage', name: '마력 방벽', desc: '최대 체력의 25%만큼 피해를 막는 방벽(2턴 뒤 다시)', cost: 3, cd: 2, fx: { shield: 0.25 } },
  { id: 'm_surge', cls: 'mage', name: '마력 폭주', desc: '다음 스킬 둘의 기력이 들지 않아요(4턴 뒤 다시)', cost: 2, cd: 4, fx: { free: 2 } },
  { id: 'm_nova', cls: 'mage', name: '속성 폭발', desc: '몬스터의 약점 속성으로 크게 터뜨려요(×2.4, 3턴 뒤 다시)', cost: 5, cd: 3, fx: { dmg: 2.4, elem: 'weak' } },
  { id: 'r_stab', cls: 'rogue', name: '급소 찌르기', desc: '빠르게 찔러요(×1.9)', cost: 2, cd: 0, starter: true, fx: { dmg: 1.9 } },
  { id: 'r_poison', cls: 'rogue', name: '독 바르기', desc: '몬스터를 3턴 동안 중독시켜요(매 턴 피해)', cost: 2, cd: 0, starter: true, fx: { mpoison: 3 } },
  { id: 'r_flurry', cls: 'rogue', name: '연타', desc: '세 번 찔러요(한 번당 ×0.85)', cost: 3, cd: 0, fx: { dmg: 0.85, hits: 3 } },
  { id: 'r_smoke', cls: 'rogue', name: '연막', desc: '이번 턴 몬스터의 공격을 피해요(3턴 뒤 다시)', cost: 3, cd: 3, fx: { dodge: true } },
  { id: 'r_vital', cls: 'rogue', name: '치명 틈', desc: '몬스터가 공격하지 않는 틈에는 피해가 2.5배(×1.2)', cost: 3, cd: 0, fx: { dmg: 1.2, vital: 2.5 } },
  { id: 'r_drain', cls: 'rogue', name: '약탈', desc: '때리고 준 피해의 절반만큼 체력을 되찾아요(×1.5)', cost: 3, cd: 0, fx: { dmg: 1.5, drain: 0.5 } },
  { id: 'a_acid', cls: 'alchemist', name: '산성 병', desc: '산성 병을 던져요(×1.8)', cost: 2, cd: 0, starter: true, fx: { dmg: 1.8 } },
  { id: 'a_brew', cls: 'alchemist', name: '시약 조제', desc: '시약을 2개 만들어요(주 계열일 때)', cost: 1, cd: 0, starter: true, fx: { reagent: 2 } },
  { id: 'a_blast', cls: 'alchemist', name: '폭약', desc: '시약을 모두 써서 터뜨려요(×1.0, 시약 하나마다 +0.7)', cost: 3, cd: 0, fx: { dmg: 1.0, spend: true, perReagent: 0.7 } },
  { id: 'a_elixir', cls: 'alchemist', name: '회복 시약', desc: '체력 15%, 시약 하나마다 +10% 회복(시약을 써요, 2턴 뒤 다시)', cost: 3, cd: 2, fx: { heal: 0.15, spend: true, perReagent: 0.1 } },
  { id: 'a_transmute', cls: 'alchemist', name: '변성', desc: '몬스터를 3턴 태워요(화상, ×1.2). 독이 있으면 독 폭발', cost: 3, cd: 0, fx: { dmg: 1.2, burn: 3, elem: 'fire' } },
  { id: 'a_fog', cls: 'alchemist', name: '연막탄', desc: '이번 턴 공격을 피하고 몬스터가 2턴 약해져요(3턴 뒤 다시)', cost: 3, cd: 3, fx: { dodge: true, slow: 2 } },
  { id: 's_draw', cls: 'swordsman', name: '발도', desc: '검을 뽑아 베어요(×1.7)', cost: 3, cd: 0, starter: true, fx: { dmg: 1.7 } },
  { id: 's_parry', cls: 'swordsman', name: '받아치기', desc: '받는 피해가 50%로 줄고 절반을 돌려줘요', cost: 2, cd: 0, starter: true, fx: { guard: 0.5, reflect: 0.5 } },
  { id: 's_shift', cls: 'swordsman', name: '자세 전환', desc: '이번 턴 자세를 몬스터의 예고에 맞춰요(주 계열일 때)', cost: 1, cd: 0, fx: { stance: true } },
  { id: 's_flash', cls: 'swordsman', name: '일섬', desc: '방어를 무시한 일격(×2.6, 3턴 뒤 다시)', cost: 5, cd: 3, fx: { dmg: 2.6, pierce: true } },
  { id: 's_flow', cls: 'swordsman', name: '흐르는 검', desc: '두 번 베어요(한 번당 ×0.95)', cost: 3, cd: 0, fx: { dmg: 0.95, hits: 2 } },
  { id: 's_focus', cls: 'swordsman', name: '심안', desc: '다음 한 번의 공격이 2배(2턴 뒤 다시)', cost: 2, cd: 2, fx: { buff: { atk: 2, turns: 1 } } },
  { id: 'h_snare', cls: 'hunter', name: '올가미', desc: '덫을 깔아요. 몬스터가 공격하면 그 공격이 절반으로 줄어요', cost: 2, cd: 0, starter: true, fx: { trap: 'snare' } },
  { id: 'h_mark', cls: 'hunter', name: '표식', desc: '몬스터에 4턴 표식을 남겨요(표식이 있으면 누구의 공격이든 ×1.25)', cost: 2, cd: 0, fx: { mark: 4 } },
  { id: 'h_aim', cls: 'hunter', name: '조준 사격', desc: '정확히 쏴요(×1.6)', cost: 2, cd: 0, starter: true, fx: { dmg: 1.6 } },
  { id: 'h_volley', cls: 'hunter', name: '일제 사격', desc: '세 발을 쏴요(한 발당 ×0.8). 표식이 있으면 처형(×1.4)', cost: 3, cd: 0, fx: { dmg: 0.8, hits: 3 } },
  { id: 'h_pitfall', cls: 'hunter', name: '독 덫', desc: '덫을 깔아요. 몬스터가 공격하면 3턴 중독돼요', cost: 3, cd: 0, fx: { trap: 'poison' } },
  { id: 'h_shot', cls: 'hunter', name: '저격', desc: '표식을 노린 일격(×2.2, 3턴 뒤 다시)', cost: 4, cd: 3, fx: { dmg: 2.2 } },
  { id: 'c_gear', cls: 'clockwork', name: '톱니 던지기', desc: '톱니를 던져요(×1.8)', cost: 2, cd: 0, starter: true, fx: { dmg: 1.8 } },
  { id: 'c_wind', cls: 'clockwork', name: '태엽 감기', desc: '태엽을 2 감아요(주 계열일 때)', cost: 1, cd: 0, starter: true, fx: { reagent: 2 } },
  { id: 'c_bomb', cls: 'clockwork', name: '톱니 폭탄', desc: '태엽을 모두 풀어 터뜨려요(×1.0, 태엽 하나마다 +0.9)', cost: 3, cd: 0, fx: { dmg: 1.0, spend: true, perReagent: 0.9 } },
  { id: 'c_rewind', cls: 'clockwork', name: '되감기', desc: '직전에 쓴 공격 스킬을 한 번 더 써요(기력 없이)', cost: 3, cd: 2, fx: { rewind: true } },
  { id: 'c_stop', cls: 'clockwork', name: '시간 정지', desc: '이번 턴 공격을 피하고 몬스터가 2턴 약해져요, 기력 +3(4턴 뒤 다시)', cost: 4, cd: 4, fx: { dodge: true, slow: 2, energy: 3 } },
  { id: 'c_overclock', cls: 'clockwork', name: '과부하', desc: '2턴 동안 공격이 1.6배(3턴 뒤 다시)', cost: 3, cd: 3, fx: { buff: { atk: 1.6, turns: 2 } } },
  { id: 'b_open', cls: 'bard', name: '도입부', desc: '도 음표. 가볍게 쳐요(×1.3)', cost: 2, cd: 0, starter: true, fx: { dmg: 1.3, note: 'A' } },
  { id: 'b_chorus', cls: 'bard', name: '후렴', desc: '레 음표. 노래로 체력 12% 회복 + 가볍게 쳐요(×0.7)', cost: 2, cd: 0, starter: true, fx: { dmg: 0.7, heal: 0.12, note: 'B' } },
  { id: 'b_bridge', cls: 'bard', name: '간주', desc: '미 음표. 받는 피해가 60%로 줄고 방벽 10%', cost: 2, cd: 0, fx: { guard: 0.6, shield: 0.1, note: 'C' } },
  { id: 'b_discord', cls: 'bard', name: '불협화음', desc: '음표를 끊고 크게 울려요(×1.9), 몬스터가 1턴 약해져요', cost: 3, cd: 0, fx: { dmg: 1.9, slow: 1 } },
  { id: 'b_encore', cls: 'bard', name: '앙코르', desc: '한 번 더 쳐요(×1.2), 기력 +2', cost: 2, cd: 2, fx: { dmg: 1.2, energy: 2 } },
  { id: 'b_finale', cls: 'bard', name: '피날레', desc: '크게 내리쳐요(×2.2, 3턴 뒤 다시)', cost: 4, cd: 3, fx: { dmg: 2.2 } },
  { id: 'n_harvest', cls: 'necro', name: '영혼 수확', desc: '영혼을 거둬요(×1.3)', cost: 2, cd: 0, starter: true, fx: { dmg: 1.3 } },
  { id: 'n_skeleton', cls: 'necro', name: '해골 소환', desc: '영혼 2개를 써서 해골 하수인을 4턴 불러요(영혼이 모자라면 3턴)', cost: 2, cd: 0, starter: true, fx: { minion: 4 } },
  { id: 'n_curse', cls: 'necro', name: '저주', desc: '몬스터의 공격이 3턴 약해져요', cost: 2, cd: 2, fx: { slow: 3 } },
  { id: 'n_drain', cls: 'necro', name: '생명력 전환', desc: '때리고 준 피해의 70%만큼 체력을 되찾아요(×1.2)', cost: 3, cd: 0, fx: { dmg: 1.2, drain: 0.7 } },
  { id: 'n_bonestorm', cls: 'necro', name: '뼈 폭풍', desc: '세 번 때려요(한 번당 ×0.75). 하수인이 있으면 더 세요', cost: 3, cd: 0, fx: { dmg: 0.75, hits: 3 } },
  { id: 'n_dread', cls: 'necro', name: '공포', desc: '영혼을 모두 써서 짓눌러요(×1.0, 영혼 하나마다 +0.55)', cost: 3, cd: 0, fx: { dmg: 1.0, spend: true, perReagent: 0.55 } },
  { id: 'v_wave', cls: 'navigator', name: '파도 가르기', desc: '베어 가르는 파도(×1.5). 밀물이면 30% 더 세요', cost: 2, cd: 0, starter: true, fx: { dmg: 1.5, tide: 'flood' } },
  { id: 'v_anchor', cls: 'navigator', name: '닻 내리기', desc: '받는 피해가 50%로 줄어요. 썰물이면 35%', cost: 2, cd: 0, starter: true, fx: { guard: 0.5, tide: 'ebb' } },
  { id: 'v_storm', cls: 'navigator', name: '폭풍 부르기', desc: '번개 속성 폭풍(×2.1, 3턴 뒤 다시)', cost: 4, cd: 3, fx: { dmg: 2.1, elem: 'bolt', tide: 'flood' } },
  { id: 'v_route', cls: 'navigator', name: '항로', desc: '기력 +3, 방벽 10%. 썰물이면 기력이 한 번 더 +1', cost: 1, cd: 2, fx: { energy: 3, shield: 0.1, tide: 'ebb' } },
  { id: 'v_net', cls: 'navigator', name: '그물 던지기', desc: '몬스터가 2턴 약해지고 표식이 2턴 붙어요', cost: 2, cd: 2, fx: { slow: 2, mark: 2 } },
  { id: 'v_tsunami', cls: 'navigator', name: '해일', desc: '밀물에만 제대로 터져요(×3.0, 썰물이면 ×1.2, 4턴 뒤 다시)', cost: 5, cd: 4, fx: { dmg: 1.2, tide: 'flood' } },
  { id: 'f_forge', cls: 'smith', name: '단조', desc: '망치로 내리쳐요(×1.5)', cost: 2, cd: 0, starter: true, fx: { dmg: 1.5 } },
  { id: 'f_shield', cls: 'smith', name: '열 방패', desc: '받는 피해가 40%로 줄고 열이 2 올라요', cost: 2, cd: 0, starter: true, fx: { guard: 0.4, heat: 2 } },
  { id: 'f_hammer', cls: 'smith', name: '달군 망치', desc: '열을 모두 써서 내리쳐요(×1.2, 열 하나마다 +0.5)', cost: 3, cd: 0, fx: { dmg: 1.2, spend: true, perReagent: 0.5 } },
  { id: 'f_temper', cls: 'smith', name: '담금질', desc: '체력 15% 회복하고 열이 1 올라요(2턴 뒤 다시)', cost: 2, cd: 2, fx: { heal: 0.15, heat: 1 } },
  { id: 'f_quench', cls: 'smith', name: '급랭', desc: '달군 쇠를 식혀 폭발시켜요(×1.4, 얼음 속성). 화상이 있으면 증기', cost: 3, cd: 0, fx: { dmg: 1.4, elem: 'ice' } },
  { id: 'f_repair', cls: 'smith', name: '수리', desc: '방벽 20%를 세워요(3턴 뒤 다시)', cost: 3, cd: 3, fx: { shield: 0.2 } },
  { id: 'p_light', cls: 'priest', name: '치유의 빛', desc: '체력 12% 회복하며 빛으로 때려요(×1.2)', cost: 2, cd: 0, starter: true, fx: { dmg: 1.2, heal: 0.12 } },
  { id: 'p_smite', cls: 'priest', name: '심판', desc: '신앙을 모두 써서 내리쳐요(×1.3, 신앙 하나마다 +0.5)', cost: 3, cd: 0, starter: true, fx: { dmg: 1.3, spend: true, perReagent: 0.5 } },
  { id: 'p_cleanse', cls: 'priest', name: '정화', desc: '독을 씻어 내고 방벽 15%', cost: 2, cd: 2, fx: { shield: 0.15, energy: 1 } },
  { id: 'p_bless', cls: 'priest', name: '가호', desc: '받는 피해가 50%로 줄고 체력 10% 회복', cost: 2, cd: 0, fx: { guard: 0.5, heal: 0.1 } },
  { id: 'p_halo', cls: 'priest', name: '성광', desc: '번개 속성 빛(×1.6)', cost: 3, cd: 0, fx: { dmg: 1.6, elem: 'bolt' } },
  { id: 'p_prayer', cls: 'priest', name: '기도', desc: '기력 +3(주 계열이면 신앙도 쌓여요, 3턴 뒤 다시)', cost: 1, cd: 3, fx: { energy: 3 } },
];
export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const skillsOf = (c: Cls) => SKILLS.filter((s) => s.cls === c);
export const starters = (c: Cls) => skillsOf(c).filter((s) => s.starter).map((s) => s.id);

/** 경험치·레벨: 다음 레벨까지 25+15×레벨 */
export const xpNeed = (lvl: number) => 25 + 15 * lvl;
export function levelOf(xp: number): { lvl: number; into: number; need: number } {
  let lvl = 1, left = Math.max(0, xp);
  while (lvl < MAX_LEVEL && left >= xpNeed(lvl)) { left -= xpNeed(lvl); lvl++; }
  return { lvl, into: lvl >= MAX_LEVEL ? 0 : left, need: lvl >= MAX_LEVEL ? 0 : xpNeed(lvl) };
}
/** 레벨이 주는 스탯과 스킬 포인트(홀수 레벨마다 1점) */
export const levelBonus = (lvl: number) => ({ hp: 6 * (lvl - 1), atk: Math.floor((lvl - 1) / 2), def: Math.floor((lvl - 1) / 4) });
export const skillPoints = (lvl: number) => Math.floor((lvl + 1) / 2);
export const rankOf = (ranks: Record<string, number>, id: string) => ranks[id] ?? (SKILL_BY_ID[id]?.starter ? 1 : 0);
/** 쓴 포인트: 시작 스킬의 첫 랭크는 공짜 */
export const spentPoints = (ranks: Record<string, number>) => Object.entries(ranks).reduce((a, [id, r]) => a + Math.max(0, r - (SKILL_BY_ID[id]?.starter ? 1 : 0)), 0);
export const freePoints = (lvl: number, ranks: Record<string, number>) => skillPoints(lvl) - spentPoints(ranks);
/** 장착 칸: 배운 스킬만, 최대 5칸, 주 계열이 아닌 스킬은 2칸까지 */
/** `sub`가 null이면 부 직업이 없어 주 직업 스킬만, undefined면 제한 없이(옛 규칙·테스트용) 다른 계열을 2칸까지 */
export const validSlots = (cls: Cls, ranks: Record<string, number>, slots: string[], sub?: Cls | null) => {
  let cross = 0; const out: string[] = [];
  for (const id of slots) {
    const sk = SKILL_BY_ID[id]; if (!sk || rankOf(ranks, id) < 1 || out.includes(id) || out.length >= SLOT_COUNT) continue;
    if (sk.cls !== cls) { if ((sub !== undefined && sk.cls !== sub) || cross >= CROSS_SLOTS) continue; cross++; }
    out.push(id);
  }
  return out;
};
export const defaultSlots = (cls: Cls) => starters(cls);

/** 유물(탐험 한 번 동안만 유효): 3층마다 후보 3개 중 하나를 고른다 */
export interface Relic { id: string; name: string; desc: string; /** 계열 유물: 그 계열로 들어갔을 때만 후보에 나온다 */ cls?: Cls }
export const RELICS: Relic[] = [
  { id: 'blade', name: '날카로운 칼날', desc: '공격 +3' }, { id: 'plate', name: '두꺼운 갑옷', desc: '방어 +3' }, { id: 'heart', name: '강인한 심장', desc: '최대 체력 +20' },
  { id: 'flame', name: '불꽃 인장', desc: '불 속성 피해 ×1.3' }, { id: 'frost', name: '서리 인장', desc: '얼음 속성 피해 ×1.3' }, { id: 'spark', name: '번개 인장', desc: '번개 속성 피해 ×1.3' },
  { id: 'thorn', name: '가시 갑옷', desc: '받은 피해의 30%를 돌려줘요' }, { id: 'flow', name: '기력의 샘', desc: '턴마다 기력이 1 더 차요' }, { id: 'lens', name: '약점 렌즈', desc: '약점 배율이 1.5에서 1.8로' },
  { id: 'vamp', name: '흡혈 이빨', desc: '준 피해의 15%만큼 체력 회복' }, { id: 'scroll', name: '서두름 두루마리', desc: '스킬 기력이 1 덜 들어요(최소 1)' }, { id: 'edge', name: '선제의 인장', desc: '층의 첫 공격이 ×1.5' },
  { id: 'banner', name: '피의 깃발', desc: '맞을 때 기세가 2씩 쌓여요', cls: 'warrior' }, { id: 'prism', name: '공명의 프리즘', desc: '약점 배율이 0.1이 아니라 0.3 더 붙어요', cls: 'mage' },
  { id: 'shadow', name: '그림자 장갑', desc: '콤보 하나당 12%', cls: 'rogue' }, { id: 'sage', name: '현자의 돌', desc: '시약·태엽·영혼·열·신앙을 쓰는 스킬이 30% 더 세요', cls: 'alchemist' },
  { id: 'oath_blade', name: '맹세의 검', desc: '자세가 맞으면 받는 피해가 절반', cls: 'swordsman' }, { id: 'quiver', name: '명사수의 화살통', desc: '주 계열 사격이 35% 더 세요', cls: 'hunter' },
  { id: 'lich', name: '리치의 반지', desc: '하수인이 2턴 더 머물러요', cls: 'necro' }, { id: 'anvil', name: '검은 모루', desc: '열이 2씩 올라요', cls: 'smith' },
];
export const RELIC_BY_ID: Record<string, Relic> = Object.fromEntries(RELICS.map((r) => [r.id, r]));
export const RELIC_EVERY = 3;
/** floor층을 깬 뒤(3·6·9·…층) 고르는 유물 후보 3개: 날짜·층으로 고정, 이미 가진 것은 빠진다 */
export function relicChoices(day: number, floor: number, owned: string[], cls?: Cls): Relic[] {
  const pool = RELICS.filter((r) => !owned.includes(r.id) && (!r.cls || r.cls === cls));
  return [...pool].sort((a, b) => hash(day, floor * 13 + RELICS.indexOf(a), 140) - hash(day, floor * 13 + RELICS.indexOf(b), 140)).slice(0, 3);
}
export const hasRelic = (relics: string[], id: string) => relics.includes(id);

/** 직업 부여(성당): 누적 지출(`spent`)이 문턱에 닿을 때마다 한 번, 받지 않은 직업 중 3개가 후보로 나오고 하나를 고른다.
 *  후보는 저장에 들어 있는 시드와 받은 횟수로 정해져서 다시 열어도 같다(새로고침으로 바꿀 수 없다). 마나를 내는 것이 아니라 문턱만 본다. */
export const GRANT_NEED = [500, 3000, 6000, 10000, 15000, 21000, 28000, 36000, 45000, 55000, 66000, 78000];
/** 부 직업을 켤 수 있게 되는 누적 지출(마나를 내는 게 아니라 문턱만 본다) */
export const SUB_NEED = 5000;
export const grantNeed = (owned: Cls[]) => GRANT_NEED[owned.length] ?? null;
export const grantReady = (spent: number, owned: Cls[]) => { const n = grantNeed(owned); return n !== null && spent >= n; };
export function grantChoices(seed: number, owned: Cls[]): Cls[] {
  const pool = CLS_LIST.filter((c) => !owned.includes(c));
  return [...pool].sort((a, b) => hash(seed, owned.length * 31 + CLS_LIST.indexOf(a), 150) - hash(seed, owned.length * 31 + CLS_LIST.indexOf(b), 150)).slice(0, 3);
}
