// Hub : un seul objet pour tout le site.
// - retrouve les extraits iTunes (mis en mémoire 30 jours, préchargés petit à petit en tâche de fond)
// - compte les joueurs présents dans chaque salon public
// - tient le classement (saison = mois en cours, et « tous les temps »)
import { DurableObject } from 'cloudflare:workers';
import { songsOf, songByKey } from './catalog.js';
import { pickBest } from './itunes.js';

const DAY = 86400000;
const FRESH = 30 * DAY;      // au-delà, on rafraîchit en tâche de fond
const RETRY_FAIL = 7 * DAY;  // un morceau introuvable est retenté une semaine plus tard

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
    this.sql.exec(`CREATE TABLE IF NOT EXISTS scores(sc TEXT, uid TEXT, name TEXT, av TEXT, fr TEXT, pts INTEGER, games INTEGER, wins INTEGER, PRIMARY KEY(sc, uid))`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS scores_pts ON scores(sc, pts DESC)`);
    this.rooms = new Map(); // cat -> { n, ts } (salons publics)
    this.blockedUntil = 0;  // iTunes nous limite : on attend
  }

  row(k) {
    return this.sql.exec(`SELECT ok, url, art, link, ts FROM tracks WHERE k = ?`, k).toArray()[0];
  }

  async resolve(song) {
    if (this.env.MOCK_MUSIC) {
      const id = encodeURIComponent(song.k);
      return { ok: 1, url: `/__mock/a/${id}.wav`, art: `/__mock/c/${id}.svg`, link: '' };
    }
    if (Date.now() < this.blockedUntil) throw new Error('itunes en pause');
    const term = `${song.a[0]} ${song.t[0]}`;
    const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=15&country=FR`, {
      headers: { 'User-Agent': 'Hitroom/1.0 (blind test)', Accept: 'application/json' },
    });
    if (!r.ok) {
      if (r.status === 403 || r.status === 429) this.blockedUntil = Date.now() + 5 * 60000;
      throw new Error('itunes ' + r.status);
    }
    const best = pickBest((await r.json()).results, song);
    if (!best) return { ok: 0, url: '', art: '', link: '' };
    return {
      ok: 1,
      url: best.previewUrl,
      art: (best.artworkUrl100 || '').replace(/\/\d+x\d+bb\./, '/600x600bb.'),
      link: best.trackViewUrl || '',
    };
  }

  async resolveAndStore(song) {
    const res = await this.resolve(song);
    this.sql.exec(`INSERT OR REPLACE INTO tracks(k, ok, url, art, link, ts) VALUES(?,?,?,?,?,?)`,
      song.k, res.ok, res.url, res.art, res.link, Date.now());
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
    const out = [], todo = [];
    for (const s of list) {
      if (out.length >= n) break;
      const r = this.row(s.k);
      if (r && r.ok) out.push({ ...s, url: r.url, art: r.art, link: r.link });
      else if (!r || now - r.ts > RETRY_FAIL) todo.push(s);
    }
    // morceaux encore jamais cherchés : on les cherche maintenant, par petits paquets
    let tries = 0;
    while (out.length < n && todo.length && tries < 24) {
      const batch = todo.splice(0, Math.min(6, n - out.length + 2));
      tries += batch.length;
      const res = await Promise.allSettled(batch.map(s => this.resolveAndStore(s)));
      res.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.ok && out.length < n) out.push({ ...batch[i], ...r.value });
      });
      if (now < this.blockedUntil) break;
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
    for (const [, s] of due.slice(0, 8)) {
      try { await this.resolveAndStore(s); } catch { break; }
      await new Promise(r => setTimeout(r, 1500));
    }
    if (due.length > 8) await this.ctx.storage.setAlarm(Date.now() + (now < this.blockedUntil ? 5 : 1) * 60000);
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

  catalogStatus() {
    const r = this.sql.exec(`SELECT SUM(ok) AS ok, COUNT(*) AS n FROM tracks`).one();
    return { songs: songsOf('mix').length, checked: r.n || 0, playable: r.ok || 0 };
  }

  failedSongs() {
    return this.sql.exec(`SELECT k FROM tracks WHERE ok = 0`).toArray().map(r => songByKey(r.k)).filter(Boolean)
      .map(s => `${s.t[0]} — ${s.a[0]}`);
  }
}
