// Version 1.18 : récompenses de saison (clubs et joueurs), coffre et guerre de clubs, rivalités, événements du week-end,
// tournoi du samedi soir, mode Survie. Outils sans état en haut (testés par test/extras.test.mjs), méthodes du Hub en bas.
import { parisDay, dayAdd } from './social.js';
import { CATS } from './catalog.js';

const DAY = 86400000;
const dow = day => (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7; // lundi = 0 … dimanche = 6
export const weekKey = day => dayAdd(day, -dow(day));                  // le lundi de la semaine
export const isWeekend = day => dow(day) >= 5;
export const parisMinutes = (d = new Date()) => {
  const [h, m] = d.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false }).split(':').map(Number);
  return (h % 24) * 60 + m;
};

// ---------- récompenses de fin de saison ----------
export const CLUB_PLACE_COINS = [1000, 600, 300];
export const TOP_PLAYERS = 100;
export const topCoins = place => (place <= 10 ? 1000 : place <= 50 ? 500 : 250);
export const prevSeason = sc => { const [y, m] = sc.split('-').map(Number); return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7); };
export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
// identifiants de titres gagnés (a-z, 0-9 et tirets, 24 caractères au plus : règle du salon), lus par l'appli
export const ymd = d => d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);
export const ym = sc => sc.slice(2, 4) + sc.slice(5, 7);
export const monthName = sc => `${MONTHS[+sc.slice(5, 7) - 1]} ${sc.slice(0, 4)}`;

// ---------- coffre de club (points des membres sur la semaine) ----------
export const CHEST = [[1500, 100], [4000, 250], [8000, 500]]; // [points du club, pièces par membre qui a joué]

// ---------- guerre de clubs (samedi et dimanche) ----------
export const WAR_COINS = { win: 300, tie: 150, loss: 75 };
export const BYE_TARGET = 1500; // club seul : il doit atteindre ce score pour gagner

// ---------- événements du week-end ----------
export const EVENTS = [
  { id: 'e80', name: 'Week-end années 80', emoji: '📼', cat: '80' },
  { id: 'erapfr', name: 'Rap FR Night', emoji: '🎤', cat: 'rapfr' },
  { id: 'erock', name: 'Rock Party', emoji: '🎸', cat: 'rock' },
  { id: 'ekpop', name: 'K-Pop Fever', emoji: '💖', cat: 'kpop' },
  { id: 'ecine', name: 'Soirée Cinéma', emoji: '🎬', cat: 'cine' },
  { id: 'eelectro', name: 'Electro Weekend', emoji: '🎧', cat: 'electro' },
  { id: 'evariete', name: 'Chanson française', emoji: '🥖', cat: 'variete' },
  { id: 'e2000', name: 'Années 2000', emoji: '💿', cat: '2000' },
  { id: 'e90', name: 'Week-end années 90', emoji: '📺', cat: '90' },
  { id: 'erapus', name: 'Rap US Night', emoji: '🔥', cat: 'rapus' },
];
export const EVENT_MIN = 300;            // points pour une récompense de participation
export const EVENT_COINS = [600, 400, 250], EVENT_PART = 100;
export const TOUR_FROM = 20 * 60, TOUR_TO = 22 * 60; // tournoi du samedi soir, heure de Paris
export const TOUR_COINS = [500, 300, 150];
// événements spéciaux (jour de la semaine = lundi) : Halloween le week-end du 31 octobre 2026 ; theme = décor de l'appli,
// gifts = cadeaux : frame au podium, av à partir de EVENT_MIN points (cadre Citrouille, avatar Chauve-souris)
export const SPECIAL = {
  '2026-10-26': { id: 'ehallo', name: 'Nuit des Frissons', emoji: '🎃', cat: 'frissons', theme: 'halloween', gifts: { frame: 'citrouille', av: 'H01' } },
};
export const eventOfWeek = wk => SPECIAL[wk] || EVENTS[Math.floor(Date.parse(wk + 'T12:00:00Z') / (7 * DAY)) % EVENTS.length];
// événement à afficher un jour donné : lun-mer = celui du week-end passé (terminé), jeu-ven = à venir, sam-dim = en cours
export function eventState(day) {
  const d = dow(day), thisWk = weekKey(day);
  const wk = d <= 2 ? dayAdd(thisWk, -7) : thisWk;
  return { wk, state: d <= 2 ? 'done' : d <= 4 ? 'soon' : 'live', ev: eventOfWeek(wk), sat: dayAdd(wk, 5), sun: dayAdd(wk, 6) };
}
export const tourState = (day, mins) => {
  const es = eventState(day);
  if (es.state === 'done') return 'done';
  if (es.state === 'soon') return 'soon';
  if (day === es.sat) return mins < TOUR_FROM ? 'soon' : mins < TOUR_TO ? 'live' : 'done';
  return 'done';
};
export const inTour = (day, mins) => isWeekend(day) && dow(day) === 5 && mins >= TOUR_FROM && mins < TOUR_TO;

