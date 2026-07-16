// Service worker: PWA install eligibility + caching biar loading lebih cepet
const CACHE_NAME = 'jasdor-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(()=>{})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Beresin cache versi lama
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
    ])
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if(req.method !== 'GET') return; // biarin POST/dll lewat apa adanya

  const url = new URL(req.url);
  const isImage = /\/menu_items\/.*\.(png|webp|jpg|jpeg)$/i.test(url.pathname);
  const isSameOrigin = url.origin === self.location.origin;

  if(!isSameOrigin) return; // gak ikut campur request ke domain lain (WA, fonts, dll)

  if(isImage){
    // Gambar menu jarang ganti -> cache-first, ambil ke network kalau belum ada
    e.respondWith(
      caches.match(req).then((cached) => {
        if(cached) return cached;
        return fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // HTML/CSS/JS/manifest -> stale-while-revalidate: langsung sajikan dari cache
  // (kalau ada) biar instant, sambil diem-diem update cache di background
  e.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
