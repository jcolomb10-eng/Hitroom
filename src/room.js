// Room : un salon de jeu (public par catégorie, ou privé avec un code de 4 caractères).
// Les salons publics sont classés (points de rang) et séparés par niveau ; les salons privés sont des parties amicales.
// C'est le « maître du jeu » : il choisit les extraits, donne le top départ à tout le monde en même temps,
// vérifie les réponses (jamais envoyées aux joueurs avant la fin de la manche), compte les points et relaie le chat.
import { DurableObject } from 'cloudflare:workers';
import { judge, norm } from './match.js';
import { CAT_IDS } from './catalog.js';
import { cleanText, cleanName } from './filter.js';
import { bracketOf, rpDelta, BOT_SKILL, TIERS_OF_BRACKET } from './ranks.js';

const MAX_HUMANS = 12;
const COUNTDOWN = 4000;     // 3, 2, 1 avant la première manche
const LEAD = 800;           // le temps que le top départ arrive chez tout le monde
const REVEAL = 6000;        // affichage de la réponse
const PUBLIC_NEXT = 15000;  // salon public : pause entre deux parties
const OFFLINE_GRACE = 15000;
const PTS = { title: 15, artist: 10 };
const ROUNDS = [5, 10, 15, 20];
const DURS = [15, 20, 30];
const FRAMES = new Set(['def', 'or', 'diamant', 'flamme', 'neon', 'galaxie']);
// cadres de rang (r0 = Bronze … r8 = Grand Maître) : seulement si le rang a été atteint ; cadres de saison : s2026-10
const frameOk = (fr, best) => FRAMES.has(fr) || /^s\d{4}-\d{2}$/.test(fr) || (/^r[0-8]$/.test(fr) && +fr[1] <= best);

const BOT_NAMES = ['DJ_Lila', 'MarieFan90', 'TonyRock', 'ZazieZouk', 'MelodyLover', 'VinylBoy', 'KikiKaraoke',
  'Sophie78', 'BeatMax', 'LunaStar', 'ZikMaster', 'ClaraMusic', 'Flow', 'Niko', 'SamPlay', 'Melody'];
const BOT_AV = ['🎧', '🎸', '🎹', '🥁', '🎷', '🦊', '🐱', '🐼', '🦄', '🐯'];
const GREET = ['Salut tout le monde !', 'Hello 🙂', 'Bonne partie à tous', 'On va voir qui est le meilleur 😎'];
const GOOD = ['Trop facile 😎', 'Direct !', 'Classique !', '✌️', 'Je l’avais tout de suite', 'Easy'];
const AFTER = ['Mythique ❤️', 'Ohhh celle-là', 'Mon enfance 🥺', 'Jamais entendu…', 'Quel son !', 'Je l’avais sur le bout de la langue'];

