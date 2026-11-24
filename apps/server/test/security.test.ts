import { describe, expect, it } from 'vitest';
import { createApp, MAX_PLAYERS, type Db } from '../src/app';
import { allowedOrigin, createLimiter, hashToken, isHash } from '../src/security';

const T0 = Date.UTC(2026, 10, 23, 3);
const mk = () => { let t = T0; const db: Db = { players: {} }; const h = createApp(db, () => t); return { db, h, tick: (ms: number) => { t += ms; } }; };

describe('보안', () => {
  it('요청 제한: 창 안에서 max 초과면 막고, 창이 지나면 풀린다', () => {
    let t = 0; const hit = createLimiter(1000, 3, () => t);
    expect([hit('a'), hit('a'), hit('a'), hit('a')]).toEqual([true, true, true, false]);
    expect(hit('b')).toBe(true);
    t = 1500; expect(hit('a')).toBe(true);
  });
  it('토큰은 해시로만 저장된다(평문 토큰이 DB에 없다)', () => {
    const { db, h } = mk();
    const token = (h({ method: 'POST', path: '/api/register', body: { nick: '보안왕' }, ip: '1.1.1.1' }).json as { token: string }).token;
    const keys = Object.keys(db.players);
    expect(keys).toEqual([hashToken(token)]);
    expect(isHash(keys[0])).toBe(true);
    expect(JSON.stringify(db)).not.toContain(token);
    expect(h({ method: 'GET', path: '/api/me', token }).status).toBe(200);
    expect(h({ method: 'GET', path: '/api/me', token: hashToken(token) }).status).toBe(401); // 해시로는 로그인할 수 없다
  });
  it('가입은 같은 곳에서 한 시간에 5번까지', () => {
    const { h, tick } = mk();
    const r = (i: number) => h({ method: 'POST', path: '/api/register', body: { nick: `상인${i}` }, ip: '9.9.9.9' }).status;
    expect([1, 2, 3, 4, 5].map(r)).toEqual([200, 200, 200, 200, 200]);
    expect(r(6)).toBe(429);
    tick(3_700_000); expect(r(7)).toBe(200);
  });
  it('잘못된 토큰을 계속 보내면 막힌다', () => {
    const { h } = mk();
    const codes = Array.from({ length: 22 }, () => h({ method: 'GET', path: '/api/me', token: 'x'.repeat(32), ip: '2.2.2.2' }).status);
    expect(codes[0]).toBe(401); expect(codes[21]).toBe(429);
  });
  it('거래는 분당 60번까지', () => {
    const { h } = mk();
    const token = (h({ method: 'POST', path: '/api/register', body: { nick: '빠른손' }, ip: '3.3.3.3' }).json as { token: string }).token;
    const s = Array.from({ length: 61 }, () => h({ method: 'POST', path: '/api/buy', token, body: { id: 'IRON', qty: 1 }, ip: '3.3.3.3' }).status);
    expect(s.filter((x) => x === 429).length).toBeGreaterThanOrEqual(1);
  });
  it('계정 수 상한', () => {
    const db: Db = { players: Object.fromEntries(Array.from({ length: MAX_PLAYERS }, (_, i) => [hashToken(String(i)), { nick: `n${i}`, cash: 0, holdings: {}, trades: [], orders: [], fired: [], paidDay: 0, joinDay: 0 }])) };
    expect(createApp(db, () => T0)({ method: 'POST', path: '/api/register', body: { nick: '새얼굴' }, ip: '4.4.4.4' }).status).toBe(503);
  });
  it('허용 출처: 환경 변수가 없으면 localhost만, 있으면 목록만', () => {
    expect(allowedOrigin('http://localhost:5173', undefined)).toBe('http://localhost:5173');
    expect(allowedOrigin('https://evil.example', undefined)).toBeNull();
    expect(allowedOrigin('https://mana.example', 'https://mana.example,https://b.example')).toBe('https://mana.example');
    expect(allowedOrigin('http://localhost:5173', 'https://mana.example')).toBeNull();
    expect(allowedOrigin(undefined, undefined)).toBeNull();
  });
  it('복구 코드: 가입 때 한 번 보여 주고, 해시로만 저장하며, 맞으면 새 토큰을 주고 옛 토큰을 막는다', () => {
    const { db, h } = mk();
    const reg = h({ method: 'POST', path: '/api/register', body: { nick: '잃어버림' }, ip: '5.5.5.5' }).json as { token: string; recoveryCode: string };
    expect(reg.recoveryCode).toMatch(/^([A-Z2-9]{4}-){5}[A-Z2-9]{4}$/);
    expect(JSON.stringify(db)).not.toContain(reg.recoveryCode.replace(/-/g, ''));
    h({ method: 'POST', path: '/api/buy', token: reg.token, body: { id: 'IRON', qty: 1 }, ip: '5.5.5.5' });
    expect(h({ method: 'POST', path: '/api/recover', body: { nick: '잃어버림', code: 'AAAA-AAAA' }, ip: '6.6.6.6' }).status).toBe(401);
    const rec = h({ method: 'POST', path: '/api/recover', body: { nick: '잃어버림', code: reg.recoveryCode.toLowerCase().replace(/-/g, ' ') }, ip: '6.6.6.6' });
    expect(rec.status).toBe(200);
    const nt = (rec.json as { token: string; player: { holdings: Record<string, unknown> } });
    expect(Object.keys(nt.player.holdings)).toEqual(['IRON']); // 지갑은 그대로
    expect(h({ method: 'GET', path: '/api/me', token: reg.token, ip: '7.7.7.7' }).status).toBe(401); // 옛 토큰은 무효
    expect(h({ method: 'GET', path: '/api/me', token: nt.token, ip: '7.7.7.7' }).status).toBe(200);
  });
});
