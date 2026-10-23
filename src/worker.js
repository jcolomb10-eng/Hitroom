// Point d'entrée : sert le site (dossier public/) et les routes /api/.
import { verifyGoogle } from './accounts.js';
import { Room } from './room.js';
import { Hub, season } from './hub.js';
import { CAT_IDS, rankedCats, catOpen } from './catalog.js';
import { publicKey } from './ids.js';
import { parisDay, dayAdd } from './social.js';

export { Room, Hub };

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const room = (env, name) => env.ROOMS.get(env.ROOMS.idFromName(name));
const hub = env => env.HUB.get(env.HUB.idFromName('hub'));

const cleanUid = s => (s || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
async function body(req) { try { return await req.json(); } catch { return null; } }

// le rang vient toujours du serveur (jamais de l'appli) : en classé, il choisit le salon du bon niveau
// (pub:<catégorie>:<fenêtre>, 2 rangs voisins, voir ranks.js) ; les autres salons : open:<cat>, priv:<CODE>, solo:<id>
async function toRoom(req, env, name, ranked) {
  if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket attendu', { status: 426 });
  const u = new URL(req.url);
  const uid = cleanUid(u.searchParams.get('uid'));
  const cat = ranked ? name.slice(4) : null;
  const prof = { name: u.searchParams.get('name'), av: u.searchParams.get('av'), fr: u.searchParams.get('fr'), lvl: u.searchParams.get('lvl') };
  const { tier, bestEver, win, club } = uid.length >= 8 ? await hub(env).rankOf(uid, cat, prof) : { tier: 0, bestEver: 0, win: 0, club: '' };
  if (ranked) name += ':' + win;
  u.searchParams.set('room', name);
  u.searchParams.set('tier', tier);
  u.searchParams.set('best', bestEver);
  u.searchParams.set('club', club || '');
  return room(env, name).fetch(new Request(u, req));
}

export default {
  // chaque jour à 17 h UTC (18 h à Paris en hiver, 19 h en été) : rappel des défis, ou nouvelle saison le 1er du mois
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(hub(env).cronDaily());
  },

  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    let m;

    if ((m = path.match(/^\/api\/public\/([a-z0-9]+)\/ws$/))) {
      if (!rankedCats(season(), env.RANKED_CATS).includes(m[1])) return json({ error: 'catégorie pas classée cette saison' }, 404);
      return toRoom(req, env, 'pub:' + m[1], true);
    }
    if ((m = path.match(/^\/api\/open\/([a-z0-9]+)\/ws$/))) {
      if (!CAT_IDS.has(m[1]) || !catOpen(m[1], env)) return json({ error: 'catégorie inconnue' }, 404);
      return toRoom(req, env, 'open:' + m[1], false);
    }
    if ((m = path.match(/^\/api\/solo\/([A-Za-z0-9]{6,16})\/ws$/))) return toRoom(req, env, 'solo:' + m[1], false);
    // Hit du jour : un salon par joueur et par jour ; une reconnexion juste après minuit garde la partie de la veille
    if (path === '/api/hit/ws') {
      const uid = cleanUid(url.searchParams.get('uid')), asked = url.searchParams.get('day');
      let day = parisDay();
      if (asked === dayAdd(day, -1) && url.searchParams.get('create') !== '1') day = asked;
      return toRoom(req, env, `hit:${day}:${publicKey(uid)}`, false);
    }
    if (path === '/api/hit') { const uid = cleanUid(url.searchParams.get('uid')); return json(await hub(env).hitInfo(uid.length >= 8 ? uid : '')); }
    if ((m = path.match(/^\/api\/salon\/([A-Z0-9]{4})\/ws$/))) return toRoom(req, env, 'priv:' + m[1], false);
    if ((m = path.match(/^\/api\/salon\/([A-Z0-9]{4})$/))) return json(await room(env, 'priv:' + m[1]).info());
    if (path === '/api/salon' && req.method === 'POST') {
      for (let i = 0; i < 8; i++) {
        const code = Array.from(crypto.getRandomValues(new Uint8Array(4)), b => CODE_CHARS[b % CODE_CHARS.length]).join('');
        if (!(await room(env, 'priv:' + code).info()).humans) return json({ code });
      }
      return json({ error: 'Réessaie dans un instant.' }, 503);
    }
    if (path === '/api/counts') {
      const t = url.searchParams.get('t');
      return json(await hub(env).counts(/^[0-8]$/.test(t || '') ? +t : null));
    }
    if (path === '/api/board') return json(await hub(env).board(url.searchParams.get('sc'), cleanUid(url.searchParams.get('uid'))));
    if (path === '/api/me') {
      const uid = cleanUid(url.searchParams.get('uid')), q = url.searchParams;
      const prof = q.has('name') ? { name: q.get('name'), av: q.get('av'), fr: q.get('fr'), lvl: q.get('lvl') } : null;
      return uid.length >= 8 ? json(await hub(env).me(uid, prof)) : json({ error: 'identifiant invalide' }, 400);
    }
    // amis : présence (chaque minute), liste, demandes, défis en duel
    if (path === '/api/ping' && req.method === 'POST') {
      const b = await body(req), uid = cleanUid(b?.uid);
      if (uid.length < 8) return json({ error: 'identifiant invalide' }, 400);
      return json(await hub(env).ping(uid, { name: b.name, av: b.av, fr: b.fr, lvl: b.lvl }, String(b.at || 'menu')));
    }
    if (path === '/api/friends') {
      const b = req.method === 'POST' ? await body(req) : null, uid = cleanUid(b ? b.uid : url.searchParams.get('uid'));
      if (uid.length < 8) return json({ error: 'identifiant invalide' }, 400);
      return json(b ? await hub(env).friendAct(uid, b) : await hub(env).friendList(uid));
    }
    // clubs : classement et clubs à rejoindre, page d'un club, créer / rejoindre / quitter / modifier / exclure
    if (path === '/api/clubs') return json(await hub(env).clubList(cleanUid(url.searchParams.get('uid')), (url.searchParams.get('q') || '').slice(0, 30)));
    if ((m = path.match(/^\/api\/club\/([A-Z0-9]{6})$/))) return json(await hub(env).clubInfo(m[1], cleanUid(url.searchParams.get('uid'))));
    if (path === '/api/club' && req.method === 'POST') {
      const b = await body(req), uid = cleanUid(b?.uid);
      if (uid.length < 8) return json({ error: 'identifiant invalide' }, 400);
      return json(await hub(env).clubAct(uid, b));
    }
    // événement du week-end, tournoi, mode Survie
    if (path === '/api/event') return json(await hub(env).eventInfo(cleanUid(url.searchParams.get('uid'))));
    if (path === '/api/survie') return json(await hub(env).survieBoard(String(url.searchParams.get('cat') || 'mix').replace(/[^a-z0-9+]/g, '').slice(0, 30), cleanUid(url.searchParams.get('uid'))));
    if (path === '/api/config') return json({ google: env.GOOGLE_CLIENT_ID || '' });
    if (path === '/api/wallet' && req.method === 'POST') {
      const b = await body(req) || {}, uid = cleanUid(b.uid);
      return uid.length < 8 ? json({ ok: 0 }, 400) : json(await hub(env).walletSync(uid, b.coins, env.WALLET_ENFORCE !== '0' || (env.MOCK_MUSIC && url.searchParams.get('enforce') === '1')));
    }
    if (path === '/api/account' && req.method === 'POST') {
      const b = await body(req) || {}, uid = cleanUid(b.uid);
      if (b.act === 'register') return json(await hub(env).acctRegister(uid, b.email, b.pw));
      if (b.act === 'google') {
        const email = await verifyGoogle(b.credential, env.GOOGLE_CLIENT_ID);
        return email ? json(await hub(env).acctGoogle(uid, email)) : json({ ok: 0, error: 'Connexion Google refusée.' });
      }
      if (b.act === 'login') return json(await hub(env).acctLogin(b.email, b.pw));
      if (b.act === 'delete') return json(await hub(env).acctDelete(uid, b.pw));
      return json({ ok: 0 }, 400);
    }
    if (path === '/api/account') return json(await hub(env).acctStatus(cleanUid(url.searchParams.get('uid'))));
    if (path === '/api/save') {
      const code = (url.searchParams.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (req.method === 'POST') {
        let b;
        try { b = await req.json(); } catch { return json({ error: 'données illisibles' }, 400); }
        const c = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), uid = cleanUid(b.uid), data = String(b.data || '');
        if (c.length !== 12 || uid.length < 8 || data.length > 100000) return json({ error: 'sauvegarde refusée' }, 400);
        return json(await hub(env).saveProgress(c, uid, data));
      }
      return code.length === 12 ? json(await hub(env).loadProgress(code)) : json({ ok: 0 });
    }
    if (path === '/api/status') return json(await hub(env).catalogStatus(url.searchParams.has('test')));
    if (path === '/api/introuvables') return json(await hub(env).failedSongs(url.searchParams.get('f') === '1'));
    if (path === '/api/versions') return json(await hub(env).chosenVersions());
    // pour le propriétaire du jeu (page /stats.html) : protégé par la variable secrète ADMIN_KEY
    if (path === '/api/signalements' || path === '/api/stats' || path === '/api/suspects') {
      if (!env.ADMIN_KEY) return json({ error: 'Ajoute la variable secrète ADMIN_KEY dans Cloudflare (Worker zikroom → Paramètres → Variables et secrets).' }, 403);
      if (url.searchParams.get('key') !== env.ADMIN_KEY) return json({ error: 'Clé incorrecte.' }, 403);
      return json(path === '/api/stats' ? await hub(env).statsReport() : path === '/api/suspects' ? await hub(env).suspects() : await hub(env).reportList());
    }
    // notifications : clé publique, abonnement, désabonnement, messages à afficher (lus par le service worker)
    if (path === '/api/push/key') return json({ key: await hub(env).pushKey() });
    if (path.startsWith('/api/push/') && req.method === 'POST') {
      let b;
      try { b = await req.json(); } catch { return json({ error: 'données illisibles' }, 400); }
      const endpoint = String(b.endpoint || '').slice(0, 1000);
      if (path === '/api/push/sub') {
        const uid = cleanUid(b.uid);
        return uid.length >= 8 ? json(await hub(env).subscribe(uid, endpoint, b.prefs || {})) : json({ error: 'identifiant invalide' }, 400);
      }
      if (path === '/api/push/unsub') return json(await hub(env).unsubscribe(endpoint));
      if (path === '/api/push/inbox') return json(await hub(env).inboxFor(endpoint));
    }
    if (env.MOCK_MUSIC && path === '/__mock/push') return json(await hub(env).devPush());
    if (env.MOCK_MUSIC && path === '/__mock/horloge') return json(await hub(env).devClock(url.searchParams.get('t') || ''));
    if (env.MOCK_MUSIC && path === '/__mock/points') return json(await hub(env).devPoints(cleanUid(url.searchParams.get('uid')), +url.searchParams.get('pts') || 100, url.searchParams.get('cat') || 'mix', url.searchParams.get('pub') !== '0'));
    if (env.MOCK_MUSIC && path === '/__mock/cloture') return json(await hub(env).devClose(url.searchParams.get('sc') || '', url.searchParams.get('wk') || ''));
    if (env.MOCK_MUSIC && path === '/__mock/hit') return json(await hub(env).devHit(cleanUid(url.searchParams.get('uid')), url.searchParams.get('day'), +url.searchParams.get('score') || 50));
    if (env.MOCK_MUSIC && path === '/__mock/pick') return json(await hub(env).devPick(url.searchParams.get('cat') || 'mix', +url.searchParams.get('n') || 10));
    if (env.MOCK_MUSIC && path === '/__mock/cron') return json(await hub(env).cronDaily(url.searchParams.has('first')));
    if (env.MOCK_MUSIC && path === '/__mock/saison') {
      await hub(env).devPrevSeason(cleanUid(url.searchParams.get('uid')), url.searchParams.get('sc'), +url.searchParams.get('rp') || 0);
      return json({ ok: 1 });
    }
    if (env.MOCK_MUSIC && path.startsWith('/__mock/')) return mock(path);

    return env.ASSETS.fetch(req);
  },
};

