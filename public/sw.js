// Service worker de Hitroom : chargement rapide et ouverture même sans réseau.
// - pages : réseau d'abord (toujours la dernière version en ligne), la copie gardée sert hors connexion
// - fichiers du jeu (images, script, polices) : copie gardée affichée tout de suite, mise à jour en arrière-plan
// - jamais : /api/, /__mock/, vidéos et sons (lus par morceaux), autres sites (sauf les polices Google)
// La version vient de l'adresse d'enregistrement (/sw.js?v=1.12) : à chaque version, nouvelle copie et ménage.
const V = new URL(self.location).searchParams.get('v') || '0';
const CACHE = 'hitroom-' + V;
const SHELL = ['/', '/art.js', '/logo.webp', '/manifest.webmanifest', '/icon-192.png', '/fonds/accueil.webp'];
const MEDIA = /\.(mp4|webm|m4a|ogg|mp3|wav)$/;
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('hitroom-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req)
      .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('/', copy)); } return r; })
      .catch(() => caches.match('/')));
    return;
  }
  const same = url.origin === self.location.origin;
  if (same ? /^\/(api|__mock)\//.test(url.pathname) || MEDIA.test(url.pathname) || req.headers.has('range') : !FONTS.test(req.url)) return;
  const net = caches.open(CACHE).then(c => fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') c.put(req, r.clone());
    return r;
  }));
  e.respondWith(caches.match(req).then(hit => hit || net));
  e.waitUntil(net.catch(() => {}));
});

// ---------- notifications ----------
// le serveur envoie un « réveil » vide ; on vient chercher le message à afficher (boîte /api/push/inbox)
const showMsg = m => self.registration.showNotification(m.title, { body: m.body, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: m.url || '/' }, tag: m.url || 'hitroom' });
self.addEventListener('push', e => {
  e.waitUntil(self.registration.pushManager.getSubscription()
    .then(sub => (sub ? fetch('/api/push/inbox', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).then(r => r.json()) : []))
    .catch(() => [])
    .then(list => (list.length ? Promise.all(list.map(showMsg)) : showMsg({ title: 'Hitroom', body: 'Une partie de blind test ? 🎵', url: '/' }))));
});
// toucher la notification : on revient dans l'appli déjà ouverte, sinon on l'ouvre, à la bonne adresse
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(x => new URL(x.url).origin === self.location.origin);
    return c ? c.focus().then(w => (w || c).navigate(url)) : self.clients.openWindow(url);
  }));
});
