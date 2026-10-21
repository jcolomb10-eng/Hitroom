// Hub : un seul objet pour tout le site.
// - retrouve les extraits (iTunes, Deezer en secours), mis en mémoire et préchargés petit à petit en tâche de fond
// - compte les joueurs présents dans chaque salon public
// - tient le classement (saison = mois en cours, et « tous les temps »)
import { DurableObject } from 'cloudflare:workers';
import { songsOf, songByKey } from './catalog.js';
import { itunesFind, deezerFind, deezerPreview } from './sources.js';

const DAY = 86400000;
const FRESH = 30 * DAY;      // au-delà, on rafraîchit en tâche de fond
const RETRY_FAIL = 7 * DAY;  // un morceau introuvable est retenté une semaine plus tard
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; Hitroom/1.0; blind test)', Accept: 'application/json' };

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const season = (d = new Date()) => d.toISOString().slice(0, 7);

export class Hub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS tracks(k TEXT PRIMARY KEY, ok INTEGER, url TEXT, art TEXT, link TEXT, ts INTEGER)`);
    for (const col of ['src', 'ext']) {
      try { this.sql.exec(`ALTER TABLE tracks ADD COLUMN ${col} TEXT`); } catch { /* colonne déjà là */ }
    }
    this.sql.exec(`CREATE TABLE IF NOT EXISTS scores(sc TEXT, uid TEXT, name TEXT, av TEXT, fr TEXT, pts INTEGER, games INTEGER, wins INTEGER, PRIMARY KEY(sc, uid))`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS scores_pts ON scores(sc, pts DESC)`);
    this.rooms = new Map(); // cat -> { n, ts } (salons publics)
    this.paused = { it: 0, dz: 0 }; // source qui nous limite : on attend
    this.diag = { it: { ok: 0, ko: 0, last: '' }, dz: { ok: 0, ko: 0, last: '' } };
    this.getJSON = this.getJSON.bind(this);
  }

  // appel à une source d'extraits, avec diagnostic (visible sur /api/status)
  async getJSON(src, url, force = false) {
    if (!force && Date.now() < this.paused[src]) throw new Error(`${src} en pause`);
    const d = this.diag[src];
    const fail = (msg, pause) => {
      d.ko++;
      d.last = `${msg} (${new Date().toISOString().slice(11, 19)})`;
      if (pause) this.paused[src] = Date.now() + pause;
      return new Error(msg);
    };
    let r;
    try { r = await fetch(url, { headers: HEADERS }); } catch (e) { throw fail('réseau : ' + e.message, 60000); }
    if (!r.ok) {
      const body = (await r.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 100);
      throw fail(`HTTP ${r.status} ${body}`, r.status === 403 || r.status === 429 ? 5 * 60000 : 0);
    }
    let data;
    try { data = await r.json(); } catch { throw fail('réponse illisible', 60000); }
    if (data && data.error) throw fail('erreur ' + JSON.stringify(data.error).slice(0, 100), 60000);
    d.ok++;
    return data;
  }

  row(k) {
    return this.sql.exec(`SELECT ok, url, art, link, ts, src, ext FROM tracks WHERE k = ?`, k).toArray()[0];
  }

  async resolve(song) {
    if (this.env.MOCK_MUSIC) {
      const id = encodeURIComponent(song.k);
      return { ok: 1, src: 'mock', ext: '', url: `/__mock/a/${id}.wav`, art: `/__mock/c/${id}.svg`, link: '' };
    }
    let errors = 0;
    for (const find of [itunesFind, deezerFind]) {
      try {
        const res = await find(this.getJSON, song);
        if (res) return res;
      } catch { errors++; }
    }
    if (errors === 2) throw new Error('aucune source disponible');
    return { ok: 0, src: '', ext: '', url: '', art: '', link: '' };
  }

  async resolveAndStore(song) {
    const res = await this.resolve(song);
    this.sql.exec(`INSERT OR REPLACE INTO tracks(k, ok, url, art, link, ts, src, ext) VALUES(?,?,?,?,?,?,?,?)`,
      song.k, res.ok, res.url, res.art, res.link, Date.now(), res.src, res.ext);
    return res;
  }

  // n morceaux jouables de la catégorie, en évitant ceux déjà passés dans ce salon
  async pickSongs(cat, n, avoid = []) {
    this.warm();
    const now = Date.now();
    // jamais joués d'abord (dans le désordre), puis les plus anciennement joués
    const pos = new Map(avoid.map((k, i) => [k, i]));
    const rank = s => (pos.has(s.k) ? pos.get(s.k) : -1);
    const list = shuffle(songsOf(cat).slice()).sort((x, y) => rank(x) - rank(y));
    const out = [], dz = [], todo = [];
    for (const s of list) {
      if (out.length + dz.length >= n) break;
      const r = this.row(s.k);
      if (r && r.ok) (r.src === 'dz' ? dz : out).push({ ...s, url: r.url, art: r.art, link: r.link, ext: r.ext });
      else if (!r || now - r.ts > RETRY_FAIL) todo.push(s);
    }
    // les liens Deezer expirent : lien frais pour chaque partie
    const fresh = await Promise.allSettled(dz.map(s => deezerPreview(this.getJSON, s.ext)));
    fresh.forEach((f, i) => { if (f.status === 'fulfilled' && f.value) out.push({ ...dz[i], url: f.value }); });
    // morceaux encore jamais cherchés : on les cherche maintenant, par petits paquets
    let tries = 0;
    while (out.length < n && todo.length && tries < 24) {
      const batch = todo.splice(0, Math.min(6, n - out.length + 2));
      tries += batch.length;
      const res = await Promise.allSettled(batch.map(s => this.resolveAndStore(s)));
      res.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.ok && out.length < n) out.push({ ...batch[i], ...r.value });
      });
      if (Date.now() < this.paused.it && Date.now() < this.paused.dz) break;
    }
    return shuffle(out);
  }

  // préchargement progressif du catalogue (8 morceaux par minute)
  warm() {
    if (this.warming) return;
    this.warming = true;
    this.ctx.storage.getAlarm().then(a => { if (!a) this.ctx.storage.setAlarm(Date.now() + 20000); });
  }

  async alarm() {
    const now = Date.now();
    const known = new Map(this.sql.exec(`SELECT k, ok, ts FROM tracks`).toArray().map(r => [r.k, r]));
    const due = [];
    for (const s of songsOf('mix')) {
      const r = known.get(s.k);
      if (!r) due.push([0, s]);
      else if (r.ok && now - r.ts > FRESH) due.push([1, s]);
      else if (!r.ok && now - r.ts > RETRY_FAIL) due.push([2, s]);
    }
    due.sort((a, b) => a[0] - b[0]);
    let blocked = false;
    for (const [, s] of due.slice(0, 8)) {
      try { await this.resolveAndStore(s); } catch { blocked = true; break; }
      await new Promise(r => setTimeout(r, 1500));
    }
    if (due.length > 8 || blocked) await this.ctx.storage.setAlarm(Date.now() + (blocked ? 5 : 1) * 60000);
    else this.warming = false;
  }

  // ---------- salons publics ----------
  report(cat, n) {
    this.rooms.set(cat, { n, ts: Date.now() });
  }

  counts() {
    const out = {};
    const now = Date.now();
    for (const [cat, { n, ts }] of this.rooms) if (n > 0 && now - ts < 20 * 60000) out[cat] = n;
    return out;
  }

  // ---------- classement ----------
  addResults(rows) {
    const sc = season();
    for (const r of rows) {
      for (const k of [sc, 'all']) {
        this.sql.exec(`INSERT INTO scores(sc, uid, name, av, fr, pts, games, wins) VALUES(?,?,?,?,?,?,1,?)
          ON CONFLICT(sc, uid) DO UPDATE SET name = excluded.name, av = excluded.av, fr = excluded.fr,
          pts = pts + excluded.pts, games = games + 1, wins = wins + excluded.wins`,
          k, r.uid, r.name, r.av, r.fr, r.pts, r.win ? 1 : 0);
      }
    }
  }

  board(scope, uid) {
    const sc = scope === 'all' ? 'all' : season();
    const top = this.sql.exec(`SELECT uid, name, av, fr, pts, games, wins FROM scores WHERE sc = ? ORDER BY pts DESC LIMIT 50`, sc).toArray()
      .map(r => ({ name: r.name, av: r.av, fr: r.fr, pts: r.pts, games: r.games, wins: r.wins, me: r.uid === uid }));
    let me = null;
    if (uid) {
      const r = this.sql.exec(`SELECT name, av, fr, pts, games, wins FROM scores WHERE sc = ? AND uid = ?`, sc, uid).toArray()[0];
      if (r) {
        const rank = this.sql.exec(`SELECT COUNT(*) AS n FROM scores WHERE sc = ? AND pts > ?`, sc, r.pts).one().n + 1;
        me = { ...r, rank, me: true };
      }
    }
    return { season: sc, top, me };
  }

  // état du catalogue ; ?test=1 interroge les deux sources en direct
  async catalogStatus(test) {
    const r = this.sql.exec(`SELECT SUM(ok) AS ok, COUNT(*) AS n FROM tracks`).one();
    const bySrc = Object.fromEntries(this.sql.exec(`SELECT src, COUNT(*) AS n FROM tracks WHERE ok = 1 GROUP BY src`).toArray().map(x => [x.src || '?', x.n]));
    const out = { songs: songsOf('mix').length, checked: r.n || 0, playable: r.ok || 0, bySource: bySrc, sources: this.diag };
    if (test) {
      const song = songByKey('daft punk|one more time') || songsOf('mix')[0];
      const force = (src, url) => this.getJSON(src, url, true);
      out.test = {};
      for (const [name, find] of [['itunes', itunesFind], ['deezer', deezerFind]]) {
        try {
          const res = await find(force, song);
          out.test[name] = res ? 'OK ' + res.url.slice(0, 50) : 'répond, mais morceau non reconnu';
        } catch (e) { out.test[name] = 'ERREUR ' + e.message; }
      }
    }
    return out;
  }

  failedSongs() {
    return this.sql.exec(`SELECT k FROM tracks WHERE ok = 0`).toArray().map(r => songByKey(r.k)).filter(Boolean)
      .map(s => `${s.t[0]} — ${s.a[0]}`);
  }
}
