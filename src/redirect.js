// Ancien Worker « hitroom » : l'appli s'appelle maintenant Zikroom et vit sur un autre Worker.
// Tout lien de l'ancienne adresse (partage d'ami, invitation, salon...) est renvoyé vers la nouvelle, chemin et paramètres gardés.
// Pour une page web, on passe d'abord par une petite page qui lit la progression gardée sur le téléphone (localStorage de cette
// adresse) et la transmet à la nouvelle adresse dans le fragment « #import= » (jamais envoyé à un serveur).
import { DurableObject } from 'cloudflare:workers';

const TARGET = 'https://zikroom.jcolomb10.workers.dev';

// anciennes classes gardées vides (le Worker les possédait : les supprimer demanderait une migration)
export class Hub extends DurableObject {}
export class Room extends DurableObject {}

const page = target => `<!doctype html><meta charset="utf-8"><title>Zikroom</title><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="background:#05060f;color:#fff;font-family:sans-serif;text-align:center;padding-top:30vh">Zikroom arrive…
<script>(function(){var t=${JSON.stringify(target)},h='';try{var s=localStorage.getItem('hitroom.v1'),d=localStorage.getItem('hitroom.disc');
if(s){h='#import='+btoa(unescape(encodeURIComponent(JSON.stringify({s:s,d:d})))).replace(/\\+/g,'-').replace(/\\//g,'_')}}catch(e){}
location.replace(t+h)})();</script><noscript><a href="${target}">Continuer vers Zikroom</a></noscript>`;

export default {
  fetch(req, env) {
    const u = new URL(req.url), target = (env.TARGET || TARGET) + u.pathname + u.search;
    if (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html') && !u.pathname.startsWith('/api/')) {
      return new Response(page(target), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }
    return Response.redirect(target, 301);
  },
};
