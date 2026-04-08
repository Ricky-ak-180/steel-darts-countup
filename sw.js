const CACHE = 'steeldarts-pro-v26';

// JS/CSSはキャッシュしない（常に最新版をサーバーから取得）
const PRECACHE = [
  './',
  './index.html',
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
    }).then(function() {
      // 新バージョン起動時に全クライアントを強制リロード（最新コードを読み込む）
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(c) { c.navigate(c.url); });
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  var ext = url.pathname.split('.').pop();

  // JS・CSSは常にネットワーク直取得（キャッシュ無効）
  if (ext === 'js' || ext === 'css') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // その他はNetwork-first
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
