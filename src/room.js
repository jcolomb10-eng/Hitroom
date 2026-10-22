// Room : un salon de jeu. Cinq sortes (préfixe du nom) :
// - pub:<cat>:<fenêtre>  classé (points de rang), 2 rangs voisins, contour = rang actuel
// - open:<cat>           non classé, tout le monde mélangé, rang caché
// - priv:<CODE>          entre amis (code de 4 caractères), partie amicale ; duel = 1 contre 1 entre amis (opts.duel)
// - solo:<id>            un joueur contre des bots (pièces réduites côté appli, pas de classement)
// - hit:<jour>:<pk>      Hit du jour : un joueur, les 5 mêmes extraits pour tout le monde, un seul essai par jour
// Hors classé, chacun montre le contour qu'il a choisi (jamais un contour de rang) et le rang n'est pas affiché.
// C'est le « maître du jeu » : il choisit les extraits, donne le top départ à tout le monde en même temps,
// vérifie les réponses (jamais envoyées aux joueurs avant la fin de la manche), compte les points et relaie le chat.
import { DurableObject } from 'cloudflare:workers';
import { judge, norm } from './match.js';
import { CAT_IDS, catOpen } from './catalog.js';
import { cleanText, cleanName } from './filter.js';
import { publicKey } from './ids.js';
import { bracketOf, rpDelta, BOT_SKILL, TIERS_OF_BRACKET, WINDOWS, windowTiers, windowSkill, inWindow } from './ranks.js';
import { HIT_N, hitNumber } from './social.js';

const MAX_HUMANS = 12;
const COUNTDOWN = 4000;     // 3, 2, 1 avant la première manche
const LEAD = 800;           // le temps que le top départ arrive chez tout le monde
const REVEAL = 6000;        // affichage de la réponse
const PUBLIC_NEXT = 15000;  // salon public : pause entre deux parties
const OFFLINE_GRACE = 15000;
const PTS = { title: 15, artist: 10 };
const ROUNDS = [5, 10, 15, 20, 30]; // 30 : salon privé Premium
const DURS = [15, 20, 30];
const SURVIE_MAX = 40; // manches tirées d'avance en mode Survie
const BETS = [0, 50, 100, 250]; // paris de pièces en duel
// cadres achetés (boutique, cadres de prestige compris) et cadre « Légendaire » (médaille au niveau Légendaire) :
// pièces et médailles sont sur l'appareil, le serveur ne peut que vérifier que le cadre existe
const FRAMES = new Set(['def', 'or', 'diamant', 'flamme', 'neon', 'galaxie', 'arc', 'aurore', 'royal', 'icone', 'legend', 'citrouille']);
const NAME_STYLES = new Set(['', 'gold', 'rainbow']);   // pseudo doré, arc-en-ciel (boutique, Prestige)
const WIN_FX = new Set(['', 'confetti', 'fireworks']);  // effet de victoire vu par tout le salon
const REACTS = new Set(['👏', '🔥', '😂', '😮', '🎉']); // réactions rapides (mêmes que REACTS dans l'appli)
const REPORT_WHY = new Set(['insultes', 'pseudo', 'spam', 'triche', 'autre']); // motifs de signalement (mêmes que dans l'appli)

// une catégorie, ou jusqu'à 3 mélangées (salon privé Premium)
const cleanCat = (c, env) => {
  const parts = [...new Set(String(c || '').split('+'))].filter(x => CAT_IDS.has(x) && catOpen(x, env)).slice(0, 3);
  return parts.includes('mix') ? 'mix' : parts.join('+') || null;
};
// cadres de rang (r0 = Bronze … r8 = Grand Maître) : seulement si le rang a été atteint ; cadres de saison : s2026-10
const frameOk = (fr, best) => FRAMES.has(fr) || /^s\d{4}-\d{2}$/.test(fr) || (/^r[0-8]$/.test(fr) && +fr[1] <= best);
const isRankFrame = fr => /^r[0-8]$/.test(fr || '');

const BOT_NAMES = ['DJ_Lila', 'MarieFan90', 'TonyRock', 'ZazieZouk', 'MelodyLover', 'VinylBoy', 'KikiKaraoke',
  'Sophie78', 'BeatMax', 'LunaStar', 'ZikMaster', 'ClaraMusic', 'Flow', 'Niko', 'SamPlay', 'Melody'];
