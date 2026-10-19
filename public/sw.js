// Driver Hub service worker: lets phones install the site as an app and shows
// an offline page when there is no connection. Pages, scripts and data always
// come from the network, so a new deploy is live on the next load.
const OFFLINE_CACHE = 'driverhub-offline-v1';
const OFFLINE_URL = '/offline.html';
const OFFLINE_LOGO = '/logo-192.png';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache => cache.addAll([OFFLINE_URL, OFFLINE_LOGO])));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('driverhub-') && key !== OFFLINE_CACHE).map(key => caches.delete(key)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') {
    // The offline page's logo: from the network, or the saved copy offline.
    if (event.request.method === 'GET' && new URL(event.request.url).pathname === OFFLINE_LOGO) {
      event.respondWith(fetch(event.request).catch(async () => (await caches.match(OFFLINE_LOGO)) || Response.error()));
    }
    return;
  }
  event.respondWith((async () => {
    try {
      const preloaded = await event.preloadResponse;
      return preloaded || await fetch(event.request);
    } catch {
      const cache = await caches.open(OFFLINE_CACHE);
      return (await cache.match(OFFLINE_URL)) || Response.error();
    }
  })());
});
