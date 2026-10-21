// Grossièretés masquées dans le chat et les pseudos.
import { norm } from './match.js';

const BAD = ['con', 'cons', 'conne', 'connard', 'connards', 'connasse', 'salope', 'salopes', 'pute', 'putes', 'putain',
  'encule', 'encules', 'enculer', 'merde', 'bite', 'bites', 'couille', 'couilles', 'nique', 'niquer', 'ntm', 'fdp',
  'pd', 'pede', 'pedes', 'batard', 'batards', 'salaud', 'salauds', 'chier', 'tg', 'negre', 'bougnoule', 'youpin',
  'fuck', 'fucking', 'shit', 'bitch', 'cunt', 'nigga', 'nigger', 'whore', 'slut', 'abruti', 'debile', 'gogol', 'mongol'];
const BAD_SET = new Set(BAD);

export function cleanText(text, max = 120) {
  const t = (text || '').toString().replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return t.replace(/[\p{L}\p{N}]+/gu, w => (BAD_SET.has(norm(w).replace(/ /g, '')) ? '*'.repeat(w.length) : w));
}

export function cleanName(name) {
  let n = cleanText(name, 16);
  if (/\*/.test(n) || !n.replace(/[^\p{L}\p{N}]/gu, '')) n = 'Joueur' + Math.floor(100 + Math.random() * 900);
  return n;
}
