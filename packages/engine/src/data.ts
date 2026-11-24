import type { EventTemplate, Sector, Stock } from './types';

export const SECTORS: Sector[] = [
  { id: 'arms', name: '무기·방어' },
  { id: 'farm', name: '농업' },
  { id: 'magic', name: '마법' },
  { id: 'trade', name: '해운·무역' },
  { id: 'finance', name: '금융' },
];

export const STOCKS: Stock[] = [
  { id: 'IRON', name: '철혈 대장장이 길드', sectorId: 'arms', startPrice: 120, beta: 1.0, idioVol: 0.0221 },
  { id: 'MERC', name: '붉은 방패 용병단', sectorId: 'arms', startPrice: 85, beta: 1.1, idioVol: 0.0312 },
  { id: 'GRAN', name: '황금이삭 곡물 상단', sectorId: 'farm', startPrice: 60, beta: 0.9, idioVol: 0.0169 },
  { id: 'RNCH', name: '푸른언덕 목장 조합', sectorId: 'farm', startPrice: 45, beta: 1.0, idioVol: 0.0208 },
  { id: 'TOWR', name: '별빛 마법사 탑', sectorId: 'magic', startPrice: 200, beta: 1.2, idioVol: 0.0364 },
  { id: 'ALCH', name: '연금술사 협회', sectorId: 'magic', startPrice: 75, beta: 1.1, idioVol: 0.0312 },
  { id: 'SHIP', name: '서풍 해운 상단', sectorId: 'trade', startPrice: 140, beta: 1.0, idioVol: 0.0234 },
  { id: 'SPCE', name: '은빛 향신료 상회', sectorId: 'trade', startPrice: 95, beta: 1.0, idioVol: 0.0273 },
  { id: 'BANK', name: '왕립 금고 은행', sectorId: 'finance', startPrice: 310, beta: 0.8, idioVol: 0.0143 },
  { id: 'INSR', name: '금사자 보험조합', sectorId: 'finance', startPrice: 150, beta: 0.8, idioVol: 0.0156 },
];

const AFTERSHOCK = [1, 0.5, 0.25];
const OVERREACTION = [1.6, -0.5, -0.3]; // 과잉 반응 후 일부 되돌림

