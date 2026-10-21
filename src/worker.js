// Point d'entrée : sert le site (dossier public/) et les routes /api/.
import { Room } from './room.js';
import { Hub } from './hub.js';
import { CAT_IDS } from './catalog.js';
import { bracketOf } from './ranks.js';

export { Room, Hub };

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const room = (env, name) => env.ROOMS.get(env.ROOMS.idFromName(name));
const hub = env => env.HUB.get(env.HUB.idFromName('hub'));

const cleanUid = s => (s || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);

// le rang vient toujours du serveur (jamais de l'appli) : il choisit le salon public du bon niveau
async function toRoom(req, env, name, pub) {
  if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket attendu', { status: 426 });
  const u = new URL(req.url);
  const uid = cleanUid(u.searchParams.get('uid'));
  const { tier, bestEver } = uid.length >= 8 ? await hub(env).rankOf(uid) : { tier: 0, bestEver: 0 };
  if (pub) name += ':' + bracketOf(tier);
  u.searchParams.set('room', name);
  u.searchParams.set('tier', tier);
  u.searchParams.set('best', bestEver);
  return room(env, name).fetch(new Request(u, req));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    let m;

    if ((m = path.match(/^\/api\/public\/([a-z0-9]+)\/ws$/))) {
      if (!CAT_IDS.has(m[1])) return json({ error: 'catégorie inconnue' }, 404);
      return toRoom(req, env, 'pub:' + m[1], true);
    }
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
      const b = url.searchParams.get('b');
      return json(await hub(env).counts(/^[0-3]$/.test(b || '') ? +b : null));
    }
    if (path === '/api/board') return json(await hub(env).board(url.searchParams.get('sc'), cleanUid(url.searchParams.get('uid'))));
    if (path === '/api/me') {
      const uid = cleanUid(url.searchParams.get('uid'));
      return uid.length >= 8 ? json(await hub(env).me(uid)) : json({ error: 'identifiant invalide' }, 400);
    }
    if (path === '/api/save') {
      const code = (url.searchParams.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (req.method === 'POST') {
        let b;
        try { b = await req.json(); } catch { return json({ error: 'données illisibles' }, 400); }
        const c = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), uid = cleanUid(b.uid), data = String(b.data || '');
        if (c.length !== 12 || uid.length < 8 || data.length > 40000) return json({ error: 'sauvegarde refusée' }, 400);
        return json(await hub(env).saveProgress(c, uid, data));
      }
      return code.length === 12 ? json(await hub(env).loadProgress(code)) : json({ ok: 0 });
    }
    if (path === '/api/status') return json(await hub(env).catalogStatus(url.searchParams.has('test')));
    if (path === '/api/introuvables') return json(await hub(env).failedSongs());
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
