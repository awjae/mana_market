import { fantasyDate, skyPhase, weatherKind } from '../calendar';
import { DEFAULT_CONFIG as cfg, type MarketState } from '@mana/engine';
import type { Npc } from './npcs';
import { GROUP_OF, REACT_D, REACT_R, movedLine, movedYesterday } from './npcReact';

/** 직업 이름과, 그 직업이 귀 기울이는 업종(없으면 왕국 전체 소식) */
const ROLE: Record<string, { name: string; sectors?: string[] }> = {
  villager: { name: '마을 주민' }, noble: { name: '귀족', sectors: ['finance'] }, guard: { name: '경비병', sectors: ['arms'] }, merchant: { name: '상인', sectors: ['trade', 'farm'] },
  smith: { name: '대장장이', sectors: ['arms'] }, soldier: { name: '용병', sectors: ['arms'] }, miner: { name: '광부', sectors: ['arms'] }, farmer: { name: '농부', sectors: ['farm'] },
  shepherd: { name: '양치기', sectors: ['farm'] }, sailor: { name: '선원', sectors: ['trade'] }, mage: { name: '마법사', sectors: ['magic'] }, alchemist: { name: '연금술사', sectors: ['magic'] },
  clerk: { name: '금고지기', sectors: ['finance'] },
};
const ANIMAL: Record<string, { name: string; sound: string[] }> = {
  chicken: { name: '닭', sound: ['꼬꼬꼬!', '꼬꼭?', '꼬끼오~'] }, sheep: { name: '양', sound: ['메에~', '메에에…', '메헤!'] }, dog: { name: '강아지', sound: ['멍멍!', '왕!', '멍!'] },
  cat: { name: '고양이', sound: ['야옹~', '냐앙…', '그르릉.'] }, duck: { name: '오리', sound: ['꽥꽥!', '꽥?', '꽤액~'] }, gull: { name: '갈매기', sound: ['끼룩끼룩!', '끼룩~', '끼루룩!'] },
};
/** 소식이 없는 날의 한마디(시세 전망이나 매매 권유는 하지 않는다) */
const FLAVOR: Record<string, string[]> = {
  villager: ['오늘도 분수 광장은 북적이네요.', '장터에서 갓 구운 빵 냄새가 나요.', '게시판에 새 소식이 붙었는지 한번 보세요.', '요즘 마을이 활기가 넘쳐요.', '아침마다 종소리에 맞춰 눈을 떠요.', '우리 집 고양이가 또 지붕에 올라갔지 뭐예요.', '광장 가로등이 켜지면 마을이 제일 예뻐요.'],
  noble: ['금고 앞은 언제나 줄이 길군.', '왕국의 자정 종소리를 들으면 하루가 끝났다는 걸 느끼지.', '성 위에서 내려다보면 마을이 장난감 같아.', '요즘 연회 음식이 영 짜서 말이야.', '품위란 서두르지 않는 데서 나오는 법이지.', '이 마을의 빵집은 궁정 요리사보다 낫더군.'],
  guard: ['성문은 제가 지킵니다. 수상한 자는 없군요.', '근무 중입니다. 말은 걸어도 좋습니다.', '밤 순찰 때 보는 별이 제일 좋습니다.', '창이 무거워도 어깨를 펴야 합니다.', '성문 앞 자갈이 반질반질해졌군요. 다 우리 발자국입니다.', '교대 시간까지 한참 남았습니다.'],
  merchant: ['싱싱한 물건이 들어왔어요!', '구경만 해도 괜찮아요. 천천히 보세요.', '오늘은 향신료가 잘 팔려요.', '저울은 정직하게, 인심은 후하게가 제 원칙이에요.', '가판 차양을 새로 달았는데 어때요?', '단골이 생기면 하루가 달라져요.'],
  smith: ['쇠는 두드릴수록 단단해지지.', '불길이 오늘따라 곱구먼.', '모루 소리가 마을 박자 같다고들 하더군.', '좋은 칼은 식힐 때 서두르지 않아.', '숯 냄새가 몸에 뱄어. 이젠 이게 내 향수지.', '망치 자루는 손때가 묻어야 제맛이야.'],
  soldier: ['훈련은 힘들지만 보람 있지!', '검을 휘두르는 소리가 들리나?', '허수아비도 오래 맞으니 정이 들더라.', '단장님은 무서워도 밥은 제일 먼저 챙겨 주셔.', '모래바닥에서 구르면 다음 날이 뻐근해.', '방패 문장을 닦는 게 아침 일과야.'],
  miner: ['돌 틈에서 붉은 광석이 나오곤 한다네.', '곡괭이질은 어깨가 뻐근해.', '채석장은 아침 공기가 제일 시원해.', '돌을 두드려 보면 속이 찼는지 비었는지 소리로 알아.', '갱도에서 나오면 햇빛이 눈부셔서 한참 눈을 못 떠.', '오늘은 바위가 순순히 쪼개지는군.'],
  farmer: ['이삭이 노랗게 익어 가는군.', '허수아비가 오늘도 든든히 밭을 지켜.', '밭고랑은 곧게 낼수록 마음도 곧아져.', '새벽 이슬 맞은 밀이 제일 달아.', '해 뜨기 전에 일어나면 하루가 길어서 좋아.', '까마귀가 허수아비를 무서워 안 하네, 허허.'],
  shepherd: ['양들이 풀을 잘 먹어서 흐뭇하네.', '울타리 밖으로 나가면 안 돼!', '저 하얀 녀석이 대장이야. 다들 따라다니거든.', '양털 깎는 날엔 온 마을이 도와주지.', '개가 있으니 늑대 걱정은 없어.', '풀밭에 누워 구름 세는 게 내 낙이야.'],
  sailor: ['호수 바람이 시원하군.', '돛을 손보는 중이야. 곧 출항이지.', '부두 끝에서 보는 노을이 일품이야.', '밧줄 매듭은 열 가지쯤 할 줄 알지.', '물이 잔잔한 날은 배도 졸려 해.', '갈매기들이 오늘따라 시끄럽군.'],
  mage: ['마나의 흐름이 오늘은 고요하군.', '탑 위의 수정이 은은히 빛나는 게 보이나?', '별이 선명한 밤엔 주문이 잘 풀려.', '마법은 외우는 게 아니라 느끼는 거라네.', '지팡이가 오늘은 따뜻하군. 좋은 징조야.', '책 먼지를 털다가 낡은 지도를 찾았지 뭔가.'],
  alchemist: ['솥이 끓는 소리가 좋구나. 곧 완성이야.', '버섯 향이 섞이면 색이 달라지지.', '실패한 약도 모으면 비료로 쓸 만하더라고.', '늪 근처 이끼는 약재 중에서도 귀한 편이야.', '레시피는 적어 두되 손맛은 못 적어.', '유리병이 깨질 때마다 새로 배우는 게 있지.'],
  clerk: ['금고는 언제나 단단히 잠겨 있습니다.', '장부는 틀림이 없어야 하지요.', '잉크 냄새를 맡으면 마음이 차분해집니다.', '한 푼의 오차도 하루를 길게 만들지요.', '창구는 정해진 시간에 열고 닫습니다.', '숫자는 정직합니다. 확인하는 사람이 바쁠 뿐이죠.'],
};
const GOSSIP_R = ['들었어? ', '귓속말인데, ', '확실하진 않지만 ', '장터에서 주워들었는데, ', '아직 모르는 사람이 많은데, '];
const GOSSIP_D = ['공시 봤어? ', '게시판에 붙었더라. ', '방금 공고가 났어. ', '공식 발표래. '];
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export interface Talk { who: string; text: string }
/** 일반 NPC의 한마디(머리 위 말풍선이라 짧게). 직업과 관련된 소식이 있으면 그 얘기를 한다. 투자 조언은 하지 않는다 */
const SKY: Record<string, string[]> = {
  rain: ['오늘도 비가 오네요. 우산 챙기셨어요?', '비 오는 날엔 장터가 한산해요.', '빗소리 들으며 장부 보기 딱 좋은 날이죠.'],
  snow: ['눈이 오네요! 길이 미끄러우니 조심해요.', '하얗게 덮인 마을, 예쁘죠?', '이런 날엔 따뜻한 수프가 최고예요.'],
  cloud: ['하늘이 잔뜩 흐렸네요.', '구름이 낮게 깔렸어요. 곧 비가 오려나?'],
  clear: ['날씨가 참 좋죠?', '맑은 날엔 괜히 기분이 좋아져요.'],
};
/** 계절·시간대 분위기 한마디(사실이나 분위기만) */
const SEASON: Record<string, string[]> = {
  봄: ['꽃내음이 바람에 실려 오네요.', '봄볕이 포근해서 졸음이 와요.', '밭마다 새싹이 올라오고 있어요.'],
  여름: ['한낮엔 그늘이 최고예요.', '호수 물빛이 눈부셔요.', '장마철엔 빨래가 안 말라서 큰일이에요.'],
  가을: ['낙엽 밟는 소리가 좋아요.', '곡식 익는 냄새가 구수해요.', '해가 짧아져서 저녁이 금방 와요.'],
  겨울: ['입김이 하얗게 나와요.', '난롯가가 제일 좋은 자리예요.', '눈 쌓인 지붕이 꼭 케이크 같아요.'],
};
const TIMEOF: Record<string, string[]> = {
  night: ['밤이 깊었네요. 가로등이 참 따뜻해 보여요.', '별이 쏟아질 것 같아요.', '이 시간엔 마을이 조용해서 좋아요.'],
  dawn: ['동이 트는 소리가 들려요.', '새벽 공기가 맑아요.', '일찍 일어나는 새가 먼저 하루를 봐요.'],
  day: ['한낮의 햇살이 좋네요.', '점심은 드셨어요?', '분수 소리가 시원하게 들려요.'],
  dusk: ['노을이 곱게 졌네요.', '해 질 녘엔 괜히 마음이 느긋해져요.', '집집마다 저녁 짓는 연기가 올라와요.'],
};
const lastSaid = new Map<string, string>();
/** 직전과 같은 말은 피해서 고른다(같은 NPC를 연달아 눌러도 반복되지 않게) */
const fresh = (id: string, xs: string[]) => { const pool = xs.filter((x) => x !== lastSaid.get(id)); const t = pick(pool.length ? pool : xs); lastSaid.set(id, t); return t; };

