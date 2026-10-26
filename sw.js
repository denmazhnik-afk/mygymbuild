/* Offline cache for the workout journal.
   Open pages come from the cache first, then refresh in the background,
   so a new version of the page shows up on the next launch. */
const CACHE = 'trener-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.add('./')).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    let cached = await cache.match(req, { ignoreSearch: true });
    if(!cached && req.mode === 'navigate') cached = await cache.match('./');
    const net = fetch(req).then(res => {
      if(res && res.ok && !res.redirected) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if(cached){ e.waitUntil(net); return cached; }
    const res = await net;
    return res || new Response('Нет сети, а страница ещё не сохранена. Откройте приложение один раз с интернетом.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }));
});
