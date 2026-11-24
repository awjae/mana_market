/* 마나 마켓 서비스 워커: 재접속을 빠르게 하고 오프라인에서도 앱이 열리게 한다.
 * - 화면(HTML): 네트워크 우선 → 새 배포가 바로 반영되고, 오프라인이면 마지막 화면을 쓴다.
 * - 번들·그림·글꼴: 캐시를 먼저 쓰고 뒤에서 갱신(stale-while-revalidate). */
const V = 'mana-market-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin && !/(^|\.)(googleapis|gstatic)\.com$/.test(u.hostname)) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(V).then((ca) => ca.put('/', c)); return res; }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.open(V).then((ca) => ca.match(r).then((hit) => {
    const net = fetch(r).then((res) => { if (res.ok || res.type === 'opaque') ca.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
