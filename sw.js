// Cache version auto-increments via deploy date — bump manually if needed
const BUILD = '2026-07-04';
const CACHE = 'gymbet-v'+BUILD;
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

// Push notifications (FCM / web push)
self.addEventListener('push', e => {
  const data = e.data?.json()||{title:'GymBet',body:'Nova atualização!'};
  e.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,
    icon:'./icon.svg',
    badge:'./icon.svg',
    vibrate:[200,100,200],
    tag: data.tag||'gymbet-push',
    renotify: true,
    data: { url: data.url||'/' }
  }));
});

// Abrir app ao clicar na notificação
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url||'/';
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){
        if(c.url.includes('gymbet')&&'focus' in c) return c.focus();
      }
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Broadcast de nova ida enviado pela página principal
self.addEventListener('message', e => {
  if(e.data?.type !== 'NEW_VISIT') return;
  const {player, tempo, calorias, fator, modalidade} = e.data;
  const isCardio = modalidade === 'cardio';
  self.registration.showNotification(isCardio ? 'GymBet — Novo cardio! 🏃' : 'GymBet — Nova ida! 💪', {
    body: isCardio
      ? player+' registrou um cardio · '+tempo+'min · '+calorias+'kcal'
      : player+' registrou '+tempo+'min · '+calorias+'kcal · ⚡'+fator,
    icon: './icon.svg',
    badge: './icon.svg',
    vibrate: [200,100,200],
    tag: 'new-visit-'+Date.now(),
    renotify: true
  });
});