// avatars classiques (public/av/A01.webp … A24.webp)
const BOT_AV = Array.from({ length: 24 }, (_, i) => 'A' + String(i + 1).padStart(2, '0'));
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
    this.opts = { rounds: 10, dur: 30, bots: 0, botlvl: 0, duel: 0, survie: 0, intro: 0, bet: 0 };
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
  maxHumans() { return this.opts.duel ? 2 : MAX_HUMANS; }
  report() {
    if (this.pub) this.hub().report(this.name, this.cat, this.win, this.humans().length, this.kind).catch(() => {});
  }
  info() {
    return { humans: this.humans(false).length, cat: this.cat, phase: this.phase, opts: this.opts };
  }

  // ce que les autres voient : en classé le contour du rang actuel, ailleurs le contour choisi (sauf contour de rang)
  // et ni rang ni titre de rang
  frameOf(p) { return this.ranked ? 'r' + (p.tier || 0) : isRankFrame(p.fr) ? 'def' : p.fr || 'def'; }
  tierOf(p) { return this.ranked ? p.tier || 0 : null; }
  titleOf(p) { return !this.ranked && /^r-/.test(p.title || '') ? '' : p.title || ''; }

  snapshot() {
    const c = this.cur;
    return {
      t: 'state', now: Date.now(), kind: this.kind, pub: this.pub, ranked: this.ranked, solo: this.solo, win: this.win, code: this.code, cat: this.cat, opts: this.opts, host: this.host,
      hit: this.kind === 'daily' ? { day: this.day, n: hitNumber(this.day) } : null,
      phase: this.phase, ends: this.ends, round: this.round, rounds: this.rounds, gameId: this.gameId, msg: this.msg,
      players: [...this.players.values()].map(p => ({
        id: p.id, pk: p.pk || '', name: p.name, av: p.av, fr: this.frameOf(p), lvl: p.lvl, tier: this.tierOf(p), title: this.titleOf(p), show: p.show || [], bot: !!p.bot, on: !!p.on, club: p.club || '',
        nc: p.nc || '', vfx: p.vfx || '', score: p.score, streak: p.streak, ft: p.rt ? (p.rt.title ? 1 : 0) | (p.rt.artist ? 2 : 0) : 0,
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
      const [prefix, a, w] = this.name.split(':');
      this.kind = { pub: 'ranked', open: 'open', solo: 'solo', hit: 'daily' }[prefix] || 'priv';
      this.ranked = this.kind === 'ranked';
      this.solo = this.kind === 'solo';
      this.alone = this.solo || this.kind === 'daily'; // un seul joueur humain : pas de réactions, de signalements ni d'invitations
      this.day = this.kind === 'daily' ? a : null;
      this.pub = this.ranked || this.kind === 'open';
      this.code = this.kind === 'priv' ? a : null;
      this.win = 0;
      if (this.pub) {
        this.cat = a;
        if (this.ranked) this.win = Math.min(WINDOWS - 1, Math.max(0, parseInt(w, 10) || 0));
        if (this.env.MOCK_MUSIC) this.opts = { ...this.opts, rounds: 5, dur: 15 }; // tests en local : parties publiques courtes
      }
    }
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    // Hit du jour : un seul essai par jour (une partie quittée en route compte)
    if (this.kind === 'daily' && !this.humans(false).length) {
      const uid = (q.get('uid') || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
      if (uid.length >= 8 && (await this.hub().hitStatus(uid, this.day).catch(() => null))) {
        this.reject(server, 'Tu as déjà joué le Hit du jour. Reviens demain pour le suivant !');
        return new Response(null, { status: 101, webSocket: client });
      }
    }
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
    let soloStart = false;
    if (this.alone && !p && this.humans(false).length) return this.reject(ws, 'Cette partie solo est déjà en cours.');
    if (!this.pub && !this.humans(false).length) {
      if (q.get('create') !== '1') return this.reject(ws, this.alone ? 'Cette partie solo est terminée.' : "Ce salon n'existe pas ou est terminé. Vérifie le code !");
      this.reset();
      this.opts.botlvl = bracketOf(parseInt(q.get('tier'), 10) || 0);
      if (this.solo) this.opts = { ...this.opts, bots: 3, ...(this.env.MOCK_MUSIC ? { rounds: 5, dur: 15 } : {}) };
      // Survie : jusqu'à la première manche ratée, sans bots ; Intro : extrait de 1 seconde, points doublés
      if (this.solo && q.get('mode') === 'survie') this.opts = { ...this.opts, survie: 1, bots: 0, rounds: SURVIE_MAX, dur: 20 };
      // Hit du jour : réglages fixes, les mêmes pour tout le monde
      if (this.kind === 'daily') this.opts = { ...this.opts, rounds: HIT_N, dur: this.env.MOCK_MUSIC ? 15 : 20, bots: 0 };
      else {
        this.setOpts(q);
        if (this.kind === 'priv' && q.get('duel') === '1') this.opts = { ...this.opts, duel: 1, bots: 0, bet: BETS.includes(parseInt(q.get('bet'), 10)) ? parseInt(q.get('bet'), 10) : 0 };
      }
      soloStart = this.alone;
    }
    if (!p && this.humans(false).length >= this.maxHumans()) return this.reject(ws, this.opts.duel ? 'Ce duel est complet : c’est un 1 contre 1.' : 'Ce salon est complet (12 joueurs maximum).');
    const isNew = !p;
    if (p) {
      if (p.ws && p.ws !== ws) { try { p.ws.close(4000, 'remplacé'); } catch { /* déjà fermée */ } }
    } else {
      p = { id: rid(6), uid, pk: publicKey(uid), bot: false, score: 0, streak: 0, best: 0, nT: 0, nA: 0, speed: 0, fast: 0, rounds: 0, rt: null, lastG: 0, lastC: 0 };
      if (this.phase === 'play') { p.rt = { title: 0, artist: 0 }; p.rounds = 1; }
      this.players.set(p.id, p);
      // chat suspendu 24 h après plusieurs signalements (les réponses tapées dans le chat comptent toujours)
      if (!this.alone) this.hub().isMuted(uid).then(m => { p.muted = m; }).catch(() => {});
    }
    p.ws = ws;
    p.on = true;
    p.off = 0;
    p.tier = Math.min(8, Math.max(0, parseInt(q.get('tier'), 10) || 0)); // fourni par le serveur, pas par l'appli
    p.rbest = Math.min(8, Math.max(0, parseInt(q.get('best'), 10) || 0)); // meilleur rang toutes saisons (≠ p.best = meilleure série)
    p.club = cleanText(q.get('club') || '', 24); // « 🎸 Les Rockeurs », fourni par le serveur comme le rang
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
    if (soloStart) this.later(1200, () => this.startGame()); // solo : la partie démarre tout de suite
    // duel : la partie démarre dès que l'adversaire arrive
    if (this.opts.duel && isNew && this.phase === 'lobby' && !this.starting && this.humans().length === 2) {
      this.sys('⚔️ Les deux joueurs sont là : le duel commence !');
      this.later(2500, () => { if (this.phase === 'lobby' && this.humans().length === 2) this.startGame(); });
    }
  }

  // message du serveur pour tout le salon (ex. : l'ami invité ne peut pas jouer)
  note(text) { if (this.humans(false).length) this.sys(cleanText(text, 120)); }

  profile(p, src) {
    const get = k => (src.get ? src.get(k) : src[k]);
    if (get('name') != null) p.name = cleanName(get('name'));
    if (!p.name) p.name = 'Joueur' + Math.floor(100 + Math.random() * 900);
    const av = Array.from(String(get('av') || '')).slice(0, 4).join('');
    if (av) p.av = av; else if (!p.av) p.av = 'A02';
    if (frameOk(get('fr'), p.rbest || 0)) p.fr = get('fr'); else if (!p.fr) p.fr = 'def';
    const title = get('title');
    // titres de rang : seulement si le rang a été atteint
    const rankTitle = { 'r-maitre': 7, 'r-gm': 8 }[title];
    if (title != null) p.title = /^[a-z0-9-]{1,24}$/.test(title) && !(rankTitle > (p.rbest || 0)) ? title : '';
    const show = get('show');
    if (show != null) p.show = String(show).split(',').filter(x => /^[a-z]{2,10}:[0-4]$/.test(x)).slice(0, 3);
    const lvl = parseInt(get('lvl'), 10);
    if (lvl > 0 && lvl < 1000) p.lvl = lvl; else if (!p.lvl) p.lvl = 1;
    if (NAME_STYLES.has(get('nc'))) p.nc = get('nc');
    if (WIN_FX.has(get('vfx'))) p.vfx = get('vfx');
    if (get('sh') != null) p.sh = get('sh') === '1'; // a un bouclier de rang (1 utilisé par jour au plus, vérifié par le Hub)
  }

  setOpts(src) {
    const get = k => (src.get ? src.get(k) : src[k]);
    const cat = cleanCat(get('cat'), this.env);
    if (cat) this.cat = cat;
    const r = parseInt(get('rounds'), 10), d = parseInt(get('dur'), 10), b = parseInt(get('bots'), 10), l = parseInt(get('botlvl'), 10);
    if (ROUNDS.includes(r)) this.opts.rounds = r;
    if (DURS.includes(d)) this.opts.dur = d;
    if (b >= 0 && b <= 4) this.opts.bots = b;
    if (l >= 0 && l <= 3) this.opts.botlvl = l;
    if (this.opts.duel) this.opts.bots = 0;
    if (!this.opts.survie && (this.solo || this.kind === 'priv') && get('intro') != null) this.opts.intro = get('intro') === '1' || get('intro') === 1 ? 1 : 0;
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
      case 'react': return this.onReact(p, m.e);
      case 'report': return this.onReport(p, m);
      case 'invite': return this.onInvite(p, m);
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
  // bots au niveau du salon : les 2 rangs du salon en classé, niveau moyen en non classé, réglé par le joueur en privé et en solo
  setupBots() {
    const want = this.pub ? Math.max(0, 4 - this.humans().length) : this.opts.bots;
    const bl = this.kind === 'open' ? 1 : this.opts.botlvl;
    const lvl = this.ranked ? 'w' + this.win : 'l' + bl;
    const [lo, hi] = this.ranked ? windowSkill(this.win) : BOT_SKILL[bl];
    const tiers = this.ranked ? windowTiers(this.win) : TIERS_OF_BRACKET[bl];
    const bots = this.bots();
    while (bots.length > want) this.players.delete(bots.pop().id);
    for (const b of bots) if (b.lvlGroup !== lvl) Object.assign(b, { lvlGroup: lvl, skill: lo + Math.random() * (hi - lo), tier: pick(tiers) });
    const used = new Set([...this.players.values()].map(p => p.name));
    for (let i = bots.length; i < want; i++) {
      const name = pick(BOT_NAMES.filter(n => !used.has(n)));
      used.add(name);
      const b = { id: 'b' + rid(5), bot: true, on: true, name, av: pick(BOT_AV), fr: pick(['def', 'def', 'or', 'neon', 'diamant']),
        lvl: 3 + Math.floor(Math.random() * 30), lvlGroup: lvl, skill: lo + Math.random() * (hi - lo), tier: pick(tiers),
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
    // salon classé : qui vient de changer de rang et sort des 2 rangs du salon part dans le salon de son nouveau niveau
    if (this.ranked) {
      for (const p of this.humans()) {
        if (inWindow(p.tier, this.win)) continue;
        const ws = p.ws;
        p.ws = null;
        this.players.delete(p.id);
        this.send(ws, { t: 'move', tier: p.tier });
        try { ws.close(4001, 'nouveau niveau'); } catch { /* déjà fermée */ }
        this.sys(`${p.name} change de salon : nouveau rang`);
      }
      this.report();
      if (!this.humans().length) return this.stop();
    }
    this.setupBots();
    this.phase = 'loading';
    this.cur = this.reveal = this.results = null;
    this.broadcastState();
    let songs = [];
    try {
      songs = this.kind === 'daily' ? await this.hub().hitSongs(this.day) : await this.hub().pickSongs(this.cat, this.opts.rounds, this.played);
    } catch (e) { console.log('pickSongs', e); }
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
    this.dead = false;
    this.gameId = rid(10);
    for (const p of this.players.values()) Object.assign(p, { score: 0, surv: 0, streak: 0, best: 0, nT: 0, nA: 0, speed: 0, fast: 0, rounds: 0, rt: null, grid: '' });
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
    if (this.kind === 'daily' && i === 0) this.saveHit(false); // l'essai du jour est utilisé dès le 1er extrait
  }

  // Hit du jour : résultat enregistré après chaque extrait ; à la fin, place du jour et série envoyées au joueur
  saveHit(done) {
    const p = this.humans(false)[0];
    if (!p) return;
    this.hub().hitSave(p.uid, this.day, { name: p.name, av: p.av }, p.score, p.grid || '', done)
      .then(r => { if (r) this.send(p.ws, { t: 'hit', ...r }); })
      .catch(e => console.log('hitSave', e));
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
    // Entrée a sa propre limite : sinon une réponse validée juste après l'envoi automatique de la frappe serait ignorée
    // (et l'appli ne saurait pas qu'il faut effacer une réponse fausse)
    const k = enter ? 'lastE' : 'lastG';
    if (now < this.cur.start - 300 || now - (p[k] || 0) < (enter ? 150 : 60)) return;
    p[k] = now;
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
    const total = (pts + bonus + ser) * (this.opts.intro ? 2 : 1);
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
    for (const p of this.players.values()) {
      if (p.rt && !p.rt.title && !p.rt.artist) p.streak = 0;
      if (!p.bot) p.grid = (p.grid || '') + ((p.rt?.title ? 1 : 0) | (p.rt?.artist ? 2 : 0));
      if (this.opts.survie && !p.bot && p.rt) { if (p.rt.title || p.rt.artist) p.surv = (p.surv || 0) + 1; else this.dead = true; } // Survie : une manche ratée = fin
    }
    this.phase = 'reveal';
    this.ends = Date.now() + REVEAL;
    this.reveal = { t: s.t[0], a: s.a[0], art: s.art, link: s.link, found: c.found };
    this.broadcastState();
    if (this.kind === 'daily') this.saveHit(this.round >= this.rounds);
    const next = this.songs[this.round];
    if (this.round < this.rounds && next) this.broadcast({ t: 'preload', url: next.url });
    const bots = this.bots();
    if (bots.length && Math.random() < 0.3) this.botSay(pick(bots), pick(AFTER), 300);
    this.later(REVEAL, () => (this.round < this.rounds && !this.dead ? this.startRound(this.round) : this.endGame()));
  }

  endGame() {
    this.clearTimers();
    const list = [...this.players.values()].sort((a, b) => b.score - a.score);
    this.results = list.map((p, i) => ({
      id: p.id, pk: p.pk || '', rank: i + 1, name: p.name, av: p.av, fr: this.frameOf(p), lvl: p.lvl, tier: this.tierOf(p), title: this.titleOf(p), show: p.show || [], bot: !!p.bot, score: p.score,
      nc: p.nc || '', vfx: p.vfx || '',
      nT: p.nT || 0, nA: p.nA || 0, best: p.best || 0, speed: p.speed || 0, fast: p.fast || 0, rounds: p.rounds || 0,
    }));
    this.phase = 'end';
    this.cur = this.reveal = null;
    this.ends = this.pub ? Date.now() + PUBLIC_NEXT : 0;
    for (const p of this.players.values()) p.rt = null;
    this.broadcastState();
    this.hub().countGame(this.kind, this.cat, list.filter(p => !p.bot && p.rounds).length).catch(() => {});
    const rows = list.filter(p => !p.bot && p.score > 0)
      .map(p => ({ uid: p.uid, name: p.name, av: p.av, fr: p.fr, pts: p.score, win: list[0] === p && list.length > 1 }));
    if (rows.length && !this.alone) this.hub().addResults(rows).catch(() => {}); // le solo ne compte pas au classement
    // clubs : points des parties publiques et du Hit du jour
    if (rows.length && (this.pub || this.kind === 'daily')) this.hub().clubScore(rows.map(r => ({ uid: r.uid, pts: r.pts })), this.cat, this.pub).catch(() => {});
    if (this.opts.duel) this.duelEnd(list);
    if (this.opts.survie) this.survieEnd(list);
    if (this.pub) this.later(PUBLIC_NEXT, () => (this.humans().length ? this.startGame() : this.stop()));
    if (this.ranked) this.rankGame(list).catch(e => console.log('rangs', e));
    setTimeout(() => this.sweep(), 500);
  }

  // Survie : nombre de manches tenues, record personnel et place dans le classement de la catégorie
  survieEnd(list) {
    const p = list.find(x => !x.bot);
    if (!p) return;
    this.hub().survieSave(p.uid, this.cat, p.surv || 0)
      .then(r => this.send(p.ws, { t: 'survie', gameId: this.gameId, n: p.surv || 0, ...r }))
      .catch(e => console.log('survie', e));
  }

  // duel : le gagnant (ou l'égalité) est noté, chacun reçoit le bilan de leurs duels
  duelEnd(list) {
    const [a, b] = list.filter(p => !p.bot && p.rounds > 0);
    if (!a || !b) return;
    this.hub().duelResult(a.uid, b.uid, a.score > b.score ? a.uid : b.score > a.score ? b.uid : '')
      .then(rec => {
        for (const [p, o] of [[a, b], [b, a]]) this.send(p.ws, { t: 'duel', gameId: this.gameId, bet: this.opts.bet || 0, rec: rec[p.uid], vs: o.name, res: p.score > o.score ? 'win' : p.score < o.score ? 'loss' : 'tie' });
      })
      .catch(e => console.log('duel', e));
  }

  // partie classée : points de rang selon la place (bots compris), envoyés à chaque joueur
  async rankGame(list) {
    const gameId = this.gameId, n = list.length;
    const rows = list.map((p, i) => ({ p, rank: i + 1 })).filter(x => !x.p.bot && x.p.rounds > 0).map(({ p, rank }) => ({
      uid: p.uid, name: p.name, av: p.av, fr: p.fr, win: rank === 1, shield: !!p.sh,
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
        this.send(p.ws, { t: 'rank', gameId, rp: r.rp, delta: r.delta, tier: r.tier, prev: r.prev, promo: r.promo, sc: r.sc, saved: r.saved || 0 });
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
    if (p.muted) return this.send(p.ws, { t: 'sys', text: 'Ton chat est suspendu pendant 24 h après plusieurs signalements. Tes réponses comptent toujours.', at: now });
    this.pushChat({ t: 'chat', id: p.id, pk: p.pk, name: p.name, av: p.av, text, at: now });
  }

  pushChat(msg) {
    this.chat.push(msg);
    if (this.chat.length > 40) this.chat.shift();
    this.broadcast(msg);
  }

  sys(text) { this.pushChat({ t: 'sys', text, at: Date.now() }); }

  // ---------- réactions rapides ----------
  // relayées tout de suite à tout le salon, jamais gardées (pas dans l'historique du chat) ;
  // pas en solo, jamais de la part d'un bot, au plus 5 toutes les 3 secondes par joueur
  onReact(p, e) {
    if (this.alone || p.bot || !REACTS.has(e)) return;
    const now = Date.now();
    p.rq = (p.rq || []).filter(t => now - t < 3000);
    if (p.rq.length >= 5) return;
    p.rq.push(now);
    this.broadcast({ t: 'react', id: p.id, pk: p.pk || '', name: p.name, e });
  }

  // ---------- invitations (notification au joueur invité, salons entre amis seulement) ----------
  onInvite(p, m) {
    const pk = String(m.pk || '');
    if (this.kind !== 'priv' || p.bot || !/^[0-9a-f]{12}$/.test(pk)) return;
    this.hub().invite(p.uid, p.name, this.code, pk, this.opts.duel ? 'duel' : 'salon', this.cat)
      .then(r => this.send(p.ws, { t: 'invited', pk, ...r }))
      .catch(() => this.send(p.ws, { t: 'invited', pk, ok: 0, why: 'err' }));
  }

  // ---------- signalements ----------
  // gardés par le Hub avec les derniers messages du joueur signalé ; 3 personnes différentes en 24 h = chat suspendu 24 h
  onReport(p, m) {
    const target = this.players.get(String(m.id || ''));
    if (this.alone || p.bot || !target || target.bot || target === p) return;
    const why = REPORT_WHY.has(m.why) ? m.why : 'autre';
    const msgs = this.chat.filter(c => c.id === target.id).slice(-5).map(c => c.text);
    this.hub().addReport({ reporter: p.uid, target: target.uid, pk: target.pk, name: target.name, why, msgs, room: this.name })
      .then(r => {
        this.send(p.ws, { t: 'reported', ok: r.ok ? 1 : 0 });
        if (r.muted && !target.muted) {
          target.muted = true;
          this.send(target.ws, { t: 'sys', text: 'Plusieurs joueurs t’ont signalé : ton chat est suspendu pendant 24 h.', at: Date.now() });
        }
      })
      .catch(() => this.send(p.ws, { t: 'reported', ok: 0 }));
  }
}
