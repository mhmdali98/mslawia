// Minimal service worker for Mslawia PWA
// Cache-first for app shell, network-first for navigation
const CACHE = 'mslawia-v2';
const ASSETS = [
  '/mslawia/',
  '/mslawia/index.html',
  '/mslawia/manifest.webmanifest',
  '/mslawia/favicon.svg',
  '/mslawia/icon-192.svg',
  '/mslawia/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Show a system-tray notification on demand from the page
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'notify') return;
  const { title, body, tag, url } = data;
  self.registration.showNotification(title || 'مصلاوية', {
    body: body || '',
    tag: tag || undefined,
    icon: '/mslawia/icon-192.svg',
    badge: '/mslawia/icon-192.svg',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [120, 60, 120],
    data: { url: url || '/mslawia/' },
  });
});

// Focus existing tab on notification click, or open one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/mslawia/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          try { c.navigate(target); } catch (_) {}
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Skip Firebase / Google APIs — let them go to network
  if (
    url.host.includes('googleapis.com') ||
    url.host.includes('firebaseio.com') ||
    url.host.includes('firebase.com') ||
    url.host.includes('gstatic.com')
  ) return;

  // Network-first for navigation requests, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/mslawia/index.html')))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((res) => {
            if (res.ok && res.type === 'basic') {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached)
    )
  );
});
