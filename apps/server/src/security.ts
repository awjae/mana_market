import { createHash } from 'node:crypto';

/** 토큰은 DB에 평문으로 두지 않는다: 유출돼도 로그인할 수 없게 해시(sha256)만 저장한다 */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const isHash = (k: string) => /^[0-9a-f]{64}$/.test(k);

/** 고정 창 요청 제한: `hit(key)`가 false면 제한에 걸린 것. 오래된 키는 주기적으로 정리한다 */
export function createLimiter(windowMs: number, max: number, now: () => number = Date.now) {
  const m = new Map<string, { start: number; n: number }>();
  return (key: string): boolean => {
    const t = now(), e = m.get(key);
    if (!e || t - e.start >= windowMs) {
      m.set(key, { start: t, n: 1 });
      if (m.size > 5000) for (const [k, v] of m) if (t - v.start >= windowMs) m.delete(k);
      return true;
    }
    e.n++;
    return e.n <= max;
  };
}

/** 허용 출처: 환경 변수 `MANA_ORIGINS`(쉼표 구분). 비어 있으면 개발용으로 localhost만 허용한다 */
export function allowedOrigin(origin: string | undefined, list = process.env.MANA_ORIGINS): string | null {
  if (!origin) return null;
  const ok = list ? list.split(',').map((s) => s.trim()).filter(Boolean) : [];
  if (ok.includes(origin)) return origin;
  if (!list && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}
