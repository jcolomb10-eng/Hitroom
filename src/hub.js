// Hub : un seul objet pour tout le site.
// - retrouve les extraits (iTunes, Deezer en secours), mis en mémoire et préchargés petit à petit en tâche de fond
// - compte les joueurs présents dans chaque salon public
// - tient les rangs (points de rang par saison mensuelle) et le classement « tous les temps »
import { DurableObject } from 'cloudflare:workers';
import { songsOf, songByKey, rankedCats } from './catalog.js';
import { itunesFind, deezerFind, deezerPreview } from './sources.js';
import { tierOf, softReset, fromOldScale, windowsOf } from './ranks.js';

const DAY = 86400000;
const FRESH = 30 * DAY;      // au-delà, on rafraîchit en tâche de fond
const RETRY_FAIL = 7 * DAY;  // un morceau introuvable est retenté une semaine plus tard
const WARM_BATCH = 15;       // morceaux recherchés à chaque minute en tâche de fond
// à changer quand la façon de choisir la version (pickBest) change : tous les morceaux sont recherchés à nouveau
// petit à petit en tâche de fond (on garde l'ancienne version en attendant)
const PICKER = '3';
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
    this.sql.exec(`CREATE TABLE IF NOT EXISTS ranks(uid TEXT, sc TEXT, rp INTEGER, best INTEGER, games INTEGER, wins INTEGER, name TEXT, av TEXT, fr TEXT, PRIMARY KEY(uid, sc))`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS ranks_rp ON ranks(sc, rp DESC)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS rewards(uid TEXT, sc TEXT, tier INTEGER, claimed INTEGER, PRIMARY KEY(uid, sc))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS saves(code TEXT PRIMARY KEY, uid TEXT, data TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS shields(uid TEXT, day TEXT, PRIMARY KEY(uid, day))`);
    // version 1.5 : points de rang convertis une fois vers les paliers progressifs (chacun garde son rang)
    if (!this.sql.exec(`SELECT v FROM meta WHERE k = 'paliers'`).toArray().length) {
      ctx.storage.transactionSync(() => {
        for (const r of this.sql.exec(`SELECT uid, sc, rp, best FROM ranks`).toArray()) {
          this.sql.exec(`UPDATE ranks SET rp = ?, best = ? WHERE uid = ? AND sc = ?`, fromOldScale(r.rp), fromOldScale(r.best), r.uid, r.sc);
        }
        this.sql.exec(`INSERT INTO meta(k, v) VALUES('paliers', '2')`);
      });
    }
    if (this.sql.exec(`SELECT v FROM meta WHERE k = 'picker'`).toArray()[0]?.v !== PICKER) {
      this.sql.exec(`UPDATE tracks SET ts = 0`);
      this.sql.exec(`INSERT OR REPLACE INTO meta(k, v) VALUES('picker', ?)`, PICKER);
    }
    this.rooms = new Map(); // nom du salon -> { cat, win, n, ts, kind } (salons publics : ranked = classé, open = non classé)
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
      return { ok: 1, src: 'mock', ext: '', url: `/__mock/a/${id}.wav`, art: `/__mock/c/${id}.svg`, link: `https://www.deezer.com/search/${id}` };
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

  // préchargement progressif du catalogue (WARM_BATCH morceaux par minute)
  warm() {
    if (this.warming) return;
    this.warming = true;
    this.ctx.storage.getAlarm().then(a => { if (!a) this.ctx.storage.setAlarm(Date.now() + 20000); });
  }

  async alarm() {
    const now = Date.now();
    const known = new Map(this.sql.exec(`SELECT k, ok, ts FROM tracks`).toArray().map(r => [r.k, r]));
    const due = [], all = songsOf('mix');
    const inCatalog = new Set(all.map(s => s.k));
    for (const k of known.keys()) if (!inCatalog.has(k)) this.sql.exec(`DELETE FROM tracks WHERE k = ?`, k); // retiré du catalogue
    for (const s of all) {
      const r = known.get(s.k);
      if (!r) due.push([0, s]);
      else if (r.ok && now - r.ts > FRESH) due.push([1, s]);
      else if (!r.ok && now - r.ts > RETRY_FAIL) due.push([2, s]);
    }
    due.sort((a, b) => a[0] - b[0]);
    let blocked = false;
    for (const [, s] of due.slice(0, WARM_BATCH)) {
      try { await this.resolveAndStore(s); } catch { blocked = true; break; }
      await new Promise(r => setTimeout(r, 1000));
    }
    if (due.length > WARM_BATCH || blocked) await this.ctx.storage.setAlarm(Date.now() + (blocked ? 5 : 1) * 60000);
    else this.warming = false;
  }

  // ---------- salons publics ----------
  report(room, cat, win, n, kind = 'ranked') {
    this.rooms.set(room, { cat, win, n, ts: Date.now(), kind });
  }

  // joueurs présents dans le salon classé d'une catégorie et d'une fenêtre de rangs
  humansIn(cat, win) {
    const r = [...this.rooms.values()].find(x => x.kind === 'ranked' && x.cat === cat && x.win === win);
    return r && Date.now() - r.ts < 20 * 60000 ? r.n : 0;
  }

  // joueurs par catégorie : r = classé (avec un rang, seulement les salons qu'il peut rejoindre : le plus rempli de
  // ses 2 fenêtres), o = non classé (tout le monde mélangé)
  counts(tier) {
    const out = { r: {}, o: {} };
    const now = Date.now();
    for (const { cat, win, n, ts, kind } of this.rooms.values()) {
      if (n <= 0 || now - ts >= 20 * 60000) continue;
      if (kind === 'open') out.o[cat] = (out.o[cat] || 0) + n;
      else if (tier == null) out.r[cat] = (out.r[cat] || 0) + n;
      else if (windowsOf(tier).includes(win)) out.r[cat] = Math.max(out.r[cat] || 0, n);
    }
    return out;
  }

  // salon public à rejoindre : celui de ses 2 fenêtres qui a le plus de monde (pas complet), à égalité la plus basse
  pickWindow(cat, tier) {
    const wins = windowsOf(tier).map(w => ({ w, n: this.humansIn(cat, w) }));
    const open = wins.filter(x => x.n < 12);
    return (open.length ? open : wins).reduce((a, b) => (b.n > a.n ? b : a)).w;
  }

  // ---------- rangs et saisons ----------
  // ligne de la saison en cours ; à la 1re visite d'une saison : rang réduit de moitié et récompense de la précédente
  rankRow(uid) {
    const sc = season();
    let r = this.sql.exec(`SELECT rp, best, games, wins FROM ranks WHERE uid = ? AND sc = ?`, uid, sc).toArray()[0];
    if (r) return r;
    const prev = this.sql.exec(`SELECT sc, rp, best, games, name, av, fr FROM ranks WHERE uid = ? AND sc < ? ORDER BY sc DESC LIMIT 1`, uid, sc).toArray()[0];
    const rp = prev ? softReset(prev.rp) : 0;
    if (prev && prev.games > 0) {
      this.sql.exec(`INSERT OR IGNORE INTO rewards(uid, sc, tier, claimed) VALUES(?,?,?,0)`, uid, prev.sc, tierOf(prev.best));
    }
    this.sql.exec(`INSERT INTO ranks(uid, sc, rp, best, games, wins, name, av, fr) VALUES(?,?,?,?,0,0,?,?,?)`,
      uid, sc, rp, rp, prev?.name || '', prev?.av || '', prev?.fr || '');
    return { rp, best: rp, games: 0, wins: 0 };
  }

  // meilleur rang atteint, toutes saisons confondues (débloque les cadres de rang)
  bestEver(uid) {
    return tierOf(this.sql.exec(`SELECT MAX(best) AS b FROM ranks WHERE uid = ?`, uid).one().b || 0);
  }

  // rang d'un joueur qui entre dans un salon ; avec une catégorie, le salon public de son niveau à rejoindre
  rankOf(uid, cat) {
    const r = this.rankRow(uid), tier = tierOf(r.rp);
    return { rp: r.rp, tier, bestEver: this.bestEver(uid), win: cat ? this.pickWindow(cat, tier) : null };
  }

  // infos de rang pour l'appli ; la récompense de fin de saison n'est donnée qu'une fois
  me(uid) {
    const sc = season();
    const r = this.rankRow(uid);
    const pos = r.games ? this.sql.exec(`SELECT COUNT(*) AS n FROM ranks WHERE sc = ? AND games > 0 AND rp > ?`, sc, r.rp).one().n + 1 : null;
    const rw = this.sql.exec(`SELECT sc, tier FROM rewards WHERE uid = ? AND claimed = 0 ORDER BY sc DESC LIMIT 1`, uid).toArray()[0];
    if (rw) this.sql.exec(`UPDATE rewards SET claimed = 1 WHERE uid = ? AND sc = ?`, uid, rw.sc);
    return { sc, rp: r.rp, tier: tierOf(r.rp), best: tierOf(r.best), bestEver: this.bestEver(uid), games: r.games, wins: r.wins, pos, reward: rw || null,
      rcats: rankedCats(sc, this.env.RANKED_CATS) };
  }

  // fin d'une partie classée : rows = [{ uid, name, av, fr, delta, win, shield }]
  // bouclier de rang (acheté en boutique) : une perte annulée, une fois par jour au plus
  applyRanked(rows) {
    const sc = season(), day = new Date().toISOString().slice(0, 10);
    return rows.map(x => {
      const r = this.rankRow(x.uid);
      let saved = 0;
      if (x.delta < 0 && x.shield && r.rp > 0 && !this.sql.exec(`SELECT 1 FROM shields WHERE uid = ? AND day = ?`, x.uid, day).toArray().length) {
        this.sql.exec(`INSERT INTO shields(uid, day) VALUES(?,?)`, x.uid, day);
        saved = Math.min(-x.delta, r.rp);
        x.delta = 0;
      }
      const rp = Math.max(0, r.rp + x.delta);
      const best = Math.max(r.best, rp);
      this.sql.exec(`UPDATE ranks SET rp = ?, best = ?, games = games + 1, wins = wins + ?, name = ?, av = ?, fr = ? WHERE uid = ? AND sc = ?`,
        rp, best, x.win ? 1 : 0, x.name, x.av, x.fr, x.uid, sc);
      const promo = tierOf(best) > tierOf(r.best) ? tierOf(best) : 0;
      return { uid: x.uid, rp, delta: rp - r.rp, tier: tierOf(rp), prev: tierOf(r.rp), promo, sc, saved };
    });
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
    if (scope !== 'all') return this.rankBoard(uid);
    const sc = 'all';
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

  // classement de la saison : par points de rang
  rankBoard(uid) {
    const sc = season();
    const top = this.sql.exec(`SELECT uid, name, av, fr, rp, games FROM ranks WHERE sc = ? AND games > 0 ORDER BY rp DESC LIMIT 50`, sc).toArray()
      .map(r => ({ name: r.name, av: r.av, fr: r.fr, rp: r.rp, tier: tierOf(r.rp), games: r.games, me: r.uid === uid }));
    let me = null;
    if (uid) {
      const r = this.sql.exec(`SELECT name, av, fr, rp, games FROM ranks WHERE sc = ? AND uid = ? AND games > 0`, sc, uid).toArray()[0];
      if (r) me = { ...r, tier: tierOf(r.rp), me: true, rank: this.sql.exec(`SELECT COUNT(*) AS n FROM ranks WHERE sc = ? AND games > 0 AND rp > ?`, sc, r.rp).one().n + 1 };
    }
    return { season: sc, ranked: true, top, me };
  }

  // état du catalogue ; ?test=1 interroge les deux sources en direct
  async catalogStatus(test) {
    this.warm();
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

  // ---------- code de sauvegarde (progression récupérable sur un autre appareil) ----------
  saveProgress(code, uid, data) {
    const row = this.sql.exec(`SELECT uid FROM saves WHERE code = ?`, code).toArray()[0];
    if (row && row.uid !== uid) return { ok: 0 };
    this.sql.exec(`INSERT OR REPLACE INTO saves(code, uid, data, ts) VALUES(?,?,?,?)`, code, uid, data, Date.now());
    return { ok: 1 };
  }

  loadProgress(code) {
    const row = this.sql.exec(`SELECT uid, data, ts FROM saves WHERE code = ?`, code).toArray()[0];
    return row ? { ok: 1, uid: row.uid, data: row.data, ts: row.ts } : { ok: 0 };
  }

  // tests en local uniquement (MOCK_MUSIC) : simule une saison précédente pour tester le changement de saison
  devPrevSeason(uid, sc, rp) {
    this.sql.exec(`DELETE FROM ranks WHERE uid = ? AND sc = ?`, uid, season());
    this.sql.exec(`DELETE FROM rewards WHERE uid = ?`, uid);
    this.sql.exec(`INSERT OR REPLACE INTO ranks(uid, sc, rp, best, games, wins, name, av, fr) VALUES(?,?,?,?,5,1,'Test','🎧','def')`, uid, sc, rp, rp);
  }

  // version retenue pour chaque morceau (src : it = iTunes, dz = Deezer ; ext : son identifiant chez la source)
  chosenVersions() {
    return this.sql.exec(`SELECT k, ok, src, ext, ts FROM tracks ORDER BY k`).toArray().map(r => {
      const s = songByKey(r.k);
      return { s: s ? `${s.t[0]} — ${s.a[0]}` : r.k, ok: r.ok, src: r.src, ext: r.ext, ts: r.ts };
    });
  }

  failedSongs() {
    return this.sql.exec(`SELECT k FROM tracks WHERE ok = 0`).toArray().map(r => songByKey(r.k)).filter(Boolean)
      .map(s => `${s.t[0]} — ${s.a[0]}`);
  }
}
