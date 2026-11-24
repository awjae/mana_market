/** 2단계 서버와 말하는 얇은 클라이언트. 서버 모드에서만 쓴다(기본은 로컬 모드) */
export interface ServerConn { url: string; token: string }
export interface ServerMe { nick: string; cash: number; holdings: Record<string, { qty: number; cost: number }>; trades: import('@mana/engine').Trade[]; orders: import('@mana/engine').Order[]; fired: import('@mana/engine').Fired[]; day: number }
export interface ServerRanking { day: number; top: { rank: number; nick: string; worth: number }[]; me: number | null; total: number }

export const DEFAULT_SERVER = (import.meta.env?.VITE_API_URL as string | undefined) ?? 'http://localhost:8787';

export async function call<T>(c: { url: string; token?: string }, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(c.url.replace(/\/$/, '') + path, { method, headers: { 'content-type': 'application/json', ...(c.token ? { authorization: `Bearer ${c.token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(j.error ?? `서버 오류(${res.status})`);
  return j as T;
}
