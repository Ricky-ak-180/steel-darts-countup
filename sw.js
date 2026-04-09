// Service Worker for Steel Darts Pro
const CACHE_NAME = 'steel-darts-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/app.min.css',
  '/js/i18n.min.js',
  '/js/sfx.min.js',
  '/js/caller.min.js',
  '/js/data.min.js',
  '/js/game.min.js',
  '/js/arr.min.js',
  '/js/sim501.min.js',
  '/js/cricket.min.js'
];

// Install event - cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        console.log('Some assets could not be cached');
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network First strategy
// Always try network first, fall back to cache for offline support
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request).then(response => {
      if (!response || response.status !== 200) {
        return response;
      }

      // Update cache with fresh response
      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, responseToCache);
      });

      return response;
    }).catch(() => {
      // Network failed - serve from cache (offline support)
      return caches.match(event.request).then(response => {
        if (response) {
          return response;
        }
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
