// Hub : un seul objet pour tout le site.
// - retrouve les extraits (iTunes, Deezer en secours), mis en mémoire et préchargés petit à petit en tâche de fond
// - compte les joueurs présents dans chaque salon public
// - tient les rangs (points de rang par saison mensuelle) et le classement « tous les temps »
import { DurableObject } from 'cloudflare:workers';
import { songsOf, songByKey, rankedCats, CATS, catOpen, allSongs, frissonsOnly } from './catalog.js';
import { itunesFind, deezerFind, deezerPreview } from './sources.js';
import { tierOf, softReset, fromOldScale, windowsOf } from './ranks.js';
import { publicKey } from './ids.js';
import { langMins, langFits, langOrder } from './mixlang.js';
import { makeVapid, sendPush, epHash, vapidAuth } from './push.js';
import { cleanText } from './filter.js';
import { norm } from './match.js';
import { parisDay, dayAdd, hitNumber, hitCandidates, seededRnd, streaks, friendCode, HIT_N, ONLINE, AT_RE,
  CLUB_MAX, CLUB_EMBLEMS, CLUB_COLORS, clubId } from './social.js';
import { extraMethods, eventState } from './extras.js';
import { accountMethods } from './accounts.js';

const DAY = 86400000;
const FRESH = 30 * DAY;      // au-delà, on rafraîchit en tâche de fond
const RETRY_FAIL = 7 * DAY;  // un morceau introuvable est retenté une semaine plus tard
const WARM_BATCH = 15;       // morceaux recherchés à chaque minute en tâche de fond
// à changer quand la façon de choisir la version (pickBest) change : tous les morceaux sont recherchés à nouveau
// petit à petit en tâche de fond (on garde l'ancienne version en attendant)
const PICKER = '4';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; Zikroom/1.0; blind test)', Accept: 'application/json' };

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const season = (d = new Date()) => d.toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);
const PUSH_SUBJECT = 'https://hitroom.jcolomb10.workers.dev'; // contact demandé par les services de notification
const DAILY_MSG = { title: '🎯 Tes défis du jour t’attendent', body: 'Des pièces et de l’XP à gagner : une petite partie ?', url: '/?go=defis' };
const WELCOME_MSG = { title: '🔔 Notifications activées !', body: 'Tu seras prévenu ici de tes défis, des nouvelles saisons et des invitations de tes amis.', url: '/' };
const SEASON_MSG = { title: '🏆 Nouvelle saison !', body: 'Ta récompense de la saison passée t’attend. Viens grimper les rangs !', url: '/' };
const MAX_FRIENDS = 100;
const CHAL_TTL = 10 * 60000; // un défi ou une invitation reçue reste valable 10 minutes
const catName = c => String(c || 'mix').split('+').map(x => CATS.find(y => y.id === x)?.name).filter(Boolean).join(' + ') || 'Mix';

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
    this.acctInit();
    this.sql.exec(`CREATE TABLE IF NOT EXISTS saves(code TEXT PRIMARY KEY, uid TEXT, data TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS shields(uid TEXT, day TEXT, PRIMARY KEY(uid, day))`);
    // statistiques de fréquentation (sans cookie ni donnée personnelle affichée) : compteurs par jour, joueurs actifs
    this.sql.exec(`CREATE TABLE IF NOT EXISTS daily(day TEXT, k TEXT, n INTEGER, PRIMARY KEY(day, k))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS actives(day TEXT, uid TEXT, PRIMARY KEY(day, uid))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS firsts(uid TEXT PRIMARY KEY, day TEXT)`);
    // première fois : les joueurs déjà connus ne comptent pas comme nouveaux
    if (!this.sql.exec(`SELECT v FROM meta WHERE k = 'stats'`).toArray().length) {
      for (const t of ['ranks', 'scores', 'saves']) this.sql.exec(`INSERT OR IGNORE INTO firsts(uid, day) SELECT DISTINCT uid, '' FROM ${t}`);
      this.sql.exec(`INSERT INTO meta(k, v) VALUES('stats', '1')`);
    }
    // notifications : abonnements (ep = empreinte de l'adresse du téléphone), messages à afficher, invitations envoyées
    this.sql.exec(`CREATE TABLE IF NOT EXISTS subs(ep TEXT PRIMARY KEY, uid TEXT, pk TEXT, endpoint TEXT, prefs TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS subs_pk ON subs(pk)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS inbox(id INTEGER PRIMARY KEY AUTOINCREMENT, ep TEXT, title TEXT, body TEXT, url TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS fnotes(dst TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS invites(from_pk TEXT, to_pk TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS reports(target TEXT, reporter TEXT, pk TEXT, name TEXT, why TEXT, msgs TEXT, room TEXT, ts INTEGER, PRIMARY KEY(target, reporter))`);
    // version 1.15 : fiche publique des joueurs (pseudo, avatar, présence), amis, demandes, défis en duel, bilans des duels
    // (pk = identifiant public ; l'uid ne sort jamais du serveur)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS players(uid TEXT PRIMARY KEY, pk TEXT, fc TEXT, name TEXT, av TEXT, fr TEXT, lvl INTEGER, seen INTEGER, at TEXT)`);
    this.sql.exec(`CREATE UNIQUE INDEX IF NOT EXISTS players_pk ON players(pk)`);
    this.sql.exec(`CREATE UNIQUE INDEX IF NOT EXISTS players_fc ON players(fc)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS friends(a TEXT, b TEXT, ts INTEGER, PRIMARY KEY(a, b))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS freqs(src TEXT, dst TEXT, ts INTEGER, PRIMARY KEY(src, dst))`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS freqs_dst ON freqs(dst)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS chal(dst TEXT, src TEXT, kind TEXT, code TEXT, cat TEXT, ts INTEGER, PRIMARY KEY(dst, src))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS duels(a TEXT, b TEXT, wa INTEGER, wb INTEGER, PRIMARY KEY(a, b))`);
    // Hit du jour : les extraits de chaque jour (les mêmes pour tous) et le résultat de chacun (grid : un chiffre par extrait)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS hitday(day TEXT PRIMARY KEY, keys TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS hits(day TEXT, uid TEXT, pk TEXT, name TEXT, av TEXT, score INTEGER, grid TEXT, done INTEGER, ts INTEGER, PRIMARY KEY(day, uid))`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS hits_score ON hits(day, score DESC)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS hits_uid ON hits(uid, day)`);
    // clubs : membres (un club par joueur), points de chaque membre par saison, total du club par saison, exclusions
    this.sql.exec(`CREATE TABLE IF NOT EXISTS clubs(id TEXT PRIMARY KEY, name TEXT, nk TEXT, e TEXT, c INTEGER, chief TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE UNIQUE INDEX IF NOT EXISTS clubs_nk ON clubs(nk)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS cmembers(uid TEXT PRIMARY KEY, club TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS cmembers_club ON cmembers(club)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS cpts(club TEXT, sc TEXT, uid TEXT, pts INTEGER, PRIMARY KEY(club, sc, uid))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS cseason(club TEXT, sc TEXT, pts INTEGER, PRIMARY KEY(club, sc))`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS cseason_pts ON cseason(sc, pts DESC)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS cban(club TEXT, uid TEXT, ts INTEGER, PRIMARY KEY(club, uid))`);
    this.initExtras();
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

  // n morceaux jouables de la catégorie, en évitant ceux déjà passés dans ce salon ; assez de français et d'autres
  // langues, dans un ordre où jamais 3 morceaux de suite ne sont dans la même langue (mixlang.js)
  async pickSongs(cat, n, avoid = []) {
    this.warm();
    const now = Date.now();
    // jamais joués d'abord (dans le désordre), puis les plus anciennement joués
    const pos = new Map(avoid.map((k, i) => [k, i]));
    const rank = s => (pos.has(s.k) ? pos.get(s.k) : -1);
    const all = songsOf(cat);
    const list = shuffle(all.slice()).sort((x, y) => rank(x) - rank(y));
    const mins = langMins(all, n), cnt = { fr: 0, other: 0 };
    const take = (arr, s) => { arr.push(s); cnt[s.fr ? 'fr' : 'other']++; };
    const picked = [], spare = [], todo = [];
    for (const s of list) {
      if (picked.length >= n) break;
      const r = this.row(s.k);
      const song = r && r.ok ? { ...s, url: r.url, art: r.art, link: r.link, ext: r.ext, src: r.src } : null;
      if (song) (langFits(s, cnt, mins, n) ? take(picked, song) : spare.length < n && spare.push(song));
      else if (!r || now - r.ts > RETRY_FAIL) todo.push(s);
    }
    const out = await this.freshen(picked);
    cnt.fr = out.filter(s => s.fr).length; cnt.other = out.length - cnt.fr;
    // morceaux encore jamais cherchés : on les cherche maintenant, par petits paquets
    let tries = 0;
    while (out.length < n && todo.length && tries < 24) {
      // d'abord la langue dont il manque des morceaux, puis les autres
      const size = Math.min(6, n - out.length + 2), batch = [];
      for (const fr of [true, false]) {
        if (cnt[fr ? 'fr' : 'other'] >= mins[fr ? 'fr' : 'other']) continue;
        for (let i = 0; i < todo.length && batch.length < size; i++) if (todo[i].fr === fr) batch.push(...todo.splice(i--, 1));
      }
      while (batch.length < size && todo.length) batch.push(todo.shift());
      tries += batch.length;
      const res = await Promise.allSettled(batch.map(s => this.resolveAndStore(s)));
      res.forEach((r, i) => {
        if (r.status !== 'fulfilled' || !r.value.ok || out.length >= n) return;
        const song = { ...batch[i], ...r.value };
        if (langFits(song, cnt, mins, n)) take(out, song); else if (spare.length < n) spare.push(song);
      });
      if (Date.now() < this.paused.it && Date.now() < this.paused.dz) break;
    }
    // pas assez dans une langue : on complète avec les autres morceaux trouvés
    if (out.length < n && spare.length) out.push(...(await this.freshen(spare)).slice(0, n - out.length));
    return langOrder(out);
  }

  // les liens Deezer expirent : lien frais pour chaque partie
  async freshen(songs) {
    const res = await Promise.allSettled(songs.map(s => (s.src === 'dz' ? deezerPreview(this.getJSON, s.ext) : s.url)));
    return songs.map((s, i) => (res[i].status === 'fulfilled' && res[i].value ? { ...s, url: res[i].value } : null)).filter(Boolean);
  }

  // tests en local : un tirage de morceaux comme pour une partie (/__mock/pick)
  async devPick(cat, n) { return (await this.pickSongs(cat, n)).map(s => ({ k: s.k, fr: s.fr })); }

  // préchargement progressif du catalogue (WARM_BATCH morceaux par minute)
  warm() {
    if (this.warming) return;
    this.warming = true;
    this.ctx.storage.getAlarm().then(a => { if (!a) this.ctx.storage.setAlarm(Date.now() + 20000); });
  }

  async alarm() {
    const now = Date.now();
    const known = new Map(this.sql.exec(`SELECT k, ok, ts FROM tracks`).toArray().map(r => [r.k, r]));
    const due = [], all = allSongs();
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
  // prof : pseudo et avatar du joueur, gardés dans sa fiche publique (pour devenir ami avec qui on croise en salon)
  rankOf(uid, cat, prof) {
    if (prof) this.touch(uid, prof);
    const r = this.rankRow(uid), tier = tierOf(r.rp), c = this.clubOf(uid);
    return { rp: r.rp, tier, bestEver: this.bestEver(uid), win: cat ? this.pickWindow(cat, tier) : null, club: c ? `${c.e} ${c.name}` : '' };
  }

  // rang de la saison sans rien créer (amis, membres d'un club) : à défaut, celui de la saison passée réduit de moitié
  peekRank(uid) {
    const sc = season();
    const r = this.sql.exec(`SELECT rp FROM ranks WHERE uid = ? AND sc = ?`, uid, sc).toArray()[0]
      || this.sql.exec(`SELECT rp FROM ranks WHERE uid = ? AND sc < ? ORDER BY sc DESC LIMIT 1`, uid, sc).toArray().map(x => ({ rp: softReset(x.rp) }))[0];
    return r?.rp || 0;
  }

  // infos de rang pour l'appli ; la récompense de fin de saison n'est donnée qu'une fois
  me(uid, prof) {
    this.seen(uid);
    if (prof) this.touch(uid, prof);
    const sc = season();
    const r = this.rankRow(uid);
    const pos = r.games ? this.sql.exec(`SELECT COUNT(*) AS n FROM ranks WHERE sc = ? AND games > 0 AND rp > ?`, sc, r.rp).one().n + 1 : null;
    const honors = this.honorsFor(uid);
    const rw = this.sql.exec(`SELECT sc, tier FROM rewards WHERE uid = ? AND claimed = 0 ORDER BY sc DESC LIMIT 1`, uid).toArray()[0];
    if (rw) this.sql.exec(`UPDATE rewards SET claimed = 1 WHERE uid = ? AND sc = ?`, uid, rw.sc);
    return { sc, rp: r.rp, tier: tierOf(r.rp), best: tierOf(r.best), bestEver: this.bestEver(uid), games: r.games, wins: r.wins, pos, reward: rw || null,
      rcats: rankedCats(sc, this.env.RANKED_CATS), honors, ev: this.eventLite(), frissons: catOpen('frissons', this.env) ? 1 : 0 };
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
    const out = { songs: allSongs().length - (catOpen('frissons', this.env) ? 0 : songsOf('frissons').filter(x => frissonsOnly(x.k)).length), checked: r.n || 0, playable: r.ok || 0, bySource: bySrc, sources: this.diag };
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
    this.auditSave(uid, data);
    return { ok: 1 };
  }

  loadProgress(code) {
    const row = this.sql.exec(`SELECT uid, data, ts FROM saves WHERE code = ?`, code).toArray()[0];
    if (row && this.isBound(row.uid)) return { ok: 0, locked: 1 }; // compte : on se connecte avec l'e-mail, pas avec le code
    return row ? { ok: 1, uid: row.uid, data: row.data, ts: row.ts } : { ok: 0 };
  }

  // tests en local uniquement (MOCK_MUSIC) : simule une saison précédente pour tester le changement de saison
  devPrevSeason(uid, sc, rp) {
    this.sql.exec(`DELETE FROM ranks WHERE uid = ? AND sc = ?`, uid, season());
    this.sql.exec(`DELETE FROM rewards WHERE uid = ?`, uid);
    this.sql.exec(`INSERT OR REPLACE INTO ranks(uid, sc, rp, best, games, wins, name, av, fr) VALUES(?,?,?,?,5,1,'Test','🎧','def')`, uid, sc, rp, rp);
  }

  // ---------- notifications (Web Push sans contenu : le service worker vient chercher le message, voir push.js) ----------
  async vapid() {
    const row = this.sql.exec(`SELECT v FROM meta WHERE k = 'vapid'`).toArray()[0];
    if (row) return JSON.parse(row.v);
    const v = await makeVapid();
    this.sql.exec(`INSERT OR IGNORE INTO meta(k, v) VALUES('vapid', ?)`, JSON.stringify(v));
    return JSON.parse(this.sql.exec(`SELECT v FROM meta WHERE k = 'vapid'`).one().v);
  }

  async pushKey() { return (await this.vapid()).pub; }

  // prefs : daily (rappel des défis), season (nouvelle saison), invites, blocked (identifiants publics bloqués)
  async subscribe(uid, endpoint, prefs = {}) {
    if (!/^https:\/\/[^\s]{8,900}$/.test(endpoint || '')) return { ok: 0 };
    const p = {
      daily: prefs.daily !== false, season: prefs.season !== false, invites: prefs.invites !== false, clubs: prefs.clubs !== false, friends: prefs.friends !== false,
      blocked: (Array.isArray(prefs.blocked) ? prefs.blocked : []).filter(x => /^[0-9a-f]{12}$/.test(x)).slice(0, 200),
    };
    const ep = await epHash(endpoint);
    const isNew = !this.sql.exec(`SELECT 1 FROM subs WHERE ep = ?`, ep).toArray().length;
    this.sql.exec(`INSERT OR REPLACE INTO subs(ep, uid, pk, endpoint, prefs, ts) VALUES(?,?,?,?,?,?)`, ep, uid, publicKey(uid), endpoint, JSON.stringify(p), Date.now());
    // 1re fois sur cet appareil : notification de bienvenue, pour voir tout de suite que tout marche
    if (isNew) await this.notify({ ep, endpoint }, WELCOME_MSG);
    // 5 téléphones ou navigateurs au plus par joueur
    for (const r of this.sql.exec(`SELECT ep FROM subs WHERE uid = ? ORDER BY ts DESC LIMIT -1 OFFSET 5`, uid).toArray()) this.dropSub(r.ep);
    return { ok: 1 };
  }

  async unsubscribe(endpoint) { this.dropSub(await epHash(endpoint || '')); return { ok: 1 }; }

  dropSub(ep) {
    this.sql.exec(`DELETE FROM subs WHERE ep = ?`, ep);
    this.sql.exec(`DELETE FROM inbox WHERE ep = ?`, ep);
  }

  // le service worker vient chercher ses messages (3 derniers jours, 3 au plus) ; ils sont effacés une fois lus
  async inboxFor(endpoint) {
    const ep = await epHash(endpoint || '');
    const rows = this.sql.exec(`SELECT title, body, url FROM inbox WHERE ep = ? AND ts > ? ORDER BY id DESC LIMIT 3`, ep, Date.now() - 3 * DAY).toArray();
    this.sql.exec(`DELETE FROM inbox WHERE ep = ?`, ep);
    return rows;
  }

  // message gardé dans la boîte, puis push vide pour réveiller le téléphone ; abonnement effacé s'il n'existe plus
  async notify(sub, msg) {
    this.sql.exec(`INSERT INTO inbox(ep, title, body, url, ts) VALUES(?,?,?,?,?)`, sub.ep, msg.title, msg.body, msg.url || '/', Date.now());
    this.sql.exec(`DELETE FROM inbox WHERE ep = ? AND id NOT IN (SELECT id FROM inbox WHERE ep = ? ORDER BY id DESC LIMIT 5)`, sub.ep, sub.ep);
    const vapid = await this.vapid();
    let res;
    if (this.env.MOCK_MUSIC) { // tests en local : rien n'est envoyé, l'envoi est noté (/__mock/push)
      (this.pushLog ||= []).push({ endpoint: sub.endpoint, auth: await vapidAuth(sub.endpoint, vapid, PUSH_SUBJECT), title: msg.title });
      res = /gone/.test(sub.endpoint) ? 'gone' : 'ok';
    } else res = await sendPush(sub.endpoint, vapid, PUSH_SUBJECT);
    if (res === 'gone') this.dropSub(sub.ep);
    return res;
  }

  // chaque jour en fin d'après-midi (cron du Worker) : le 1er du mois, la nouvelle saison ; sinon le rappel des défis,
  // seulement à ceux qui n'ont pas encore joué aujourd'hui
  async cronDaily(first = new Date().getUTCDate() === 1) {
    const day = today();
    const subs = this.sql.exec(`SELECT ep, uid, endpoint, prefs FROM subs`).toArray();
    const todo = [];
    for (const sub of subs) {
      const p = JSON.parse(sub.prefs || '{}');
      if (first && p.season) todo.push([sub, SEASON_MSG]);
      else if (!first && p.daily && !this.sql.exec(`SELECT 1 FROM actives WHERE day = ? AND uid = ?`, day, sub.uid).toArray().length) todo.push([sub, DAILY_MSG]);
    }
    // clubs et événements (préférence « clubs ») : événement du week-end annoncé le vendredi, club proche de passer devant
    if (!first) {
      const fri = this.clock().getUTCDay() === 5, es = eventState(this.pDay()).ev;
      const rival = new Map();
      for (const c of this.sql.exec(`SELECT club FROM cseason WHERE sc = ? AND pts > 0`, season()).toArray()) {
        const a = this.rivals(c.club).above;
        if (a && a.gap <= 400) rival.set(c.club, a);
      }
      for (const sub of subs) {
        const p = JSON.parse(sub.prefs || '{}');
        if (!p.clubs) continue;
        if (fri) todo.push([sub, { title: `${es.emoji} ${es.name} ce week-end`, body: 'Deux jours pour grimper au classement de l’événement et gagner des pièces. Le tournoi a lieu samedi soir !', url: '/?go=event' }]);
        const c = this.clubOf(sub.uid), a = c && rival.get(c.id);
        if (a) todo.push([sub, { title: `🛡️ ${c.name} talonne ${a.name}`, body: `Il ne manque que ${a.gap} points à ton club pour passer devant. Une partie ?`, url: '/' }]);
      }
    }
    for (let i = 0; i < todo.length; i += 10) await Promise.all(todo.slice(i, i + 10).map(([sub, msg]) => this.notify(sub, msg)));
    return { sent: todo.length };
  }

  // invitation dans un salon entre amis : 10 par heure au plus, 2 par heure à la même personne ;
  // jamais si l'invité a coupé les invitations ou bloqué l'expéditeur (réponse identique : « pas de notifications »)
  // un ami la reçoit aussi dans l'appli (défis et invitations, 10 minutes), même sans notifications
  async invite(fromUid, fromName, code, toPk, kind = 'salon', cat = '') {
    const fromPk = publicKey(fromUid), hour = Date.now() - 3600000;
    if (toPk === fromPk || !/^[A-Z0-9]{4}$/.test(code || '')) return { ok: 0, why: 'err' };
    if (this.sql.exec(`SELECT COUNT(*) AS n FROM invites WHERE from_pk = ? AND ts > ?`, fromPk, hour).one().n >= 10) return { ok: 0, why: 'limit' };
    if (this.sql.exec(`SELECT COUNT(*) AS n FROM invites WHERE from_pk = ? AND to_pk = ? AND ts > ?`, fromPk, toPk, hour).one().n >= 2) return { ok: 0, why: 'again' };
    const subs = this.pushSubs(toPk, fromPk), friend = this.isFriend(fromPk, toPk);
    if (!subs.length && !friend) return { ok: 0, why: 'off' };
    this.sql.exec(`INSERT INTO invites(from_pk, to_pk, ts) VALUES(?,?,?)`, fromPk, toPk, Date.now());
    this.sql.exec(`DELETE FROM invites WHERE ts < ?`, Date.now() - DAY);
    if (friend) this.sql.exec(`INSERT OR REPLACE INTO chal(dst, src, kind, code, cat, ts) VALUES(?,?,?,?,?,?)`, toPk, fromPk, kind, code, cat || '', Date.now());
    const name = String(fromName || 'Un ami').slice(0, 20);
    const msg = kind === 'duel'
      ? { title: `⚔️ ${name} te défie en duel !`, body: `1 contre 1 en ${catName(cat)} : rejoins le duel dans les 10 minutes.`, url: `/?salon=${code}` }
      : { title: `🎵 ${name} t’invite à jouer`, body: `Rejoins son salon Zikroom (code ${code}) !`, url: `/?salon=${code}` };
    await Promise.all(subs.map(s => this.notify(s, msg)));
    return { ok: 1 };
  }

  // appareils abonnés aux notifications d'invitation (et de demandes d'amis) de ce joueur, sauf s'il a bloqué l'expéditeur
  pushSubs(toPk, fromPk) {
    return this.sql.exec(`SELECT ep, uid, endpoint, prefs FROM subs WHERE pk = ?`, toPk).toArray().filter(s => {
      const p = JSON.parse(s.prefs || '{}');
      return p.invites && !(p.blocked || []).includes(fromPk);
    });
  }

  devPush() { return { subs: this.sql.exec(`SELECT pk, endpoint, prefs FROM subs`).toArray(), log: this.pushLog || [] }; }

  // ---------- statistiques de fréquentation ----------
  bump(k, n = 1) {
    this.sql.exec(`INSERT INTO daily(day, k, n) VALUES(?,?,?) ON CONFLICT(day, k) DO UPDATE SET n = n + excluded.n`, today(), k, n);
  }

  // joueur qui ouvre l'appli (/api/me) : actif aujourd'hui, nouveau s'il n'était jamais venu
  seen(uid) {
    const day = today();
    this.sql.exec(`INSERT OR IGNORE INTO actives(day, uid) VALUES(?,?)`, day, uid);
    if (!this.sql.exec(`SELECT 1 FROM firsts WHERE uid = ?`, uid).toArray().length) {
      this.sql.exec(`INSERT INTO firsts(uid, day) VALUES(?,?)`, uid, day);
      this.bump('new');
    }
    if (this.lastPurge !== day) { // les joueurs actifs ne sont gardés que 60 jours
      this.lastPurge = day;
      this.sql.exec(`DELETE FROM actives WHERE day < ?`, new Date(Date.now() - 60 * DAY).toISOString().slice(0, 10));
    }
  }

  // fin d'une partie (tous les modes) : kind = ranked, open, priv, solo ; humains = joueurs qui ont joué
  countGame(kind, cat, humans) {
    this.bump('games');
    this.bump('g:' + kind);
    this.bump('h:' + kind, humans);
    for (const c of String(cat).split('+')) this.bump('c:' + c);
  }

  // pour le propriétaire du jeu (/api/stats?key=…, page /stats.html) : 30 derniers jours
  statsReport() {
    const days = [];
    for (let i = 29; i >= 0; i--) days.push(new Date(Date.now() - i * DAY).toISOString().slice(0, 10));
    const since = days[0], week = days[23];
    const per = Object.fromEntries(days.map(d => [d, { d, actifs: 0, nouveaux: 0, parties: 0 }]));
    for (const r of this.sql.exec(`SELECT day, COUNT(*) AS n FROM actives WHERE day >= ? GROUP BY day`, since).toArray()) if (per[r.day]) per[r.day].actifs = r.n;
    const modes = {}, joueurs = {}, cats = {};
    for (const r of this.sql.exec(`SELECT day, k, n FROM daily WHERE day >= ?`, since).toArray()) {
      if (!per[r.day]) continue;
      if (r.k === 'new') per[r.day].nouveaux = r.n;
      else if (r.k === 'games') per[r.day].parties = r.n;
      else if (r.k.startsWith('g:')) modes[r.k.slice(2)] = (modes[r.k.slice(2)] || 0) + r.n;
      else if (r.k.startsWith('h:')) joueurs[r.k.slice(2)] = (joueurs[r.k.slice(2)] || 0) + r.n;
      else if (r.k.startsWith('c:')) cats[r.k.slice(2)] = (cats[r.k.slice(2)] || 0) + r.n;
    }
    const distinct = d => this.sql.exec(`SELECT COUNT(DISTINCT uid) AS n FROM actives WHERE day >= ?`, d).one().n;
    return {
      jours: days.map(d => per[d]), modes, joueurs, cats,
      aujourdhui: per[days[29]].actifs, semaine: distinct(week), mois: distinct(since),
      total: this.sql.exec(`SELECT COUNT(*) AS n FROM firsts`).one().n,
      signalements: this.sql.exec(`SELECT COUNT(DISTINCT target) AS n FROM reports WHERE ts > ?`, Date.now() - 30 * DAY).one().n,
    };
  }

  // ---------- signalements (chat) ----------
  // un joueur ne signale qu'une fois la même personne, 10 signalements par jour au plus ;
  // 3 personnes différentes en 24 h : chat suspendu 24 h (isMuted)
  addReport({ reporter, target, pk, name, why, msgs, room }) {
    const since = Date.now() - DAY;
    if (this.sql.exec(`SELECT COUNT(*) AS n FROM reports WHERE reporter = ? AND ts > ?`, reporter, since).one().n >= 10) return { ok: 0 };
    this.sql.exec(`INSERT OR REPLACE INTO reports(target, reporter, pk, name, why, msgs, room, ts) VALUES(?,?,?,?,?,?,?,?)`,
      target, reporter, pk || '', String(name || '').slice(0, 30), why, JSON.stringify(msgs || []).slice(0, 2000), room || '', Date.now());
    return { ok: 1, muted: this.isMuted(target) };
  }

  isMuted(uid) {
    return this.sql.exec(`SELECT COUNT(*) AS n FROM reports WHERE target = ? AND ts > ?`, uid, Date.now() - DAY).one().n >= 3;
  }

  // pour le propriétaire du jeu (/api/signalements?key=…) : joueurs signalés, sans leur identifiant secret
  reportList() {
    const rows = this.sql.exec(`SELECT target, pk, name, why, msgs, room, ts FROM reports ORDER BY ts DESC LIMIT 500`).toArray();
    const by = new Map();
    for (const r of rows) {
      const x = by.get(r.target) || { pk: r.pk, name: r.name, n: 0, why: {}, msgs: [], last: r.ts, muted: this.isMuted(r.target) };
      x.n++;
      x.why[r.why] = (x.why[r.why] || 0) + 1;
      for (const m of JSON.parse(r.msgs || '[]')) if (x.msgs.length < 10 && !x.msgs.includes(m)) x.msgs.push(m);
      by.set(r.target, x);
    }
    return [...by.values()].sort((a, b) => b.n - a.n);
  }

  // version retenue pour chaque morceau (src : it = iTunes, dz = Deezer ; ext : son identifiant chez la source)
  chosenVersions() {
    return this.sql.exec(`SELECT k, ok, src, ext, ts FROM tracks ORDER BY k`).toArray().map(r => {
      const s = songByKey(r.k);
      return { s: s ? `${s.t[0]} — ${s.a[0]}` : r.k, ok: r.ok, src: r.src, ext: r.ext, ts: r.ts };
    });
  }

  // les morceaux Frissons (playlist secrète avant le 30/10 à midi) n'apparaissent pas sans le paramètre ?f=1
  failedSongs(withFrissons) {
    return this.sql.exec(`SELECT k FROM tracks WHERE ok = 0`).toArray().filter(r => withFrissons || catOpen('frissons', this.env) || !frissonsOnly(r.k)).map(r => songByKey(r.k)).filter(Boolean)
      .map(s => `${s.t[0]} — ${s.a[0]}`);
  }

  // ---------- joueurs : fiche publique et présence (amis, clubs) ----------
  // prof = { name, av, fr, lvl } venu de l'appli ; at = où il se trouve (AT_RE), donné par /api/ping seulement ;
  // renvoie son identifiant public
  touch(uid, prof = {}, at) {
    const pk = publicKey(uid);
    const old = this.sql.exec(`SELECT fc, name, av, fr, lvl, seen, at FROM players WHERE uid = ?`, uid).toArray()[0];
    const nm = prof.name != null ? cleanText(prof.name, 16) : '';
    const name = nm && !/\*/.test(nm) && /[\p{L}\p{N}]/u.test(nm) ? nm : old?.name || 'Joueur';
    const av = Array.from(String(prof.av || '')).slice(0, 4).join('') || old?.av || 'A02';
    const fr = /^[a-z0-9-]{1,12}$/.test(prof.fr || '') && !/^r[0-8]$/.test(prof.fr) ? prof.fr : old?.fr || 'def';
    const lv = parseInt(prof.lvl, 10), lvl = lv > 0 && lv < 1000 ? lv : old?.lvl || 1;
    const seen = at != null ? Date.now() : old?.seen || 0;
    const where = at != null ? (AT_RE.test(at) ? at : 'menu') : old?.at || 'menu';
    this.sql.exec(`INSERT OR REPLACE INTO players(uid, pk, fc, name, av, fr, lvl, seen, at) VALUES(?,?,?,?,?,?,?,?,?)`,
      uid, pk, old?.fc || this.newFc(pk), name, av, fr, lvl, seen, where);
    return pk;
  }

  // code ami de 6 caractères, unique
  newFc(pk) {
    for (let i = 0; i < 50; i++) {
      const fc = friendCode(pk, i);
      if (!this.sql.exec(`SELECT 1 FROM players WHERE fc = ?`, fc).toArray().length) return fc;
    }
    return friendCode(pk + Date.now());
  }

  // l'appli se signale chaque minute : amis en ligne, demandes reçues, défis et invitations en attente, son club
  ping(uid, prof, at) {
    const before = this.sql.exec(`SELECT at, seen FROM players WHERE uid = ?`, uid).toArray()[0], now = Date.now();
    const pk = this.touch(uid, prof, at || 'menu');
    // « tes amis jouent » : on vient d'entrer dans une vraie partie (classé, non classé, salon, duel)
    const w = this.sql.exec(`SELECT name, at FROM players WHERE uid = ?`, uid).toArray()[0];
    const live = a => /^(ranked|open|priv|duel):/.test(a || '');
    if (w && live(w.at) && !(before && live(before.at) && now - before.seen < ONLINE)) this.friendsJoin(pk, w.name, w.at).catch(() => {});
    this.sql.exec(`DELETE FROM chal WHERE ts < ?`, now - CHAL_TTL);
    const on = this.sql.exec(`SELECT p.name, p.av FROM friends f JOIN players p ON p.pk = f.b WHERE f.a = ? AND p.seen > ? ORDER BY p.seen DESC`, pk, now - ONLINE).toArray();
    const c = this.clubOf(uid);
    return {
      on: on.length, onl: on.slice(0, 3), nf: this.sql.exec(`SELECT COUNT(*) AS n FROM friends WHERE a = ?`, pk).one().n,
      rq: this.sql.exec(`SELECT COUNT(*) AS n FROM freqs WHERE dst = ?`, pk).one().n,
      ch: this.sql.exec(`SELECT c.src AS pk, c.kind, c.code, c.cat, c.ts, p.name, p.av FROM chal c LEFT JOIN players p ON p.pk = c.src WHERE c.dst = ? ORDER BY c.ts DESC LIMIT 5`, pk).toArray(),
      club: c ? { id: c.id, name: c.name, e: c.e, c: c.c } : null,
    };
  }

  // prévient les amis qui ne sont pas dans l'appli : une fois toutes les 3 h au plus par personne, jamais si bloqué ou coupé
  async friendsJoin(pk, name, at) {
    const now = Date.now(), friends = this.sql.exec(`SELECT p.pk, p.seen FROM friends f JOIN players p ON p.pk = f.b WHERE f.a = ?`, pk).toArray();
    const code = /^(priv|duel):([A-Z0-9]{4})$/.exec(at)?.[2];
    const msg = { title: `🎧 ${String(name).slice(0, 20)} joue en ce moment`, body: code ? 'Rejoins son salon Zikroom !' : 'Viens jouer avec lui sur Zikroom !', url: code ? `/?salon=${code}` : '/' };
    this.sql.exec(`DELETE FROM fnotes WHERE ts < ?`, now - 3 * 3600000);
    for (const f of friends) {
      if (now - f.seen < ONLINE * 4) continue;                                   // déjà dans l'appli
      if (this.sql.exec(`SELECT 1 FROM fnotes WHERE dst = ?`, f.pk).toArray().length) continue;
      const subs = this.sql.exec(`SELECT ep, uid, endpoint, prefs FROM subs WHERE pk = ?`, f.pk).toArray().filter(x => { const p = JSON.parse(x.prefs || '{}'); return p.friends !== false && p.invites !== false && !(p.blocked || []).includes(pk); });
      if (!subs.length) continue;
      this.sql.exec(`INSERT INTO fnotes(dst, ts) VALUES(?,?)`, f.pk, now);
      await this.notifyAll(subs, msg);
    }
  }

  isFriend(a, b) { return !!this.sql.exec(`SELECT 1 FROM friends WHERE a = ? AND b = ?`, a, b).toArray().length; }

  makeFriends(a, b) {
    const now = Date.now();
    this.sql.exec(`INSERT OR IGNORE INTO friends(a, b, ts) VALUES(?,?,?)`, a, b, now);
    this.sql.exec(`INSERT OR IGNORE INTO friends(a, b, ts) VALUES(?,?,?)`, b, a, now);
    this.sql.exec(`DELETE FROM freqs WHERE (src = ? AND dst = ?) OR (src = ? AND dst = ?)`, a, b, b, a);
  }

  async notifyAll(subs, msg) { await Promise.all(subs.map(s => this.notify(s, msg).catch(() => {}))); }

  // mes amis (en ligne d'abord) avec leur rang, leur Hit du jour et notre bilan en duel ; demandes reçues et envoyées
  friendList(uid) {
    const pk = this.touch(uid), now = Date.now(), day = parisDay();
    const list = this.sql.exec(`SELECT p.uid, p.pk, p.name, p.av, p.fr, p.lvl, p.seen, p.at FROM friends f JOIN players p ON p.pk = f.b WHERE f.a = ?`, pk).toArray()
      .map(r => {
        const on = now - r.seen < ONLINE, rp = this.peekRank(r.uid);
        const hit = this.sql.exec(`SELECT score, grid FROM hits WHERE day = ? AND uid = ?`, day, r.uid).toArray()[0] || null;
        return { pk: r.pk, name: r.name, av: r.av, fr: r.fr, lvl: r.lvl, on, at: on ? r.at : '', seen: r.seen, rp, tier: tierOf(rp), hit, duel: this.duelOf(pk, r.pk) };
      }).sort((a, b) => b.on - a.on || b.seen - a.seen);
    const reqs = (col, by) => this.sql.exec(`SELECT r.${col} AS pk, r.ts, p.name, p.av, p.lvl FROM freqs r LEFT JOIN players p ON p.pk = r.${col} WHERE r.${by} = ? ORDER BY r.ts DESC`, pk).toArray();
    const rp = this.peekRank(uid);
    return { pk, code: this.sql.exec(`SELECT fc FROM players WHERE uid = ?`, uid).one().fc, list, inq: reqs('src', 'dst'), outq: reqs('dst', 'src'),
      max: MAX_FRIENDS, me: { rp, tier: tierOf(rp), hit: this.sql.exec(`SELECT score, grid FROM hits WHERE day = ? AND uid = ?`, day, uid).toArray()[0] || null } };
  }

  // act : add (pk ou fc = code ami), accept, decline, cancel, remove, duel (code du salon, cat), answer (yes) ;
  // une demande à quelqu'un qui m'avait déjà demandé = amis tout de suite
  async friendAct(uid, b = {}) {
    const me = this.touch(uid), now = Date.now();
    const myName = this.sql.exec(`SELECT name FROM players WHERE uid = ?`, uid).one().name;
    let pk = String(b.pk || '');
    if (b.fc) pk = this.sql.exec(`SELECT pk FROM players WHERE fc = ?`, String(b.fc).toUpperCase().replace(/[^A-Z0-9]/g, '')).toArray()[0]?.pk || '';
    if (!/^[0-9a-f]{12}$/.test(pk)) return { ok: 0, why: b.fc ? 'code' : 'err' };
    if (pk === me) return { ok: 0, why: 'self' };
    const other = this.sql.exec(`SELECT uid, name FROM players WHERE pk = ?`, pk).toArray()[0];
    const count = p => this.sql.exec(`SELECT COUNT(*) AS n FROM friends WHERE a = ?`, p).one().n;
    const asked = (src, dst) => !!this.sql.exec(`SELECT 1 FROM freqs WHERE src = ? AND dst = ?`, src, dst).toArray().length;
    switch (b.act) {
      case 'add': {
        if (!other) return { ok: 0, why: b.fc ? 'code' : 'unknown' };
        const name = other.name;
        if (this.isFriend(me, pk)) return { ok: 1, state: 'friend', name };
        if (count(me) >= MAX_FRIENDS) return { ok: 0, why: 'full' };
        if (count(pk) >= MAX_FRIENDS) return { ok: 0, why: 'full2', name };
        if (asked(pk, me)) { this.makeFriends(me, pk); return { ok: 1, state: 'friend', name }; }
        if (asked(me, pk)) return { ok: 1, state: 'sent', name };
        if (this.sql.exec(`SELECT COUNT(*) AS n FROM freqs WHERE src = ?`, me).one().n >= 30) return { ok: 0, why: 'limit' };
        this.sql.exec(`INSERT INTO freqs(src, dst, ts) VALUES(?,?,?)`, me, pk, now);
        await this.notifyAll(this.pushSubs(pk, me), { title: `👥 ${myName} t’a envoyé une demande d’ami`, body: 'Accepte-la pour vous voir en ligne et jouer en duel.', url: '/?go=amis' });
        return { ok: 1, state: 'sent', name };
      }
      case 'accept':
        if (!asked(pk, me)) return { ok: 0, why: 'gone' };
        if (count(me) >= MAX_FRIENDS) return { ok: 0, why: 'full' };
        this.makeFriends(me, pk);
        await this.notifyAll(this.pushSubs(pk, me), { title: `✅ ${myName} a accepté ta demande d’ami`, body: 'Défie ton nouvel ami en duel !', url: '/?go=amis' });
        return { ok: 1, state: 'friend' };
      case 'decline': this.sql.exec(`DELETE FROM freqs WHERE src = ? AND dst = ?`, pk, me); return { ok: 1 };
      case 'cancel': this.sql.exec(`DELETE FROM freqs WHERE src = ? AND dst = ?`, me, pk); return { ok: 1 };
      case 'remove': this.sql.exec(`DELETE FROM friends WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)`, me, pk, pk, me); return { ok: 1 };
      case 'duel':
        if (!this.isFriend(me, pk)) return { ok: 0, why: 'friend' };
        return this.invite(uid, myName, String(b.code || ''), pk, 'duel', String(b.cat || '').replace(/[^a-z0-9+]/g, '').slice(0, 30));
      case 'answer': {
        const c = this.sql.exec(`SELECT code FROM chal WHERE dst = ? AND src = ?`, me, pk).toArray()[0];
        this.sql.exec(`DELETE FROM chal WHERE dst = ? AND src = ?`, me, pk);
        // refus : le salon de celui qui invite est prévenu tout de suite
        if (c && !b.yes) await this.env.ROOMS.get(this.env.ROOMS.idFromName('priv:' + c.code)).note(`${myName} ne peut pas jouer maintenant.`).catch(() => {});
        return { ok: 1 };
      }
    }
    return { ok: 0, why: 'err' };
  }

  // bilan des duels entre deux joueurs : [mes victoires, les siennes] (null s'ils ne se sont jamais affrontés)
  duelOf(me, other) {
    const [x, y] = me < other ? [me, other] : [other, me];
    const r = this.sql.exec(`SELECT wa, wb FROM duels WHERE a = ? AND b = ?`, x, y).toArray()[0];
    return r ? (me === x ? [r.wa, r.wb] : [r.wb, r.wa]) : null;
  }

  // fin d'un duel : win = uid du gagnant ('' : égalité) ; renvoie le bilan vu par chacun
  duelResult(uidA, uidB, win) {
    const a = publicKey(uidA), b = publicKey(uidB), [x, y] = a < b ? [a, b] : [b, a], w = win ? publicKey(win) : '';
    this.sql.exec(`INSERT INTO duels(a, b, wa, wb) VALUES(?,?,?,?) ON CONFLICT(a, b) DO UPDATE SET wa = wa + excluded.wa, wb = wb + excluded.wb`,
      x, y, w === x ? 1 : 0, w === y ? 1 : 0);
    return { [uidA]: this.duelOf(a, b), [uidB]: this.duelOf(b, a) };
  }

  // ---------- Hit du jour : les mêmes extraits pour tout le monde, un essai par jour ----------
  // choisis au premier joueur de la journée puis gardés (hitday) ; liens Deezer frais à chaque partie
  async hitSongs(day) {
    let keys = JSON.parse(this.sql.exec(`SELECT keys FROM hitday WHERE day = ?`, day).toArray()[0]?.keys || 'null');
    if (!keys) {
      this.hitP ||= new Map(); // deux joueurs au même moment : un seul tirage
      if (!this.hitP.has(day)) this.hitP.set(day, this.hitPick(day).finally(() => this.hitP.delete(day)));
      keys = await this.hitP.get(day);
    }
    const songs = keys.map(k => {
      const s = songByKey(k), r = this.row(k);
      return s && r?.ok ? { ...s, url: r.url, art: r.art, link: r.link, ext: r.ext, src: r.src } : null;
    }).filter(Boolean);
    return this.freshen(songs);
  }

  // parmi les morceaux les plus connus (HIT_POOL par catégorie), dans un ordre tiré d'après la date : une seule
  // catégorie par morceau, au moins 2 en français et 2 dans une autre langue, rien des 90 derniers jours
  async hitPick(day) {
    const recent = new Set(this.sql.exec(`SELECT keys FROM hitday WHERE day < ? ORDER BY day DESC LIMIT 90`, day).toArray().flatMap(r => JSON.parse(r.keys)));
    const out = [], cats = new Set(), cnt = { fr: 0, other: 0 }, mins = { fr: 2, other: 2 };
    let tries = 0;
    for (const s of hitCandidates(day)) {
      if (out.length >= HIT_N) break;
      if (recent.has(s.k) || cats.has(s.cat) || !langFits(s, cnt, mins, HIT_N)) continue;
      let r = this.row(s.k);
      if (!r || (!r.ok && Date.now() - r.ts > RETRY_FAIL)) {
        if (tries++ >= 25) continue;
        try { r = await this.resolveAndStore(s); } catch { continue; }
      }
      if (!r.ok) continue;
      out.push(s);
      cats.add(s.cat);
      cnt[s.fr ? 'fr' : 'other']++;
    }
    if (out.length < HIT_N) throw new Error('Hit du jour : pas assez de morceaux jouables');
    this.sql.exec(`INSERT OR IGNORE INTO hitday(day, keys) VALUES(?,?)`, day, JSON.stringify(langOrder(out, seededRnd('ordre:' + day)).map(s => s.k)));
    this.sql.exec(`DELETE FROM hitday WHERE day < ?`, dayAdd(day, -120));
    return JSON.parse(this.sql.exec(`SELECT keys FROM hitday WHERE day = ?`, day).one().keys);
  }

  hitStatus(uid, day) { return this.sql.exec(`SELECT score, grid, done FROM hits WHERE day = ? AND uid = ?`, day, uid).toArray()[0] || null; }

  // résultat enregistré dès le 1er extrait puis après chacun (une partie quittée en route compte telle quelle) ;
  // grid : un chiffre par extrait (0 rien, 1 titre, 2 artiste, 3 les deux) ; à la fin : place du jour et série de jours
  hitSave(uid, day, prof, score, grid, done) {
    this.sql.exec(`INSERT INTO hits(day, uid, pk, name, av, score, grid, done, ts) VALUES(?,?,?,?,?,?,?,?,?)
      ON CONFLICT(day, uid) DO UPDATE SET name = excluded.name, av = excluded.av, score = excluded.score, grid = excluded.grid, done = excluded.done`,
      day, uid, publicKey(uid), String(prof?.name || '').slice(0, 16), String(prof?.av || ''), score, grid, done ? 1 : 0, Date.now());
    if (this.hitPurge !== day) { this.hitPurge = day; this.sql.exec(`DELETE FROM hits WHERE day < ?`, dayAdd(day, -400)); }
    return done ? this.hitRank(uid, day) : null;
  }

  hitRank(uid, day) {
    const me = this.hitStatus(uid, day);
    if (!me) return null;
    const st = streaks(this.sql.exec(`SELECT day FROM hits WHERE uid = ? ORDER BY day DESC LIMIT 400`, uid).toArray().map(r => r.day), parisDay());
    return { day, n: hitNumber(day), score: me.score, grid: me.grid, done: me.done,
      rank: this.sql.exec(`SELECT COUNT(*) AS n FROM hits WHERE day = ? AND score > ?`, day, me.score).one().n + 1,
      total: this.sql.exec(`SELECT COUNT(*) AS n FROM hits WHERE day = ?`, day).one().n, streak: st.cur, best: st.best };
  }

  // pour l'appli (/api/hit) : n° du jour, mon résultat, ma série, les meilleurs du jour et mes amis
  hitInfo(uid) {
    const day = parisDay(), pk = uid ? publicKey(uid) : '';
    const st = uid ? streaks(this.sql.exec(`SELECT day FROM hits WHERE uid = ? ORDER BY day DESC LIMIT 400`, uid).toArray().map(r => r.day), day) : { cur: 0, best: 0 };
    return {
      day, n: hitNumber(day), songs: HIT_N, mine: uid ? this.hitRank(uid, day) : null, streak: st.cur, best: st.best,
      total: this.sql.exec(`SELECT COUNT(*) AS n FROM hits WHERE day = ?`, day).one().n,
      top: this.sql.exec(`SELECT pk, name, av, score, grid FROM hits WHERE day = ? ORDER BY score DESC, ts ASC LIMIT 20`, day).toArray().map(r => ({ ...r, me: r.pk === pk })),
      friends: pk ? this.sql.exec(`SELECT h.pk, h.name, h.av, h.score, h.grid FROM friends f JOIN players p ON p.pk = f.b JOIN hits h ON h.uid = p.uid AND h.day = ? WHERE f.a = ? ORDER BY h.score DESC`, day, pk).toArray() : [],
    };
  }

  // tests en local uniquement (MOCK_MUSIC) : un Hit du jour déjà joué un autre jour (séries de jours)
  devHit(uid, day, score) { this.hitSave(uid, day, { name: 'Test', av: 'A01' }, score, '33333', 1); return this.hitInfo(uid); }

  // ---------- clubs : une équipe par joueur, classement des clubs par saison ----------
  clubOf(uid) {
    return this.sql.exec(`SELECT c.id, c.name, c.e, c.c, c.chief FROM cmembers m JOIN clubs c ON c.id = m.club WHERE m.uid = ?`, uid).toArray()[0] || null;
  }

  // carte d'un club pour les listes : membres, points et place de la saison
  clubCard(c, sc = season()) {
    const pts = this.sql.exec(`SELECT pts FROM cseason WHERE club = ? AND sc = ?`, c.id, sc).toArray()[0]?.pts || 0;
    return { id: c.id, name: c.name, e: c.e, c: c.c, pts, n: this.sql.exec(`SELECT COUNT(*) AS n FROM cmembers WHERE club = ?`, c.id).one().n,
      rank: pts > 0 ? this.sql.exec(`SELECT COUNT(*) AS n FROM cseason WHERE sc = ? AND pts > ?`, sc, pts).one().n + 1 : null };
  }

  // classement des clubs de la saison, mon club, et des clubs à rejoindre (pas complets ; q = recherche par nom)
  clubList(uid, q = '') {
    const sc = season(), mine = uid ? this.clubOf(uid) : null, nq = norm(q);
    const top = this.sql.exec(`SELECT c.id, c.name, c.e, c.c FROM cseason s JOIN clubs c ON c.id = s.club WHERE s.sc = ? AND s.pts > 0 ORDER BY s.pts DESC LIMIT 50`, sc).toArray();
    const pool = nq ? this.sql.exec(`SELECT id, name, e, c FROM clubs WHERE nk LIKE ? LIMIT 40`, '%' + nq + '%').toArray()
      : this.sql.exec(`SELECT c.id, c.name, c.e, c.c FROM clubs c LEFT JOIN cseason s ON s.club = c.id AND s.sc = ? ORDER BY COALESCE(s.pts, 0) DESC, c.ts DESC LIMIT 60`, sc).toArray();
    return { sc, mine: mine ? this.clubCard(mine, sc) : null, top: top.map(c => this.clubCard(c, sc)), max: CLUB_MAX,
      open: pool.map(c => this.clubCard(c, sc)).filter(c => c.n < CLUB_MAX && c.id !== mine?.id).sort((a, b) => b.pts - a.pts || b.n - a.n).slice(0, 20) };
  }

  // page d'un club : membres (sans leur uid) avec leurs points de la saison
  clubInfo(id, uid) {
    const c = this.sql.exec(`SELECT id, name, e, c, chief FROM clubs WHERE id = ?`, id).toArray()[0];
    if (!c) return { error: 'Ce club n’existe plus.' };
    const sc = season(), mine = uid ? this.clubOf(uid) : null;
    const members = this.sql.exec(`SELECT m.uid, m.ts, p.pk, p.name, p.av, p.fr, p.lvl, (SELECT pts FROM cpts WHERE club = m.club AND sc = ? AND uid = m.uid) AS pts
      FROM cmembers m LEFT JOIN players p ON p.uid = m.uid WHERE m.club = ?`, sc, id).toArray()
      .map(m => ({ pk: m.pk || publicKey(m.uid), name: m.name || 'Joueur', av: m.av || 'A02', fr: m.fr || 'def', lvl: m.lvl || 1, pts: m.pts || 0,
        tier: tierOf(this.peekRank(m.uid)), chief: m.uid === c.chief, me: m.uid === uid, since: m.ts }))
      .sort((a, b) => b.pts - a.pts || a.since - b.since);
    return { ...this.clubCard(c, sc), sc, max: CLUB_MAX, member: mine?.id === id, chief: !!uid && c.chief === uid, inClub: mine ? mine.name : '', members, ...this.clubExtra(id, uid, mine?.id === id) };
  }

  clubName(raw) {
    const n = cleanText(raw, 20).trim();
    return n.replace(/[^\p{L}\p{N}]/gu, '').length >= 3 && !/\*/.test(n) ? n : '';
  }

  // act : create (name, e, c), join (id ; move = quitter son club d'abord), leave, edit (chef), kick (chef, pk)
  clubAct(uid, b = {}) {
    this.touch(uid);
    const mine = this.clubOf(uid), now = Date.now();
    const color = Math.min(CLUB_COLORS - 1, Math.max(0, parseInt(b.c, 10) || 0)), emblem = CLUB_EMBLEMS.includes(b.e) ? b.e : null;
    const taken = (name, except) => !!this.sql.exec(`SELECT 1 FROM clubs WHERE nk = ? AND id != ?`, norm(name), except || '').toArray().length;
    switch (b.act) {
      case 'create': {
        if (mine) return { ok: 0, why: 'already', name: mine.name };
        const name = this.clubName(b.name);
        if (!name) return { ok: 0, why: 'name' };
        if (taken(name)) return { ok: 0, why: 'taken' };
        if (this.sql.exec(`SELECT COUNT(*) AS n FROM clubs WHERE chief = ? AND ts > ?`, uid, now - DAY).one().n >= 3) return { ok: 0, why: 'limit' };
        let id;
        do id = clubId(Math.random); while (this.sql.exec(`SELECT 1 FROM clubs WHERE id = ?`, id).toArray().length);
        this.sql.exec(`INSERT INTO clubs(id, name, nk, e, c, chief, ts) VALUES(?,?,?,?,?,?,?)`, id, name, norm(name), emblem || CLUB_EMBLEMS[0], color, uid, now);
        this.sql.exec(`INSERT INTO cmembers(uid, club, ts) VALUES(?,?,?)`, uid, id, now);
        return { ok: 1, id };
      }
      case 'join': {
        const id = String(b.id || '').toUpperCase();
        if (!this.sql.exec(`SELECT 1 FROM clubs WHERE id = ?`, id).toArray().length) return { ok: 0, why: 'gone' };
        if (mine?.id === id) return { ok: 1, id };
        if (mine && !b.move) return { ok: 0, why: 'already', name: mine.name };
        if (this.sql.exec(`SELECT COUNT(*) AS n FROM cmembers WHERE club = ?`, id).one().n >= CLUB_MAX) return { ok: 0, why: 'full' };
        if (this.sql.exec(`SELECT 1 FROM cban WHERE club = ? AND uid = ? AND ts > ?`, id, uid, now - 7 * DAY).toArray().length) return { ok: 0, why: 'banned' };
        if (mine) this.leaveClub(uid, mine);
        this.sql.exec(`INSERT OR REPLACE INTO cmembers(uid, club, ts) VALUES(?,?,?)`, uid, id, now);
        return { ok: 1, id };
      }
      case 'leave':
        if (mine) this.leaveClub(uid, mine);
        return { ok: 1 };
      case 'chest': return mine ? this.claimChest(uid, mine.id) : { ok: 0, why: 'club' };
      case 'war': return mine ? this.claimWar(uid, mine.id) : { ok: 0, why: 'club' };
      case 'edit': {
        if (!mine || mine.chief !== uid) return { ok: 0, why: 'chief' };
        const name = b.name != null ? this.clubName(b.name) : mine.name;
        if (!name) return { ok: 0, why: 'name' };
        if (taken(name, mine.id)) return { ok: 0, why: 'taken' };
        this.sql.exec(`UPDATE clubs SET name = ?, nk = ?, e = ?, c = ? WHERE id = ?`, name, norm(name), emblem || mine.e, b.c != null ? color : mine.c, mine.id);
        return { ok: 1, id: mine.id };
      }
      case 'kick': {
        if (!mine || mine.chief !== uid) return { ok: 0, why: 'chief' };
        const t = this.sql.exec(`SELECT m.uid FROM players p JOIN cmembers m ON m.uid = p.uid WHERE p.pk = ? AND m.club = ?`, String(b.pk || ''), mine.id).toArray()[0];
        if (!t || t.uid === uid) return { ok: 0, why: 'err' };
        this.sql.exec(`DELETE FROM cmembers WHERE uid = ?`, t.uid);
        this.sql.exec(`INSERT OR REPLACE INTO cban(club, uid, ts) VALUES(?,?,?)`, mine.id, t.uid, now); // pas de retour avant 7 jours
        return { ok: 1 };
      }
    }
    return { ok: 0, why: 'err' };
  }

  // le chef qui part passe la main au plus ancien membre ; un club vide disparaît, avec ses points
  leaveClub(uid, club) {
    this.sql.exec(`DELETE FROM cmembers WHERE uid = ?`, uid);
    const next = this.sql.exec(`SELECT uid FROM cmembers WHERE club = ? ORDER BY ts LIMIT 1`, club.id).toArray()[0];
    if (!next) for (const t of ['clubs WHERE id', 'cpts WHERE club', 'cseason WHERE club', 'cban WHERE club', 'cwk WHERE club', 'cwar WHERE club', 'cwpm WHERE club', 'chonors WHERE club']) this.sql.exec(`DELETE FROM ${t} = ?`, club.id);
    else if (club.chief === uid) this.sql.exec(`UPDATE clubs SET chief = ? WHERE id = ?`, next.uid, club.id);
  }

  // points marqués en partie publique (classé, non classé) et au Hit du jour : ajoutés au club de chaque joueur
  clubScore(rows, cat, pub) {
    this.trackPts(rows, cat, pub);
    const sc = season();
    for (const r of rows) {
      const c = this.clubOf(r.uid);
      if (!c || !(r.pts > 0)) continue;
      this.sql.exec(`INSERT INTO cpts(club, sc, uid, pts) VALUES(?,?,?,?) ON CONFLICT(club, sc, uid) DO UPDATE SET pts = pts + excluded.pts`, c.id, sc, r.uid, r.pts);
      this.sql.exec(`INSERT INTO cseason(club, sc, pts) VALUES(?,?,?) ON CONFLICT(club, sc) DO UPDATE SET pts = pts + excluded.pts`, c.id, sc, r.pts);
    }
  }
}
Object.assign(Hub.prototype, extraMethods, accountMethods);
