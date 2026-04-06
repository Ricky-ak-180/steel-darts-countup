const CACHE = 'steeldarts-pro-v4';

const PRECACHE = [
  './',
  './index.html',
  './css/app.css',
  './js/data.js',
  './js/arr.js',
  './js/game.js',
  './js/sfx.js',
  './js/sim501.js',
  './manifest.json',
];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(PRECACHE); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(ks) {
      return Promise.all(ks.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Network-first: オンライン時は常に最新版を取得してキャッシュ更新、オフライン時はキャッシュで動作
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(res) {
      if (res && res.ok) {
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
      }
      return res;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
