// Service worker template. build.mjs fills in the version and precache list.
const VERSION = 'e79423e9e7ac';
const CACHE = `mw-terminal-${VERSION}`;
const PRECACHE = ["/","/sv/","/404.html","/assets/site.css","/assets/site.js","/assets/fonts/archivo.woff2","/assets/fonts/jetbrains-mono-400.woff2","/assets/fonts/jetbrains-mono-700.woff2","/assets/img/icon-192.png","/assets/docs/CV_Mark_Walusimbi_EN.pdf","/assets/docs/CV_Mark_Walusimbi.pdf","/dispatch/","/sv/dispatch/","/assets/dispatch.js"];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('mw-terminal-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // Pages: network first so visitors always get the latest version, cache when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          const path = url.pathname.replace(/index\.html$/, '');
          return (await cache.match(path)) || (await cache.match(path.startsWith('/sv/') ? '/sv/' : '/'));
        }),
    );
    return;
  }

  // Everything else: cache first, then network (and keep a copy).
  event.respondWith(
    caches.match(request).then(hit => hit || fetch(request).then(res => {
      if (res.ok && res.type === 'basic') caches.open(CACHE).then(c => c.put(request, res.clone()));
      return res;
    })),
  );
});
