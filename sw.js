/* Offline support: the page is fetched fresh when online (so updates arrive),
   and served from cache when the network is slow or missing. */
const CACHE = 'training-plan-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/favicon-64.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function pageFirst(req) {
  const cache = await caches.open(CACHE);
  const net = fetch(req).then(res => {
    if (res && res.ok) { cache.put('./index.html', res.clone()); }
    return res;
  });
  net.catch(() => { });
  const timeout = new Promise(resolve => setTimeout(resolve, 3500, null));
  try {
    const res = await Promise.race([net, timeout]);
    if (res && res.ok) return res;
  } catch (e) { }
  const cached = await cache.match('./index.html') || await cache.match('./');
  return cached || net;
}
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
  return res;
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') { e.respondWith(pageFirst(req)); return; }
  if (url.origin === self.location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) e.respondWith(cacheFirst(req));
});
