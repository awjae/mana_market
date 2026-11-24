/**
 * 판타지 달력 "건국력"과 현실 시간의 연결.
 * - 현실의 하루 = 게임의 하루. 날짜는 한국 표준시(KST) 자정에 바뀐다 → 같은 순간에 접속한 모두가 같은 날을 산다.
 * - 1년 = 12개월 × 30일 + 연말 축제 5일 = 365일, 1주 = 6일(여섯 원소의 날).
 * - 현실의 윤년과는 무관하게 판타지 달력은 항상 365일이다.
 */
export const KST_OFFSET_MS = 9 * 3600 * 1000;
const DAY_MS = 86400000;
/** 게임 0일 = 현실의 2026-01-01 (KST) */
const EPOCH_DAY = Math.floor(Date.UTC(2026, 0, 1) / DAY_MS);
export const ERA = '건국력';
export const START_YEAR = 1024;

/** 현실 시각 → 게임 날짜 번호(0부터) */
export const dayIndexAt = (nowMs: number) => Math.max(0, Math.floor((nowMs + KST_OFFSET_MS) / DAY_MS) - EPOCH_DAY);
/** 다음 날(왕국의 자정 종소리)까지 남은 시간(ms) */
export const msUntilNextDay = (nowMs: number) => DAY_MS - ((nowMs + KST_OFFSET_MS) % DAY_MS);

export type Season = '봄' | '여름' | '가을' | '겨울';
export const MONTHS: { name: string; season: Season }[] = [
  { name: '새싹달', season: '봄' }, { name: '꽃바람달', season: '봄' }, { name: '푸른잎달', season: '봄' },
  { name: '햇살달', season: '여름' }, { name: '소나기달', season: '여름' }, { name: '불꽃달', season: '여름' },
  { name: '수확달', season: '가을' }, { name: '단풍달', season: '가을' }, { name: '서리달', season: '가을' },
  { name: '눈꽃달', season: '겨울' }, { name: '별빛달', season: '겨울' }, { name: '긴밤달', season: '겨울' },
];
/** 12월 30일 다음에 오는 5일의 축제 (요일이 없다) */
export const FESTIVAL_DAYS = ['해넘이제', '달맞이제', '별빛제', '용의 날', '새벽맞이제'];
/** 여섯 원소의 날 */
export const WEEKDAYS = ['해의날', '달의날', '불의날', '물의날', '바람의날', '땅의날'];

/** 달력에 표시할 절기·기념일 [월, 일, 이름, 설명] */
export const HOLIDAYS: [number, number, string, string][] = [
  [1, 1, '새해맞이', '왕국이 한 해의 첫 종을 울리는 날'],
  [2, 15, '꽃비 축제', '광장에 꽃잎이 흩날리는 봄 축제'],
  [4, 1, '햇살 장터', '길드들이 노점을 가장 크게 여는 날'],
  [6, 30, '한여름 불꽃제', '밤하늘에 마법 불꽃이 오르는 날'],
  [8, 15, '풍년제', '곡물 상단이 한 해 수확을 자랑하는 날'],
  [10, 1, '첫눈맞이', '마법사 탑이 첫눈을 알리는 날'],
  [12, 30, '긴밤 전야', '한 해의 마지막 밤을 지새우는 날'],
];

export interface FantasyDate {
  year: number;
  /** 1~12, 축제일이면 0 */
  month: number;
  day: number;
  /** 0~5, 축제일이면 -1 */
  weekday: number;
  monthName: string;
  weekdayName: string;
  season: Season;
  /** 연중 며칠째(0부터) */
  dayOfYear: number;
  /** 축제일이면 그 이름 */
  festival?: string;
  /** 절기·기념일 */
  holiday?: { name: string; note: string };
}

export function fantasyDate(dayIdx: number): FantasyDate {
  const idx = Math.max(0, Math.floor(dayIdx));
  const year = START_YEAR + Math.floor(idx / 365);
  const doy = idx % 365;
  if (doy >= 360) {
    const f = doy - 360;
    return { year, month: 0, day: f + 1, weekday: -1, monthName: '축제', weekdayName: '', season: '겨울', dayOfYear: doy, festival: FESTIVAL_DAYS[f] };
  }
  const month = Math.floor(doy / 30) + 1, day = (doy % 30) + 1, weekday = doy % 6;
  const h = HOLIDAYS.find(([m, d]) => m === month && d === day);
  return {
    year, month, day, weekday, monthName: MONTHS[month - 1].name, weekdayName: WEEKDAYS[weekday], season: MONTHS[month - 1].season, dayOfYear: doy,
    holiday: h ? { name: h[2], note: h[3] } : undefined,
  };
}

/** 짧은 표기: "소나기달 12일", 축제일은 "별빛제" */
export const dateShort = (dayIdx: number) => {
  const d = fantasyDate(dayIdx);
  return d.festival ?? `${d.monthName} ${d.day}일`;
};
/** 정식 표기: "건국력 1024년 소나기달 12일 불의날" */
export const dateLong = (dayIdx: number) => {
  const d = fantasyDate(dayIdx);
  return d.festival ? `${ERA} ${d.year}년 ${d.festival}` : `${ERA} ${d.year}년 ${d.monthName} ${d.day}일 ${d.weekdayName}`;
};

/* ── 현실 시각에 맞춘 하늘 ───────────────────────────── */
export interface SkyPhase { night: number; dawn: number; day: number; dusk: number }
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** hour(0~24, 소수 가능) → 시간대 가중치(합 1). 한 시간 정도 서서히 섞인다 */
export function skyPhase(hour: number): SkyPhase {
  const h = ((hour % 24) + 24) % 24;
  const dawnIn = smooth(4.5, 6, h) - smooth(7.5, 9, h);      // 동틀 녘
  const dayW = smooth(7.5, 9, h) - smooth(16.5, 18, h);       // 낮
  const duskW = smooth(16.5, 18, h) - smooth(19.5, 21, h);    // 해질녘
  const nightW = Math.max(0, 1 - dawnIn - dayW - duskW);
  return { night: nightW, dawn: Math.max(0, dawnIn), day: Math.max(0, dayW), dusk: Math.max(0, duskW) };
}
export function phaseName(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  return h < 4.5 ? '깊은 밤' : h < 7.5 ? '동틀 녘' : h < 12 ? '아침' : h < 16.5 ? '한낮' : h < 19.5 ? '해질녘' : h < 22 ? '저녁' : '밤';
}
