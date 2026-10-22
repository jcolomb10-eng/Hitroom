// Service worker de Hitroom : chargement rapide et ouverture même sans réseau.
// - pages : réseau d'abord (toujours la dernière version en ligne), la copie gardée sert hors connexion
// - fichiers du jeu (images, script, polices) : copie gardée affichée tout de suite, mise à jour en arrière-plan
// - jamais : /api/, /__mock/, vidéos et sons (lus par morceaux), autres sites (sauf les polices Google)
// La version vient de l'adresse d'enregistrement (/sw.js?v=1.12) : à chaque version, nouvelle copie et ménage.
const V = new URL(self.location).searchParams.get('v') || '0';
const CACHE = 'hitroom-' + V;
const SHELL = ['/', '/art.js', '/logo.webp', '/manifest.webmanifest', '/icon-192.png', '/fonds/accueil.webp', '/fonds/connexion.webp'];
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