const rid = (n = 8) => crypto.randomUUID().replace(/-/g, '').slice(0, n);
const pick = a => a[Math.floor(Math.random() * a.length)];

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.name = null;
    this.timers = new Set();
    this.gen = 0;
    this.played = [];
    this.reset();
  }

  reset() {
    this.clearTimers();
    this.players = new Map();
    this.host = null;
    this.cat = this.pub ? this.cat : 'mix';
    this.opts = { rounds: 10, dur: 30, bots: 0, botlvl: 0 };
    this.phase = 'lobby';
    this.ends = 0;
    this.round = 0;
    this.rounds = 0;
    this.songs = [];
    this.cur = null;
    this.reveal = null;
    this.results = null;
    this.chat = [];
    this.gameId = null;
    this.starting = false;
    this.msg = '';
  }

  // ---------- outils ----------
  hub() { return this.env.HUB.get(this.env.HUB.idFromName('hub')); }
  humans(onlineOnly = true) { return [...this.players.values()].filter(p => !p.bot && (!onlineOnly || p.on)); }
  bots() { return [...this.players.values()].filter(p => p.bot); }
  later(ms, fn) {
    const g = this.gen;
    const t = setTimeout(() => { this.timers.delete(t); if (g === this.gen) fn(); }, Math.max(0, ms));
    this.timers.add(t);
  }
  clearTimers() {
    this.gen++;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }
  send(ws, msg) {
    if (!ws) return;
    try { ws.send(JSON.stringify(msg)); } catch { /* socket fermée */ }
  }
  broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const p of this.players.values()) if (p.ws) { try { p.ws.send(data); } catch { /* socket fermée */ } }
  }
  report() {
    if (this.pub) this.hub().report(this.name, this.cat, this.bracket, this.humans().length).catch(() => {});
  }
  info() {
    return { humans: this.humans(false).length, cat: this.cat, phase: this.phase, opts: this.opts };
  }

  snapshot() {
    const c = this.cur;
    return {
      t: 'state', now: Date.now(), pub: this.pub, ranked: this.pub, bracket: this.bracket, code: this.code, cat: this.cat, opts: this.opts, host: this.host,
      phase: this.phase, ends: this.ends, round: this.round, rounds: this.rounds, gameId: this.gameId, msg: this.msg,
      players: [...this.players.values()].map(p => ({
        id: p.id, name: p.name, av: p.av, fr: p.fr, lvl: p.lvl, tier: p.tier || 0, title: p.title || '', show: p.show || [], bot: !!p.bot, on: !!p.on,
        score: p.score, streak: p.streak, ft: p.rt ? (p.rt.title ? 1 : 0) | (p.rt.artist ? 2 : 0) : 0,
      })),
      cur: this.phase === 'play' || this.phase === 'reveal' ? { url: c.s.url, art: c.s.art, start: c.start, end: c.end } : null,
      reveal: this.phase === 'reveal' ? this.reveal : null,
      results: this.phase === 'end' ? this.results : null,
    };
  }
  broadcastState() { this.broadcast(this.snapshot()); }

  // ---------- connexion ----------
  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket attendu', { status: 426 });
    const q = new URL(req.url).searchParams;
    if (!this.name) {
      this.name = q.get('room') || 'priv:????';
      this.pub = this.name.startsWith('pub:');
      this.code = this.pub ? null : this.name.slice(5);
      this.bracket = 0;
      if (this.pub) {
        const [, cat, b] = this.name.split(':');
        this.cat = cat;
        this.bracket = Math.min(3, Math.max(0, parseInt(b, 10) || 0));
        if (this.env.MOCK_MUSIC) this.opts = { ...this.opts, rounds: 5, dur: 15 }; // tests en local : parties publiques courtes
      }
    }
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    this.connect(server, q);
    return new Response(null, { status: 101, webSocket: client });
  }

  reject(ws, msg) {
    this.send(ws, { t: 'error', msg });
    try { ws.close(4001, 'refus'); } catch { /* déjà fermée */ }
  }

  connect(ws, q) {
    const uid = (q.get('uid') || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
    if (uid.length < 8) return this.reject(ws, 'Identifiant invalide, recharge la page.');
    let p = [...this.players.values()].find(x => x.uid === uid);
    if (!this.pub && !this.humans(false).length) {
      if (q.get('create') !== '1') return this.reject(ws, "Ce salon n'existe pas ou est terminé. Vérifie le code !");
      this.reset();
      this.opts.botlvl = bracketOf(parseInt(q.get('tier'), 10) || 0);
      this.setOpts(q);
    }
    if (!p && this.humans(false).length >= MAX_HUMANS) return this.reject(ws, 'Ce salon est complet (12 joueurs maximum).');
    const isNew = !p;
    if (p) {
      if (p.ws && p.ws !== ws) { try { p.ws.close(4000, 'remplacé'); } catch { /* déjà fermée */ } }
    } else {
      p = { id: rid(6), uid, bot: false, score: 0, streak: 0, best: 0, nT: 0, nA: 0, speed: 0, fast: 0, rounds: 0, rt: null, lastG: 0, lastC: 0 };
      if (this.phase === 'play') { p.rt = { title: 0, artist: 0 }; p.rounds = 1; }
      this.players.set(p.id, p);
    }
    p.ws = ws;
    p.on = true;
    p.off = 0;
    p.tier = Math.min(8, Math.max(0, parseInt(q.get('tier'), 10) || 0)); // fourni par le serveur, pas par l'appli
    p.rbest = Math.min(8, Math.max(0, parseInt(q.get('best'), 10) || 0)); // meilleur rang toutes saisons (≠ p.best = meilleure série)
    this.profile(p, q);
    if (!this.pub && !this.players.get(this.host)?.on) this.host = p.id;
    ws.addEventListener('message', e => this.onMessage(p, ws, e.data));
    ws.addEventListener('close', () => this.onClose(p, ws));
    ws.addEventListener('error', () => this.onClose(p, ws));
    this.send(ws, { t: 'welcome', you: p.id, now: Date.now(), chat: this.chat.slice(-30) });
    if (isNew) this.sys(`${p.name} a rejoint le salon`);
    this.broadcastState();
    if (this.pub) {
      this.report();
      if (this.phase === 'lobby' && !this.starting) { this.ends = Date.now() + 2000; this.later(2000, () => this.startGame()); }
    }
  }

  profile(p, src) {
    const get = k => (src.get ? src.get(k) : src[k]);
    if (get('name') != null) p.name = cleanName(get('name'));
    if (!p.name) p.name = 'Joueur' + Math.floor(100 + Math.random() * 900);
    const av = Array.from(String(get('av') || '')).slice(0, 4).join('');
    if (av) p.av = av; else if (!p.av) p.av = '🎧';
    if (frameOk(get('fr'), p.rbest || 0)) p.fr = get('fr'); else if (!p.fr) p.fr = 'def';
    const title = get('title');
    // titres de rang : seulement si le rang a été atteint
    const rankTitle = { 'r-maitre': 7, 'r-gm': 8 }[title];
    if (title != null) p.title = /^[a-z0-9-]{1,24}$/.test(title) && !(rankTitle > (p.rbest || 0)) ? title : '';
    const show = get('show');
    if (show != null) p.show = String(show).split(',').filter(x => /^[a-z]{2,10}:[0-4]$/.test(x)).slice(0, 3);
    const lvl = parseInt(get('lvl'), 10);
    if (lvl > 0 && lvl < 1000) p.lvl = lvl; else if (!p.lvl) p.lvl = 1;
  }

  setOpts(src) {
    const get = k => (src.get ? src.get(k) : src[k]);
    if (CAT_IDS.has(get('cat'))) this.cat = get('cat');
    const r = parseInt(get('rounds'), 10), d = parseInt(get('dur'), 10), b = parseInt(get('bots'), 10), l = parseInt(get('botlvl'), 10);
    if (ROUNDS.includes(r)) this.opts.rounds = r;
    if (DURS.includes(d)) this.opts.dur = d;
    if (b >= 0 && b <= 4) this.opts.bots = b;
    if (l >= 0 && l <= 3) this.opts.botlvl = l;
  }

  onMessage(p, ws, data) {
    if (p.ws !== ws || typeof data !== 'string' || data.length > 1000) return;
    let m;
    try { m = JSON.parse(data); } catch { return; }
    const isHost = p.id === this.host && !this.pub;
    const idle = this.phase === 'lobby' || this.phase === 'end';
    switch (m.t) {
      case 'ping': return this.send(ws, { t: 'pong', c: m.c, s: Date.now() });
      case 'guess': return this.guess(p, String(m.text || '').slice(0, 80), !!m.enter);
      case 'chat': return this.onChat(p, m.text);
      case 'start': if (isHost && idle) this.startGame(); return;
      case 'opts': if (isHost && idle) { this.setOpts(m); this.broadcastState(); } return;
      case 'profile': this.profile(p, m); this.broadcastState(); return;
      case 'leave': return this.leave(p);
    }
  }

  onClose(p, ws) {
    if (p.ws !== ws) return;
    p.ws = null;
    p.on = false;
    p.off = Date.now();
    this.broadcastState();
    this.report();
    setTimeout(() => this.sweep(), OFFLINE_GRACE + 500);
  }

  leave(p) {
    const ws = p.ws;
    this.players.delete(p.id);
    p.ws = null;
    this.sys(`${p.name} a quitté le salon`);
    try { ws?.close(1000, 'au revoir'); } catch { /* déjà fermée */ }
    this.afterDeparture();
  }

  // retire les joueurs partis depuis un moment (pendant une partie, on garde leurs points jusqu'à la fin)
  sweep() {
    if (!this.humans().length && this.phase !== 'lobby') this.stop(); // plus personne en ligne depuis 15 s
    const now = Date.now();
    const inGame = !['lobby', 'end'].includes(this.phase);
    for (const p of this.humans(false)) {
      if (!p.on && now - p.off >= OFFLINE_GRACE && !inGame) {
        this.players.delete(p.id);
        this.sys(`${p.name} a quitté le salon`);
      }
    }
    this.afterDeparture();
  }

  afterDeparture() {
    if (!this.humans(false).length) {
      if (!this.pub) this.reset(); else this.stop();
      this.report();
      return;
    }
    if (!this.pub && !this.players.get(this.host)?.on) {
      const next = this.humans()[0];
      if (next && next.id !== this.host) {
        this.host = next.id;
        this.sys(`${next.name} devient l'hôte du salon`);
      }
    }
    if (!this.humans().length) this.stop();
    this.broadcastState();
    this.report();
  }

  // plus personne en ligne : on arrête tout
  stop() {
    this.clearTimers();
    this.starting = false;
    for (const b of this.bots()) this.players.delete(b.id);
    this.phase = 'lobby';
    this.cur = this.reveal = this.results = null;
    this.ends = 0;
    this.broadcastState();
  }

  // ---------- partie ----------
  // bots au niveau du salon : niveau des joueurs en public, réglé par l'hôte en privé
  setupBots() {
    const want = this.pub ? Math.max(0, 4 - this.humans().length) : this.opts.bots;
    const lvl = this.pub ? this.bracket : this.opts.botlvl;
    const [lo, hi] = BOT_SKILL[lvl];
    const bots = this.bots();
    while (bots.length > want) this.players.delete(bots.pop().id);
    for (const b of bots) if (b.lvlGroup !== lvl) Object.assign(b, { lvlGroup: lvl, skill: lo + Math.random() * (hi - lo), tier: pick(TIERS_OF_BRACKET[lvl]) });
    const used = new Set([...this.players.values()].map(p => p.name));
    for (let i = bots.length; i < want; i++) {
      const name = pick(BOT_NAMES.filter(n => !used.has(n)));
      used.add(name);
      const b = { id: 'b' + rid(5), bot: true, on: true, name, av: pick(BOT_AV), fr: pick(['def', 'def', 'or', 'neon', 'diamant']),
        lvl: 3 + Math.floor(Math.random() * 30), lvlGroup: lvl, skill: lo + Math.random() * (hi - lo), tier: pick(TIERS_OF_BRACKET[lvl]),
        score: 0, streak: 0, rt: null };
      this.players.set(b.id, b);
      if (i === 0 && Math.random() < 0.7) this.botSay(b, pick(GREET), 2500);
    }
  }

  botSay(b, text, delay) {
    setTimeout(() => {
      if (this.players.has(b.id)) this.pushChat({ t: 'chat', id: b.id, name: b.name, av: b.av, bot: true, text, at: Date.now() });
    }, delay + Math.random() * 1200);
  }

  async startGame() {
    if (this.starting) return;
    this.starting = true;
    this.clearTimers();
    const g = this.gen;
    for (const p of this.humans(false)) if (!p.on) this.players.delete(p.id);
    this.setupBots();
    this.phase = 'loading';
    this.cur = this.reveal = this.results = null;
    this.broadcastState();
    let songs = [];
    try { songs = await this.hub().pickSongs(this.cat, this.opts.rounds, this.played); } catch (e) { console.log('pickSongs', e); }
    this.starting = false;
    if (g !== this.gen) return;
    if (!this.humans().length) return this.stop();
    if (songs.length < 3) {
      this.phase = 'lobby';
      this.msg = this.pub ? 'Les extraits musicaux ne répondent pas pour le moment. Nouvel essai dans 30 secondes…'
        : "Les extraits musicaux ne répondent pas pour le moment. Réessaie dans une minute.";
      this.sys(this.msg);
      this.ends = this.pub ? Date.now() + 30000 : 0;
      this.broadcastState();
      if (this.pub) this.later(30000, () => this.startGame());
      return;
    }
    this.msg = '';
    this.songs = songs;
    this.rounds = Math.min(this.opts.rounds, songs.length);
    this.round = 0;
    this.gameId = rid(10);
    for (const p of this.players.values()) Object.assign(p, { score: 0, streak: 0, best: 0, nT: 0, nA: 0, speed: 0, fast: 0, rounds: 0, rt: null });
    this.played = [...this.played.filter(k => !songs.some(s => s.k === k)), ...songs.map(s => s.k)].slice(-300);
    this.phase = 'countdown';
    this.ends = Date.now() + COUNTDOWN;
    this.broadcastState();
    this.broadcast({ t: 'preload', url: songs[0].url });
    this.report();
    this.later(COUNTDOWN, () => this.startRound(0));
  }

  startRound(i) {
    const s = this.songs[i];
    const now = Date.now();
    const dur = this.opts.dur * 1000;
    this.round = i + 1;
    this.cur = { s, start: now + LEAD, end: now + LEAD + dur, found: [] };
    this.phase = 'play';
    this.ends = this.cur.end;
    this.reveal = null;
    for (const p of this.players.values()) {
      p.rt = { title: 0, artist: 0 };
      if (p.on) p.rounds = (p.rounds || 0) + 1;
    }
    this.broadcastState();
    for (const b of this.bots()) this.planBot(b, dur);
    this.later(this.cur.end - now, () => this.endRound());
  }

  planBot(b, dur) {
    const chance = { artist: 0.25 + b.skill * 0.65, title: 0.15 + b.skill * 0.6 };
    for (const kind of ['artist', 'title']) {
      if (Math.random() > chance[kind]) continue;
      const frac = 0.08 + Math.random() * (1.05 - b.skill) * 0.9;
      if (frac < 0.95) this.later(LEAD + frac * dur, () => this.award(b, kind === 'title', kind === 'artist'));
    }
  }

  guess(p, text, enter) {
    if (this.phase !== 'play' || !p.rt) return;
    const now = Date.now();
    if (now < this.cur.start - 300 || now - p.lastG < 60) return;
    p.lastG = now;
    const r = judge(text, this.cur.s, enter);
    const newT = r.title && !p.rt.title, newA = r.artist && !p.rt.artist;
    if (newT || newA) return this.award(p, newT, newA);
    if (!enter) return;
    if (r.title || r.artist) return this.send(p.ws, { t: 'hint', k: 'already' });
    this.send(p.ws, { t: 'hint', k: r.near >= 0.6 ? 'near' : 'miss' });
  }

  award(p, newT, newA) {
    if (this.phase !== 'play' || !p.rt || !this.players.has(p.id)) return;
    newT = newT && !p.rt.title;
    newA = newA && !p.rt.artist;
    if (!newT && !newA) return;
    const now = Date.now();
    const c = this.cur;
    const left = Math.max(0, Math.min(1, (c.end - now) / (c.end - c.start)));
    const speed = Math.ceil(5 * left);
    const first = !p.rt.title && !p.rt.artist;
    let pts = 0, bonus = 0, ser = 0;
    if (newT) { pts += PTS.title; bonus += speed; p.rt.title = now; p.nT = (p.nT || 0) + 1; }
    if (newA) { pts += PTS.artist; bonus += speed; p.rt.artist = now; p.nA = (p.nA || 0) + 1; }
    if (first) {
      p.streak = (p.streak || 0) + 1;
      p.best = Math.max(p.best || 0, p.streak);
      ser = Math.min(5, p.streak - 1);
      const ms = Math.max(0, now - c.start);
      if (!p.fast || ms < p.fast) p.fast = ms;
    }
    p.speed = (p.speed || 0) + bonus;
    const total = pts + bonus + ser;
    p.score += total;
    const kind = newT && newA ? 'both' : newT ? 'title' : 'artist';
    c.found.push({ id: p.id, kind, pts: total });
    this.broadcast({ t: 'found', id: p.id, kind, pts: total, score: p.score, streak: p.streak, ft: (p.rt.title ? 1 : 0) | (p.rt.artist ? 2 : 0) });
    if (!p.bot) this.send(p.ws, { t: 'you', title: newT ? c.s.t[0] : null, artist: newA ? c.s.a[0] : null, pts: total, bonus, ser, streak: p.streak });
    else if (first && Math.random() < 0.12) this.botSay(p, pick(GOOD), 600);
    // tous les joueurs ont tout trouvé : manche suivante sans attendre la fin du chrono
    const hs = this.humans();
    if (hs.length && hs.every(h => h.rt && h.rt.title && h.rt.artist) && c.end - now > 1500) {
      this.clearTimers();
      c.end = now + 1500;
      this.ends = c.end;
      this.broadcast({ t: 'ends', end: c.end });
      this.later(1500, () => this.endRound());
    }
  }

  endRound() {
    if (this.phase !== 'play') return;
    this.clearTimers();
    const c = this.cur, s = c.s;
    for (const p of this.players.values()) if (p.rt && !p.rt.title && !p.rt.artist) p.streak = 0;
    this.phase = 'reveal';
    this.ends = Date.now() + REVEAL;
    this.reveal = { t: s.t[0], a: s.a[0], art: s.art, link: s.link, found: c.found };
    this.broadcastState();
    const next = this.songs[this.round];
    if (this.round < this.rounds && next) this.broadcast({ t: 'preload', url: next.url });
    const bots = this.bots();
    if (bots.length && Math.random() < 0.3) this.botSay(pick(bots), pick(AFTER), 300);
    this.later(REVEAL, () => (this.round < this.rounds ? this.startRound(this.round) : this.endGame()));
  }

  endGame() {
    this.clearTimers();
    const list = [...this.players.values()].sort((a, b) => b.score - a.score);
    this.results = list.map((p, i) => ({
      id: p.id, rank: i + 1, name: p.name, av: p.av, fr: p.fr, lvl: p.lvl, tier: p.tier || 0, title: p.title || '', show: p.show || [], bot: !!p.bot, score: p.score,
      nT: p.nT || 0, nA: p.nA || 0, best: p.best || 0, speed: p.speed || 0, fast: p.fast || 0, rounds: p.rounds || 0,
    }));
    this.phase = 'end';
    this.cur = this.reveal = null;
    this.ends = this.pub ? Date.now() + PUBLIC_NEXT : 0;
    for (const p of this.players.values()) p.rt = null;
    this.broadcastState();
    const rows = list.filter(p => !p.bot && p.score > 0)
      .map(p => ({ uid: p.uid, name: p.name, av: p.av, fr: p.fr, pts: p.score, win: list[0] === p && list.length > 1 }));
    if (rows.length) this.hub().addResults(rows).catch(() => {});
    if (this.pub) {
      this.later(PUBLIC_NEXT, () => (this.humans().length ? this.startGame() : this.stop()));
      this.ranked(list).catch(e => console.log('rangs', e));
    }
    setTimeout(() => this.sweep(), 500);
  }

  // partie classée : points de rang selon la place (bots compris), envoyés à chaque joueur
  async ranked(list) {
    const gameId = this.gameId, n = list.length;
    const rows = list.map((p, i) => ({ p, rank: i + 1 })).filter(x => !x.p.bot && x.p.rounds > 0).map(({ p, rank }) => ({
      uid: p.uid, name: p.name, av: p.av, fr: p.fr, win: rank === 1,
      delta: rpDelta(p.tier || 0, rank, n, p.rounds / this.rounds, p.nT >= this.rounds && p.nA >= this.rounds),
    }));
    if (!rows.length) return;
    const res = await this.hub().applyRanked(rows);
    if (this.gameId !== gameId || this.phase !== 'end') return;
    for (const r of res) {
      const p = [...this.players.values()].find(x => x.uid === r.uid);
      const line = this.results.find(x => x.id === p?.id);
      if (line) Object.assign(line, { drp: r.delta, tier: r.tier });
      if (p) {
        p.tier = r.tier;
        p.rbest = Math.max(p.rbest || 0, r.tier);
        this.send(p.ws, { t: 'rank', gameId, rp: r.rp, delta: r.delta, tier: r.tier, prev: r.prev, promo: r.promo, sc: r.sc });
      }
    }
    this.broadcastState();
  }

  // ---------- chat ----------
  onChat(p, raw) {
    const now = Date.now();
    if (now - p.lastC < 700) return;
    p.lastC = now;
    const text = cleanText(raw, 120);
    if (!text) return;
    if (this.phase === 'play' && p.rt) {
      const s = this.cur.s;
      const r = judge(text, s, true);
      if (r.title || r.artist) {
        this.award(p, r.title, r.artist);
        return this.send(p.ws, { t: 'hint', k: 'chat' });
      }
      const n = ' ' + norm(text) + ' ';
      if ([...s.t, ...s.a].some(x => norm(x).length >= 3 && n.includes(' ' + norm(x) + ' '))) {
        return this.send(p.ws, { t: 'hint', k: 'masked' });
      }
    }
    this.pushChat({ t: 'chat', id: p.id, name: p.name, av: p.av, text, at: now });
  }

  pushChat(msg) {
    this.chat.push(msg);
    if (this.chat.length > 40) this.chat.shift();
    this.broadcast(msg);
  }

  sys(text) { this.pushChat({ t: 'sys', text, at: Date.now() }); }
}
