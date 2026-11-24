import { createServer } from 'node:http';
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createApp, type Db } from './app';
import { allowedOrigin, hashToken, isHash } from './security';

/** 개발용 서버: JSON 파일에 저장한다(운영에서는 DB로 교체). `npm run dev -w @mana/server` → http://localhost:8787 */
const FILE = process.env.MANA_DB ?? 'data.json';
const BACKUPS = 7; // 최근 7개 백업을 돌려 쓴다
const load = (): Db => {
  const db: Db = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : { players: {} };
  // 옛 저장(평문 토큰 키)을 해시 키로 옮긴다
  for (const k of Object.keys(db.players)) if (!isHash(k)) { const p = db.players[k] as unknown as Record<string, unknown>; delete p.token; db.players[hashToken(k)] = db.players[k]; delete db.players[k]; }
  return db;
};
const db = load();
let dirty = false, lastBackup = 0;
/** 원자적 저장(임시 파일에 쓴 뒤 교체) + 하루 단위 백업 회전 */
const save = () => {
  writeFileSync(`${FILE}.tmp`, JSON.stringify(db)); renameSync(`${FILE}.tmp`, FILE);
  const now = Date.now();
  if (now - lastBackup > 6 * 3_600_000) { lastBackup = now; copyFileSync(FILE, `${FILE}.bak${Math.floor(now / 86_400_000) % BACKUPS}`); }
};
setInterval(() => { if (dirty) { save(); dirty = false; } }, 2000);
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => { if (dirty) save(); process.exit(0); });
const handle = createApp(db, Date.now, () => { dirty = true; });

createServer((req, res) => {
  const origin = allowedOrigin(req.headers.origin);
  const cors: Record<string, string> = { 'x-content-type-options': 'nosniff', 'cache-control': 'no-store', ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS' } : {}) };
  if (req.headers.origin && !origin) { res.writeHead(403, cors).end('{"error":"허용되지 않은 출처예요"}'); return; }
  if (req.method === 'OPTIONS') { res.writeHead(204, cors).end(); return; }
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 1e5) req.destroy(); });
  req.on('end', () => {
    let body: unknown; try { body = raw ? JSON.parse(raw) : undefined; } catch { res.writeHead(400, cors).end('{"error":"JSON이 아니에요"}'); return; }
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '') || undefined;
    const ip = (process.env.MANA_TRUST_PROXY === '1' && String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim()) || req.socket.remoteAddress || '?'; // 프록시 뒤일 때만 X-Forwarded-For를 믿는다(아니면 헤더로 속일 수 있다)
    const out = handle({ method: req.method ?? 'GET', path: (req.url ?? '/').split('?')[0], body, token, ip });
    res.writeHead(out.status, { 'content-type': 'application/json; charset=utf-8', ...cors }).end(JSON.stringify(out.json));
  });
}).listen(Number(process.env.PORT ?? 8787), () => console.log('마나 마켓 서버: http://localhost:8787'));
