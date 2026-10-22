// Outils du Hit du jour, des amis et des clubs (version 1.15), sans état : testés par test/social.test.mjs.
import { CATS, songsOf } from './catalog.js';

const DAY = 86400000;

// ---------- Hit du jour ----------
// le jour change à minuit heure de Paris, pour tout le monde en même temps (mêmes extraits pour tous)
export const parisDay = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
export const dayAdd = (day, n) => new Date(Date.parse(day + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
// numéro affiché (« Hitroom #42 ») : le 22 octobre 2026 est le n° 1
export const HIT_EPOCH = '2026-10-21';
export const hitNumber = day => Math.round((Date.parse(day + 'T12:00:00Z') - Date.parse(HIT_EPOCH + 'T12:00:00Z')) / DAY);
export const HIT_N = 5;      // extraits par jour
export const HIT_POOL = 40;  // seuls les 40 premiers morceaux de chaque catégorie (les plus connus) peuvent tomber

// nombres pseudo-aléatoires reproductibles : le même texte donne toujours la même suite
export function seededRnd(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// morceaux candidats du jour, dans un ordre tiré d'après la date (cat = catégorie d'origine, une seule par jour)
export function hitCandidates(day) {
  const rnd = seededRnd('hit:' + day), seen = new Set(), list = [];
  for (const c of CATS) {
    if (c.id === 'mix' || c.id === 'frissons') continue;
    for (const s of songsOf(c.id).slice(0, HIT_POOL)) if (!seen.has(s.k)) { seen.add(s.k); list.push({ ...s, cat: c.id }); }
  }
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// séries de jours joués : days = jours joués (du plus récent au plus ancien) ; la série en cours compte encore
// si le dernier jour joué est hier (on a jusqu'à minuit pour la prolonger)
export function streaks(days, today) {
  const set = new Set(days);
  let cur = 0;
  for (let d = set.has(today) ? today : dayAdd(today, -1); set.has(d); d = dayAdd(d, -1)) cur++;
  let best = 0, run = 0, prev = null;
  for (const d of [...set].sort()) {
    run = prev && dayAdd(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { cur, best };
}

// ---------- amis ----------
// code ami de 6 caractères (sans I, O, 0 ni 1), tiré de l'identifiant public ; i = essai suivant si déjà pris
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function friendCode(pk, i = 0) {
  const rnd = seededRnd(`ami:${pk}:${i}`);
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(rnd() * 32)]).join('');
}
export const ONLINE = 90000; // vu il y a moins de 90 s = en ligne (l'appli se signale chaque minute)
// où se trouve le joueur (envoyé par l'appli, vu seulement par ses amis) : salon entre amis rejoignable avec son code
export const AT_RE = /^(menu|hit|solo|(ranked|open):[a-z0-9]{1,8}|(priv|duel):[A-Z0-9]{4})$/;

// ---------- clubs ----------
export const CLUB_MAX = 30;
export const CLUB_EMBLEMS = ['🎸', '🎤', '🎧', '🎹', '🥁', '🎷', '🎺', '🎻', '💿', '📻', '🔥', '⚡', '👑', '💎', '🌙', '⭐', '🦊', '🐺', '🦁', '🐉', '🚀', '🌈', '🍀', '🎯'];
export const CLUB_COLORS = 8; // couleurs du blason (même liste que CLUB_COLORS dans l'appli)
export const clubId = rnd => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(rnd() * 32)]).join('');
