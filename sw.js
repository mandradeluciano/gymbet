const CACHE = 'gymbet-v43';
const STATIC = ['./','./index.html','./manifest.json','./icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Skip non-GET and Firebase/Google requests (always go to network)
  if(e.request.method!=='GET')return;
  if(url.hostname.includes('firestore.googleapis.com'))return;
  if(url.hostname.includes('firebase'))return;
  if(url.hostname.includes('google'))return;
  if(url.hostname.includes('gstatic'))return;
  if(url.hostname.includes('googleapis'))return;

  // For app files: cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request)
        .then(res => {
          if(res.ok){
            const clone = res.clone();
            caches.open(CACHE).then(c=>c.put(e.request,clone));
          }
          return res;
        })
        .catch(()=>cached||new Response('Offline',{status:503}));
      // Return cache immediately, update in background
      return cached||networkFetch;
    })
  );
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json()||{title:'GymBet',body:'Nova atualizacao!'};
  e.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,icon:'./icon.svg',badge:'./icon.svg',
    vibrate:[200,100,200]
  }));
});