// ---------- extraits simulés pour les tests en local (MOCK_MUSIC=1) ----------
function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function mock(path) {
  const key = decodeURIComponent(path.split('/').pop().replace(/\.(wav|svg)$/, ''));
  const h = hash(key);
  if (path.startsWith('/__mock/c/')) {
    const hue = h % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},80%,45%)"/><stop offset="1" stop-color="hsl(${(hue + 80) % 360},80%,25%)"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/><circle cx="50" cy="50" r="28" fill="none" stroke="#fff8" stroke-width="3"/><circle cx="50" cy="50" r="6" fill="#fff8"/></svg>`;
    return new Response(svg, { headers: { 'content-type': 'image/svg+xml' } });
  }
  // 30 s de petite mélodie, 8 kHz, 8 bits
  const rate = 8000, secs = 30, n = rate * secs;
  const buf = new Uint8Array(44 + n);
  const dv = new DataView(buf.buffer);
  const w = (o, s) => [...s].forEach((c, i) => buf[o + i] = c.charCodeAt(0));
  w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  w(36, 'data'); dv.setUint32(40, n, true);
  const notes = [0, 2, 4, 5, 7, 9, 11, 12].map(x => 220 * 2 ** ((x + (h % 7)) / 12));
  for (let i = 0; i < n; i++) {
    const step = Math.floor(i / (rate / 4));
    const f = notes[(h >> (step % 24)) % notes.length + 0 * step];
    const env = 1 - (i % (rate / 4)) / (rate / 4);
    buf[44 + i] = 128 + Math.round(40 * env * Math.sin(2 * Math.PI * f * i / rate));
  }
  return new Response(buf, { headers: { 'content-type': 'audio/wav', 'accept-ranges': 'none' } });
}
