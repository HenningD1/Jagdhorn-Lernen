/* Jagdsignale üben – Service Worker für den Offline-Betrieb (App v03, Inhalt V26).
   Startseite: zuerst aus dem Netz (damit neue Versionen ankommen), ohne Netz aus dem Speicher.
   Google-Schriften: beim ersten Laden mit Netz gemerkt, danach auch offline verfügbar.
   Neue Version: VERSION hochzählen, dann räumt der Browser den alten Speicher auf. */
const VERSION = 'jagdsignale-app-v03';
const CORE = ['./', './index.html'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const net = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
        if (net && net.ok) cache.put('./index.html', net.clone());
        return net;
      } catch (err) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
    return;
  }
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try { const r = await fetch(req); if (r && r.ok) cache.put(req, r.clone()); return r; } catch (err) { return Response.error(); }
    })());
  }
});
