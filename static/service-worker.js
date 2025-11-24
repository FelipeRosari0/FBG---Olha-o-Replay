const CACHE_NAME = 'olha-o-replay-v1';
const PRECACHE = [
  '/inicio/index.html',
  '/meu-servidor/public/index.html',
  '/static/css/style.css',
  '/static/js/main.js',
  '/static/img/OLHA O REPLAY.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/videos/') || url.pathname.startsWith('/payments/') || url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => new Response('')));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return res;
    }))
  );
});