export const TEMPLATES: EventTemplate[] = [
  {
    id: 'stock_contract', scope: 'stock', tone: 'good', weight: 3,
    impacts: [{ to: 'target', magnitude: 0.04 }],
    schedule: AFTERSHOCK, rumorChance: 0.4, rumorAccuracy: 0.7, rumorLead: [1, 2],
    disclosure: '{target}, 대형 수주 계약 체결을 공시',
    rumor: '{target}이(가) 대형 수주를 앞두고 있다는 소문이 돈다',
  },
  {
    id: 'stock_fire', scope: 'stock', tone: 'bad', weight: 3,
    impacts: [{ to: 'target', magnitude: -0.07 }],
    schedule: OVERREACTION, rumorChance: 0.15, rumorAccuracy: 0.6, rumorLead: [1, 1],
    disclosure: '{target}, 창고 화재로 큰 손실 발생을 공시',
    rumor: '{target}에 심각한 사고가 있었다는 소문이 퍼진다',
  },
  {
    id: 'stock_dilution', scope: 'stock', tone: 'bad', weight: 2,
    impacts: [{ to: 'target', magnitude: -0.045 }], // 유상증자: 주식 수가 늘어 한 주의 몫이 줄어든다
    schedule: [1, 0.4, 0.2], rumorChance: 0.45, rumorAccuracy: 0.65, rumorLead: [1, 3],
    disclosure: '{target}, 대규모 유상증자 결정을 공시',
    rumor: '{target}이(가) 자금 마련을 위해 새 주식을 찍어 낼 거라는 소문이 돈다',
  },
  {
    id: 'stock_buyback', scope: 'stock', tone: 'good', weight: 2,
    impacts: [{ to: 'target', magnitude: 0.03 }], // 자사주 매입: 시장에 도는 주식이 줄어든다
    schedule: AFTERSHOCK, rumorChance: 0.35, rumorAccuracy: 0.7, rumorLead: [1, 2],
    disclosure: '{target}, 자사주 매입과 소각을 공시',
    rumor: '{target}이(가) 자기 주식을 사들일 거라는 소문이 돈다',
  },
  {
    id: 'stock_scandal', scope: 'stock', tone: 'bad', weight: 2,
    impacts: [{ to: 'target', magnitude: -0.08 }], // 회계 부정 의혹: 드물지만 큰 악재
    schedule: [1, 0.55, 0.3, 0.15], rumorChance: 0.4, rumorAccuracy: 0.55, rumorLead: [1, 3],
    disclosure: '왕실 감사원, {target}의 장부 조작 혐의를 공식 조사한다고 공시',
    rumor: '{target}의 장부에 이상한 구멍이 있다는 소문이 돈다',
  },
  {
    id: 'stock_collapse', scope: 'stock', tone: 'bad', weight: 1,
    impacts: [{ to: 'target', magnitude: -0.11 }], // 핵심 시설 붕괴·거래처 파산 같은 갑작스러운 대형 악재
    schedule: OVERREACTION, rumorChance: 0.15, rumorAccuracy: 0.5, rumorLead: [1, 1],
    disclosure: '{target}, 핵심 창고 화재와 거래처 파산으로 영업 차질 공시',
    rumor: '{target}의 창고에서 큰 불이 났다는 이야기가 들린다',
  },
  {
    id: 'stock_windfall', scope: 'stock', tone: 'good', weight: 1,
    impacts: [{ to: 'target', magnitude: 0.11 }], // 왕실 특허·독점 계약 같은 갑작스러운 대형 호재
    schedule: OVERREACTION, rumorChance: 0.15, rumorAccuracy: 0.55, rumorLead: [1, 1],
    disclosure: '{target}, 왕실 독점 납품권을 따냈다고 공시',
    rumor: '{target}이(가) 궁정과 큰 계약을 맺을지 모른다는 말이 돈다',
  },
  {
    id: 'stock_discovery', scope: 'stock', tone: 'good', weight: 2,
    impacts: [{ to: 'target', magnitude: 0.08 }], // 신규 광맥·항로 등 뜻밖의 호재
    schedule: [1, 0.5, 0.25], rumorChance: 0.3, rumorAccuracy: 0.6, rumorLead: [1, 2],
    disclosure: '{target}, 새로운 사업 거점을 확보했다고 공시',
    rumor: '{target}이(가) 큰 건수를 잡았다는 소문이 돈다',
  },
  {
    id: 'sector_blight', scope: 'sector', tone: 'bad', weight: 2, sectors: ['farm'],
    impacts: [
      { to: 'target', magnitude: -0.03 },
      { to: { sector: 'trade' }, magnitude: -0.01 },
    ],
    schedule: AFTERSHOCK, rumorChance: 0.5, rumorAccuracy: 0.6, rumorLead: [1, 3],
    disclosure: '왕국 농무청, 북부 흉작으로 {target} 업종 수확량 급감 발표',
    rumor: '북부 농지에 병충해가 번지고 있다는 소문이 돈다',
  },
  {
    id: 'sector_route', scope: 'sector', tone: 'good', weight: 2, sectors: ['trade'],
    impacts: [
      { to: 'target', magnitude: 0.03 },
      { to: { sector: 'farm' }, magnitude: 0.01 },
    ],
    schedule: AFTERSHOCK, rumorChance: 0.5, rumorAccuracy: 0.65, rumorLead: [1, 3],
    disclosure: '동방 신규 항로 개통, {target} 업종 교역량 증가 전망',
    rumor: '새 항로가 곧 열린다는 소문이 항구에 퍼진다',
  },
  {
    id: 'kingdom_war', scope: 'kingdom', tone: 'mixed', weight: 1,
    impacts: [
      { to: { sector: 'arms' }, magnitude: 0.04 },
      { to: { sector: 'magic' }, magnitude: 0.015 },
      { to: { sector: 'farm' }, magnitude: 0.02, flipChance: 0.4 }, // 징발: 호재일지 악재일지 불확실
      { to: { sector: 'trade' }, magnitude: -0.02 },
      { to: { sector: 'finance' }, magnitude: -0.015 },
    ],
    schedule: [1, 0.7, 0.4], rumorChance: 0.6, rumorAccuracy: 0.6, rumorLead: [1, 3],
    disclosure: '{target}, 인접국과 전쟁 선포. 군수 물자 징발령 발동',
    rumor: '국경에서 대규모 군대가 움직인다는 소문이 돈다',
  },
  {
    id: 'kingdom_festival', scope: 'kingdom', tone: 'good', weight: 1,
    impacts: [{ to: 'all', magnitude: 0.012 }],
    schedule: AFTERSHOCK, rumorChance: 0.5, rumorAccuracy: 0.7, rumorLead: [1, 2],
    disclosure: '{target} 대축제 개최, 소비 활황 기대',
    rumor: '왕실이 대규모 축제를 준비 중이라는 소문이 돈다',
  },
  {
    id: 'sector_harvest', scope: 'sector', tone: 'good', weight: 2, sectors: ['farm'],
    impacts: [
      { to: 'target', magnitude: 0.03 },
      { to: { sector: 'trade' }, magnitude: 0.01 },
    ],
    schedule: AFTERSHOCK, rumorChance: 0.4, rumorAccuracy: 0.7, rumorLead: [1, 2],
    disclosure: '풍년 소식, {target} 업종 수확량 대폭 증가',
    rumor: '올해 곡창지대가 대풍년이라는 소문이 돈다',
  },
  {
    id: 'sector_pirates', scope: 'sector', tone: 'bad', weight: 2, sectors: ['trade'],
    impacts: [
      { to: 'target', magnitude: -0.03 },
      { to: { sector: 'finance' }, magnitude: -0.01 }, // 보험금 지급
    ],
    schedule: AFTERSHOCK, rumorChance: 0.3, rumorAccuracy: 0.6, rumorLead: [1, 2],
    disclosure: '해적 출몰로 {target} 업종 선박 피해 잇따라',
    rumor: '남해에서 상선이 사라지고 있다는 소문이 돈다',
  },
  {
    id: 'sector_manastorm', scope: 'sector', tone: 'bad', weight: 2, sectors: ['magic'],
    impacts: [{ to: 'target', magnitude: -0.035 }],
    schedule: OVERREACTION, rumorChance: 0.2, rumorAccuracy: 0.6, rumorLead: [1, 1],
    disclosure: '마나 폭풍으로 {target} 업종 시설 가동 중단',
    rumor: '마나의 흐름이 불안정하다는 소문이 돈다',
  },
  {
    id: 'kingdom_plague', scope: 'kingdom', tone: 'bad', weight: 1,
    impacts: [
      { to: { sector: 'farm' }, magnitude: -0.03 },
      { to: { sector: 'trade' }, magnitude: -0.025 },
      { to: { sector: 'magic' }, magnitude: 0.02, flipChance: 0.3 }, // 치유 수요: 호재일지 악재일지 불확실
      { to: { sector: 'finance' }, magnitude: -0.01 },
    ],
    schedule: [1, 0.75, 0.5, 0.25], rumorChance: 0.55, rumorAccuracy: 0.55, rumorLead: [1, 3],
    disclosure: '{target}, 남부 역병 확산으로 일부 항구와 시장 봉쇄령',
    rumor: '남부 마을에서 이상한 열병이 돈다는 소문이 퍼진다',
  },
  {
    id: 'kingdom_taxcut', scope: 'kingdom', tone: 'good', weight: 1,
    impacts: [
      { to: { sector: 'trade' }, magnitude: 0.025 },
      { to: { sector: 'finance' }, magnitude: 0.02 },
      { to: { sector: 'farm' }, magnitude: 0.01 },
    ],
    schedule: [1, 0.6, 0.3], rumorChance: 0.45, rumorAccuracy: 0.65, rumorLead: [1, 3],
    disclosure: '{target}, 상거래 세율 인하 칙령 공포',
    rumor: '왕실이 세율을 손본다는 이야기가 궁정에서 흘러나온다',
  },
  {
    id: 'sector_ironvein', scope: 'sector', tone: 'good', weight: 1, sectors: ['arms'],
    impacts: [
      { to: 'target', magnitude: 0.022 },
      { to: { sector: 'trade' }, magnitude: 0.005 },
    ],
    schedule: AFTERSHOCK, rumorChance: 0.4, rumorAccuracy: 0.6, rumorLead: [1, 2],
    disclosure: '북쪽 채석장에서 대형 철광맥 발견, {target} 업종 원료 수급 개선',
    rumor: '북쪽 채석장 깊은 곳에서 새 광맥이 나왔다는 소문이 돈다',
  },
  {
    id: 'sector_recall', scope: 'sector', tone: 'bad', weight: 1, sectors: ['arms'],
    impacts: [{ to: 'target', magnitude: -0.03 }], // 무기 결함 회수
    schedule: AFTERSHOCK, rumorChance: 0.4, rumorAccuracy: 0.6, rumorLead: [1, 2],
    disclosure: '왕국 병기창, 일부 무구의 결함을 확인하고 {target} 업종 납품분 회수 명령',
    rumor: '납품된 검과 방패에서 금이 발견됐다는 소문이 돈다',
  },
  {
    id: 'sector_baddebt', scope: 'sector', tone: 'bad', weight: 1, sectors: ['finance'],
    impacts: [{ to: 'target', magnitude: -0.03 }], // 대출 부실
    schedule: AFTERSHOCK, rumorChance: 0.4, rumorAccuracy: 0.6, rumorLead: [1, 2],
    disclosure: '대형 상단의 대출 상환 지연으로 {target} 업종 부실 채권 충당금 확대 공시',
    rumor: '큰 상단이 빚을 제때 못 갚고 있다는 소문이 돈다',
  },
  {
    id: 'sector_deposits', scope: 'sector', tone: 'good', weight: 2, sectors: ['finance'],
    impacts: [
      { to: 'target', magnitude: 0.025 },
      { to: { sector: 'trade' }, magnitude: 0.005 },
    ],
    schedule: AFTERSHOCK, rumorChance: 0.4, rumorAccuracy: 0.65, rumorLead: [1, 3],
    disclosure: '왕국 예금 총액이 사상 최대를 기록, {target} 업종 자금 여력 확대',
    rumor: '상인들이 금고에 맡기는 돈이 부쩍 늘었다는 소문이 돈다',
  },
  {
    id: 'sector_research', scope: 'sector', tone: 'good', weight: 1, sectors: ['magic'],
    impacts: [
      { to: 'target', magnitude: 0.025 },
      { to: { sector: 'arms' }, magnitude: 0.005 },
    ],
    schedule: AFTERSHOCK, rumorChance: 0.4, rumorAccuracy: 0.6, rumorLead: [1, 3],
    disclosure: '마법사 탑 연합, 새 마법 이론 발표로 {target} 업종 연구 성과 공개',
    rumor: '마탑에서 큰 연구 성과가 나왔다는 소문이 돈다',
  },
  {
    id: 'kingdom_peace', scope: 'kingdom', tone: 'mixed', weight: 1,
    impacts: [
      { to: { sector: 'arms' }, magnitude: -0.03 },
      { to: { sector: 'trade' }, magnitude: 0.02 },
      { to: { sector: 'finance' }, magnitude: 0.01 },
      { to: { sector: 'farm' }, magnitude: 0.01 },
    ],
    schedule: [1, 0.7, 0.4], rumorChance: 0.5, rumorAccuracy: 0.6, rumorLead: [1, 3],
    disclosure: '{target}, 인접국과 평화 협정 체결',
    rumor: '인접국과 비밀 협상이 진행 중이라는 소문이 돈다',
  },
];