// ---------- méthodes ajoutées au Hub ----------
const nameOf = c => CATS.find(x => x.id === c)?.name || c;

export const extraMethods = {
  initExtras() {
    const x = s => this.sql.exec(s);
    // honneurs à récupérer : fin de saison, événements, tournois (le client donne les pièces et garde le titre)
    x(`CREATE TABLE IF NOT EXISTS honors(uid TEXT, key TEXT, kind TEXT, v INTEGER, coins INTEGER, label TEXT, title TEXT, claimed INTEGER DEFAULT 0, PRIMARY KEY(uid, key, kind))`);
    x(`CREATE TABLE IF NOT EXISTS chonors(club TEXT, sc TEXT, place INTEGER, PRIMARY KEY(club, sc))`);
    x(`CREATE TABLE IF NOT EXISTS cwk(club TEXT, wk TEXT, uid TEXT, pts INTEGER, PRIMARY KEY(club, wk, uid))`);
    x(`CREATE TABLE IF NOT EXISTS cclaim(club TEXT, wk TEXT, uid TEXT, tier INTEGER, PRIMARY KEY(club, wk, uid, tier))`);
    x(`CREATE TABLE IF NOT EXISTS cwar(wk TEXT, club TEXT, opp TEXT, PRIMARY KEY(wk, club))`);
    x(`CREATE TABLE IF NOT EXISTS cwpm(wk TEXT, club TEXT, uid TEXT, pts INTEGER, PRIMARY KEY(wk, club, uid))`);
    x(`CREATE TABLE IF NOT EXISTS cwclaim(wk TEXT, uid TEXT, PRIMARY KEY(wk, uid))`);
    x(`CREATE TABLE IF NOT EXISTS evpts(ev TEXT, uid TEXT, pts INTEGER, PRIMARY KEY(ev, uid))`);
    x(`CREATE TABLE IF NOT EXISTS tpts(ev TEXT, uid TEXT, pts INTEGER, PRIMARY KEY(ev, uid))`);
    x(`CREATE TABLE IF NOT EXISTS survie(uid TEXT, cat TEXT, best INTEGER, ts INTEGER, PRIMARY KEY(uid, cat))`);
    x(`CREATE INDEX IF NOT EXISTS survie_best ON survie(cat, best DESC)`);
    try { x(`ALTER TABLE honors ADD COLUMN gift TEXT`); } catch { /* colonne déjà là */ }
  },

  // horloge : en local (MOCK_MUSIC) elle peut être réglée par /__mock/horloge ; gardée dans la base car le Hub peut être relancé
  clock() {
    if (!this.env.MOCK_MUSIC) return new Date();
    const t = +(this.sql.exec(`SELECT v FROM meta WHERE k = 'mockclock'`).toArray()[0]?.v || 0);
    return t ? new Date(t) : new Date();
  },
  pDay() { return parisDay(this.clock()); },
  devClock(iso) { this.sql.exec(`INSERT OR REPLACE INTO meta(k, v) VALUES('mockclock', ?)`, String(iso ? Date.parse(iso) : 0)); return { now: this.clock().toISOString(), day: this.pDay() }; },

  // tests en local : ajoute des points comme si une partie venait de se terminer
  devPoints(uid, pts, cat, pub) { this.clubScore([{ uid, pts }], cat, pub); return { ok: 1 }; },

  // tests en local : clôture forcée d'une saison (sc) ou d'un week-end (wk)
  devClose(sc, wk) { if (sc) this.closeSeason(sc, true); if (wk) this.closeEvent(wk, true); return { ok: 1 }; },

  // ----- fin de saison : récompenses des 3 meilleurs clubs et des 100 meilleurs joueurs -----
  closeSeason(sc, force) {
    const flag = `hon:${sc}`;
    if (!force && this.sql.exec(`SELECT 1 FROM meta WHERE k = ?`, flag).toArray().length) return;
    this.sql.exec(`INSERT OR REPLACE INTO meta(k, v) VALUES(?, '1')`, flag);
    const label = monthName(sc);
    const put = (uid, key, kind, v, coins, lab, title) =>
      this.sql.exec(`INSERT OR IGNORE INTO honors(uid, key, kind, v, coins, label, title) VALUES(?,?,?,?,?,?,?)`, uid, key, kind, v, coins, lab, title);
    const clubs = this.sql.exec(`SELECT club FROM cseason WHERE sc = ? AND pts > 0 ORDER BY pts DESC LIMIT 3`, sc).toArray();
    clubs.forEach((c, i) => {
      this.sql.exec(`INSERT OR REPLACE INTO chonors(club, sc, place) VALUES(?,?,?)`, c.club, sc, i + 1);
      for (const m of this.sql.exec(`SELECT uid FROM cpts WHERE club = ? AND sc = ? AND pts > 0`, c.club, sc).toArray())
        put(m.uid, sc, 'club', i + 1, CLUB_PLACE_COINS[i], `Ton club est ${i === 0 ? '1er' : i + 1 + 'e'} de la saison de ${label}`, i === 0 ? `h-club-${ym(sc)}` : '');
    });
    this.sql.exec(`SELECT uid FROM ranks WHERE sc = ? AND games > 0 ORDER BY rp DESC LIMIT ${TOP_PLAYERS}`, sc).toArray().forEach((r, i) => {
      const place = i + 1;
      put(r.uid, sc, 'top', place, topCoins(place), `${place <= 10 ? 'Top 10' : place <= 50 ? 'Top 50' : 'Top 100'} de la saison de ${label} (n° ${place})`,
        `h-top${place <= 10 ? 10 : place <= 50 ? 50 : 100}-${ym(sc)}`);
    });
  },

  // ----- fin d'un événement et de son tournoi (week-end précédent) -----
  closeEvent(wk, force) {
    const flag = `evc:${wk}`;
    if (!force && this.sql.exec(`SELECT 1 FROM meta WHERE k = ?`, flag).toArray().length) return;
    this.sql.exec(`INSERT OR REPLACE INTO meta(k, v) VALUES(?, '1')`, flag);
    const ev = eventOfWeek(wk);
    const put = (uid, kind, v, coins, lab, title, gift = '') =>
      this.sql.exec(`INSERT OR IGNORE INTO honors(uid, key, kind, v, coins, label, title, gift) VALUES(?,?,?,?,?,?,?,?)`, uid, wk, kind, v, coins, lab, title, gift);
    const g = ev.gifts || {};
    this.sql.exec(`SELECT uid, pts FROM evpts WHERE ev = ? ORDER BY pts DESC`, wk).toArray().forEach((r, i) => {
      const gift = [i < 3 && g.frame ? 'frame:' + g.frame : '', r.pts >= EVENT_MIN && g.av ? 'av:' + g.av : ''].filter(Boolean).join(',');
      if (i < 3) put(r.uid, 'event', i + 1, EVENT_COINS[i], `${ev.emoji} ${ev.name} : ${i === 0 ? '1er' : i + 1 + 'e'} avec ${r.pts} points`, i === 0 ? `h-ev-${ev.id}-${ymd(wk)}` : '', gift);
      else if (r.pts >= EVENT_MIN) put(r.uid, 'event', 0, EVENT_PART, `${ev.emoji} ${ev.name} : merci d’avoir joué (${r.pts} points)`, '', gift);
    });
    this.sql.exec(`SELECT uid, pts FROM tpts WHERE ev = ? ORDER BY pts DESC LIMIT 3`, wk).toArray().forEach((r, i) =>
      put(r.uid, 'tour', i + 1, TOUR_COINS[i], `🏟️ Tournoi du samedi soir : ${i === 0 ? '1er' : i + 1 + 'e'} avec ${r.pts} points`, i === 0 ? `h-tour-${ymd(wk)}` : ''));
  },

  // appelé à chaque /api/me : clôtures en retard puis honneurs non encore récupérés (une seule fois chacun)
  honorsFor(uid) {
    const now = this.clock();
    this.closeSeason(prevSeason(now.toISOString().slice(0, 7)));
    this.closeEvent(dayAdd(weekKey(this.pDay()), -7));
    const rows = this.sql.exec(`SELECT key, kind, v, coins, label, title, gift FROM honors WHERE uid = ? AND claimed = 0`, uid).toArray();
    if (rows.length) this.sql.exec(`UPDATE honors SET claimed = 1 WHERE uid = ? AND claimed = 0`, uid);
    return rows;
  },

  // ----- points : coffre, guerre, événement, tournoi (appelé avec clubScore) -----
  // rows = [{uid, pts}] ; cat = catégorie de la partie publique (absente au Hit du jour) ; pub = partie classée ou non classée
  trackPts(rows, cat, pub) {
    const now = this.clock(), day = this.pDay(), wk = weekKey(day), es = eventState(day), mins = parisMinutes(now);
    const live = es.state === 'live';
    if (isWeekend(day)) this.ensureWar(wk);
    for (const r of rows) {
      if (!(r.pts > 0)) continue;
      const c = this.clubOf(r.uid);
      if (c) {
        this.sql.exec(`INSERT INTO cwk(club, wk, uid, pts) VALUES(?,?,?,?) ON CONFLICT(club, wk, uid) DO UPDATE SET pts = pts + excluded.pts`, c.id, wk, r.uid, r.pts);
        if (isWeekend(day) && this.sql.exec(`SELECT 1 FROM cwar WHERE wk = ? AND club = ?`, wk, c.id).toArray().length)
          this.sql.exec(`INSERT INTO cwpm(wk, club, uid, pts) VALUES(?,?,?,?) ON CONFLICT(wk, club, uid) DO UPDATE SET pts = pts + excluded.pts`, wk, c.id, r.uid, r.pts);
      }
      if (live && pub && cat === es.ev.cat) this.sql.exec(`INSERT INTO evpts(ev, uid, pts) VALUES(?,?,?) ON CONFLICT(ev, uid) DO UPDATE SET pts = pts + excluded.pts`, wk, r.uid, r.pts);
      if (pub && inTour(day, mins)) this.sql.exec(`INSERT INTO tpts(ev, uid, pts) VALUES(?,?,?) ON CONFLICT(ev, uid) DO UPDATE SET pts = pts + excluded.pts`, wk, r.uid, r.pts);
    }
  },

  // ----- guerre de clubs -----
  // tirage des guerres pendant le week-end : les clubs de 2 membres ou plus sans adversaire sont réunis deux par deux (du plus haut classé
  // au plus bas) ; un club arrivé en cours de week-end est tiré avec les suivants ; le dernier seul le dimanche joue contre l'objectif
  ensureWar(wk) {
    const day = this.pDay(), sc = day.slice(0, 7);
    const list = this.sql.exec(`SELECT c.id FROM clubs c WHERE (SELECT COUNT(*) FROM cmembers m WHERE m.club = c.id) >= 2
      AND NOT EXISTS (SELECT 1 FROM cwar w WHERE w.wk = ? AND w.club = c.id)
      ORDER BY COALESCE((SELECT pts FROM cseason s WHERE s.club = c.id AND s.sc = ?), 0) DESC, c.ts`, wk, sc).toArray().map(x => x.id);
    for (let i = 0; i < list.length; i += 2) {
      const a = list[i], b = list[i + 1] || '';
      if (!b && dow(day) < 6) break; // seul : on attend un adversaire jusqu'à dimanche
      this.sql.exec(`INSERT INTO cwar(wk, club, opp) VALUES(?,?,?)`, wk, a, b);
      if (b) this.sql.exec(`INSERT INTO cwar(wk, club, opp) VALUES(?,?,?)`, wk, b, a);
    }
  },
  warPts(wk, club) { return this.sql.exec(`SELECT COALESCE(SUM(pts), 0) AS n FROM cwpm WHERE wk = ? AND club = ?`, wk, club).one().n; },
  warResult(wk, club, opp) {
    const mine = this.warPts(wk, club), theirs = opp ? this.warPts(wk, opp) : BYE_TARGET;
    return mine > theirs || (!opp && mine >= BYE_TARGET) ? 'win' : mine === theirs && opp ? 'tie' : 'loss';
  },
  warInfo(club, uid) {
    const day = this.pDay(), d = dow(day), wk = d >= 5 ? weekKey(day) : dayAdd(weekKey(day), -7);
    const state = d >= 5 ? 'live' : d <= 2 ? 'done' : 'soon';
    if (state === 'soon') return { state, wk };
    if (state === 'live') this.ensureWar(wk);
    const row = this.sql.exec(`SELECT opp FROM cwar WHERE wk = ? AND club = ?`, wk, club).toArray()[0];
    if (!row) return { state: 'none', wk };
    const opp = row.opp ? this.sql.exec(`SELECT id, name, e, c FROM clubs WHERE id = ?`, row.opp).toArray()[0] || null : null;
    const out = { state, wk, pts: this.warPts(wk, club), target: BYE_TARGET, bye: !row.opp, coins: WAR_COINS,
      opp: opp ? { ...opp, pts: this.warPts(wk, opp.id) } : null, mine: this.sql.exec(`SELECT COALESCE(pts, 0) AS n FROM cwpm WHERE wk = ? AND club = ? AND uid = ?`, wk, club, uid).toArray()[0]?.n || 0 };
    if (state === 'done') {
      out.result = this.warResult(wk, club, row.opp);
      out.claimed = !!this.sql.exec(`SELECT 1 FROM cwclaim WHERE wk = ? AND uid = ?`, wk, uid).toArray().length;
    }
    return out;
  },
  claimWar(uid, club) {
    const w = this.warInfo(club, uid);
    if (w.state !== 'done' || !w.result) return { ok: 0, why: 'war' };
    if (w.claimed) return { ok: 0, why: 'claimed' };
    if (!(w.mine > 0)) return { ok: 0, why: 'played' };
    this.sql.exec(`INSERT INTO cwclaim(wk, uid) VALUES(?,?)`, w.wk, uid);
    return { ok: 1, coins: WAR_COINS[w.result], result: w.result };
  },

  // ----- coffre de la semaine -----
  chestInfo(club, uid) {
    const wk = weekKey(this.pDay());
    const pts = this.sql.exec(`SELECT COALESCE(SUM(pts), 0) AS n FROM cwk WHERE club = ? AND wk = ?`, club, wk).one().n;
    const mine = this.sql.exec(`SELECT COALESCE(pts, 0) AS n FROM cwk WHERE club = ? AND wk = ? AND uid = ?`, club, wk, uid).toArray()[0]?.n || 0;
    const got = this.sql.exec(`SELECT tier FROM cclaim WHERE club = ? AND wk = ? AND uid = ?`, club, wk, uid).toArray().map(x => x.tier);
    return { wk, pts, mine, tiers: CHEST.map(([need, coins], i) => ({ need, coins, done: pts >= need, got: got.includes(i) })),
      end: dayAdd(wk, 6) };
  },
  claimChest(uid, club) {
    const c = this.chestInfo(club, uid);
    if (!(c.mine > 0)) return { ok: 0, why: 'played' };
    let coins = 0;
    c.tiers.forEach((t, i) => {
      if (!t.done || t.got) return;
      this.sql.exec(`INSERT OR IGNORE INTO cclaim(club, wk, uid, tier) VALUES(?,?,?,?)`, club, c.wk, uid, i);
      coins += t.coins;
    });
    return coins ? { ok: 1, coins } : { ok: 0, why: 'none' };
  },

  // ----- rivalité : le club juste devant et celui juste derrière -----
  rivals(club) {
    const sc = this.pDay().slice(0, 7);
    const mine = this.sql.exec(`SELECT pts FROM cseason WHERE club = ? AND sc = ?`, club, sc).toArray()[0]?.pts || 0;
    if (!mine) return { above: null, below: null };
    const side = (op, ord) => this.sql.exec(`SELECT c.id, c.name, c.e, c.c, s.pts FROM cseason s JOIN clubs c ON c.id = s.club WHERE s.sc = ? AND s.club != ? AND s.pts ${op} ? ORDER BY s.pts ${ord} LIMIT 1`, sc, club, mine).toArray()[0];
    const a = side('>', 'ASC'), b = side('<=', 'DESC');
    return { above: a ? { id: a.id, name: a.name, e: a.e, c: a.c, gap: a.pts - mine + 1 } : null, below: b ? { id: b.id, name: b.name, e: b.e, c: b.c, gap: mine - b.pts } : null };
  },
  clubExtra(id, uid, member) {
    const out = { trophies: this.sql.exec(`SELECT sc, place FROM chonors WHERE club = ? ORDER BY sc DESC LIMIT 12`, id).toArray() };
    if (member) Object.assign(out, { chest: this.chestInfo(id, uid), war: this.warInfo(id, uid), rivals: this.rivals(id) });
    return out;
  },

  // ----- événement du week-end et tournoi -----
  eventInfo(uid) {
    const now = this.clock(), day = this.pDay(), mins = parisMinutes(now), es = eventState(day), ev = es.ev;
    const board = (table) => this.sql.exec(`SELECT t.uid, t.pts, p.pk, p.name, p.av, p.fr FROM ${table} t LEFT JOIN players p ON p.uid = t.uid WHERE t.ev = ? ORDER BY t.pts DESC LIMIT 10`, es.wk).toArray()
      .map((r, i) => ({ place: i + 1, pk: r.pk || '', name: r.name || 'Joueur', av: r.av || 'A02', fr: r.fr || 'def', pts: r.pts, me: r.uid === uid }));
    const mine = table => {
      const r = this.sql.exec(`SELECT pts FROM ${table} WHERE ev = ? AND uid = ?`, es.wk, uid).toArray()[0];
      return r ? { pts: r.pts, place: this.sql.exec(`SELECT COUNT(*) AS n FROM ${table} WHERE ev = ? AND pts > ?`, es.wk, r.pts).one().n + 1 } : { pts: 0, place: null };
    };
    return { wk: es.wk, state: es.state, id: ev.id, name: ev.name, emoji: ev.emoji, cat: ev.cat, theme: ev.theme || '', gifts: ev.gifts || null, catName: nameOf(ev.cat), from: es.sat, to: es.sun,
      top: board('evpts'), me: mine('evpts'), min: EVENT_MIN, coins: EVENT_COINS, part: EVENT_PART,
      tour: { state: tourState(day, mins), day: es.sat, from: '20 h', to: '22 h', top: board('tpts').slice(0, 5), me: mine('tpts'), coins: TOUR_COINS } };
  },
  eventLite() { const es = eventState(this.pDay()); return { state: es.state, cat: es.ev.cat, name: es.ev.name, emoji: es.ev.emoji, wk: es.wk, theme: es.ev.theme || '' }; },

  // ----- mode Survie : nombre de manches tenues sans rater -----
  survieSave(uid, cat, n) {
    const old = this.sql.exec(`SELECT best FROM survie WHERE uid = ? AND cat = ?`, uid, cat).toArray()[0]?.best || 0;
    const best = Math.max(old, n);
    if (n > old) this.sql.exec(`INSERT OR REPLACE INTO survie(uid, cat, best, ts) VALUES(?,?,?,?)`, uid, cat, n, Date.now());
    return { best, record: n > old && n > 0, rank: this.sql.exec(`SELECT COUNT(*) AS n FROM survie WHERE cat = ? AND best > ?`, cat, best).one().n + 1 };
  },
  survieBoard(cat, uid) {
    const top = this.sql.exec(`SELECT s.uid, s.best, p.pk, p.name, p.av, p.fr FROM survie s LEFT JOIN players p ON p.uid = s.uid WHERE s.cat = ? AND s.best > 0 ORDER BY s.best DESC, s.ts LIMIT 20`, cat).toArray()
      .map((r, i) => ({ place: i + 1, name: r.name || 'Joueur', av: r.av || 'A02', fr: r.fr || 'def', best: r.best, me: r.uid === uid }));
    const me = uid ? this.sql.exec(`SELECT best FROM survie WHERE uid = ? AND cat = ?`, uid, cat).toArray()[0]?.best || 0 : 0;
    return { cat, top, me };
  },
};
