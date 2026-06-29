const CACHE = 'gymbet-v1';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request))
  );
});
// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'GymBet', body: '📢 Nova atualização!' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/gymbet/icon-192.png', badge: '/gymbet/icon-192.png'
  }));
});