export function npcTalk(n: Npc, market: MarketState): Talk {
  const a = ANIMAL[n.def.role];
  if (a) return { who: a.name, text: fresh(n.def.id, a.sound) };
  const r = ROLE[n.def.role] ?? ROLE.villager;
  const mine = (ids: string[]) => !r.sectors || ids.some((id) => r.sectors!.includes(cfg.stocks.find((s) => s.id === id)?.sectorId ?? ''));
  const recent = [...market.news, ...market.newsLog.filter((x) => x.day >= market.day - 3)].filter((x) => (x.scope === 'kingdom' || mine(x.targetStockIds)) && x.text.length <= 40);
  const news = (): string | null => {
    if (!recent.length || Math.random() >= 0.7) return null;
    for (let i = 0; i < 6; i++) {
      const item = pick(recent), body = item.text.replace(/[.。]$/, '');
      const react = item.kind === 'rumor' ? pick(REACT_R) : pick(REACT_D[GROUP_OF[n.def.role] ?? 'plain'][item.tone]); // 공시만 호재·악재 어조를 쓴다
      const t = item.kind === 'rumor' ? `${pick(GOSSIP_R)}${body}. ${react}` : `${pick(GOSSIP_D)}${body}. ${react}`;
      if (t !== lastSaid.get(n.def.id)) { lastSaid.set(n.def.id, t); return t; }
    }
    return null; // 같은 소식만 남았으면 다른 얘기로
  };
  const nt = news();
  if (nt) return { who: r.name, text: nt };
  if (Math.random() < 0.25) { // 소식이 없으면 가끔 어제 마감된 시세 사실
    const mv = movedYesterday(market.history, cfg.stocks.filter((x) => !r.sectors || r.sectors.includes(x.sectorId)).map((x) => x.id));
    if (mv) { const t = movedLine(mv); if (t !== lastSaid.get(n.def.id)) { lastSaid.set(n.def.id, t); return { who: r.name, text: t }; } }
  }
  const roll = Math.random(), id = n.def.id;
  if (roll < 0.22) return { who: r.name, text: fresh(id, SKY[weatherKind(market.day)]) };
  if (roll < 0.38) return { who: r.name, text: fresh(id, SEASON[fantasyDate(market.day).season]) };
  if (roll < 0.52) { const ph = skyPhase(new Date().getHours() + new Date().getMinutes() / 60); const k = (Object.entries(ph).sort((x, y) => y[1] - x[1])[0][0]) as keyof typeof ph; return { who: r.name, text: fresh(id, TIMEOF[k]) }; }
  return { who: r.name, text: fresh(id, FLAVOR[n.def.role] ?? FLAVOR.villager) };
}
