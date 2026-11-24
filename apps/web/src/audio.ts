/**
 * 8비트 효과음(WebAudio 합성, 파일 없음). 기본은 꺼져 있고 프로필에서 켠다(저장: localStorage `mana-sound`).
 * 브라우저 정책상 사용자의 첫 조작 뒤에만 소리가 난다.
 */
const KEY = 'mana-sound';
let ctx: AudioContext | null = null;
let on = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();
const subs = new Set<() => void>();

export const soundOn = () => on;
export const onSoundChange = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function setSound(v: boolean) {
  on = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* 저장소를 못 쓰는 환경 */ }
  subs.forEach((f) => f());
  if (v) blip([660, 880], 0.07); // 켰다는 확인음
}

/** 사각파 음 하나씩 이어 붙이기. freqs = 헤르츠 목록 */
function blip(freqs: number[], dur = 0.08, type: OscillatorType = 'square', vol = 0.05) {
  if (!on || typeof AudioContext === 'undefined') return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator(), g = ctx!.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t0 + i * dur); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * dur);
      o.connect(g).connect(ctx!.destination); o.start(t0 + i * dur); o.stop(t0 + (i + 1) * dur + 0.02);
    });
  } catch { /* 오디오를 못 쓰는 환경 */ }
}

export const sfx = {
  buy: () => blip([523, 659, 784], 0.07), // 도미솔: 산다
  sell: () => blip([784, 659, 523], 0.07), // 솔미도: 판다
  coin: () => blip([988, 1319], 0.09, 'square', 0.04),
  achieve: () => blip([523, 659, 784, 1047], 0.09),
  talk: () => blip([440, 554], 0.05, 'triangle', 0.06),
  morning: () => blip([392, 523, 659, 784], 0.12, 'triangle', 0.07), // 왕국의 자정 종소리 뒤 새 아침
  error: () => blip([220, 196], 0.1),
  hit: () => blip([196, 147], 0.05, 'square', 0.06), // 던전: 때렸다
  weak: () => blip([330, 523, 784], 0.05, 'square', 0.06), // 약점을 찔렀다
  hurt: () => blip([147, 110], 0.07, 'sawtooth', 0.05), // 맞았다
  guard: () => blip([262, 262], 0.05, 'triangle', 0.07),
  win: () => blip([523, 659, 784, 1047, 1319], 0.08, 'triangle', 0.07),
};
