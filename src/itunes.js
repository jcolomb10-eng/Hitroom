// Choix du bon résultat dans une recherche iTunes : même artiste, même titre,
// en évitant les versions live, remix, karaoké et reprises.
import { norm, lev } from './match.js';

function sim(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if ((' ' + a + ' ').includes(' ' + b + ' ') || (' ' + b + ' ').includes(' ' + a + ' ')) return 0.9;
  const a2 = a.replace(/ /g, ''), b2 = b.replace(/ /g, '');
  if (a2 === b2) return 1;
  return 1 - lev(a2, b2) / Math.max(a2.length, b2.length);
}
const cleanTitle = s => norm((s || '').replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, ''));
const titleScore = (it, titles) => Math.max(...titles.map(t => Math.max(sim(cleanTitle(it), norm(t)), sim(norm(it), norm(t)))));
const artistScore = (it, artists) => Math.max(...artists.map(a => sim(norm(it), norm(a))));
const BAD_VERSION = /\b(live|karaok|instrumental|acoustic|acoustique|remix|version|cover|tribute|edit)\b/i;

export function pickBest(results, song) {
  let best = null, bs = 0;
  for (const x of results || []) {
    if (!x.previewUrl || x.kind !== 'song') continue;
    const sa = artistScore(x.artistName, song.a);
    const st = titleScore(x.trackName, song.t);
    if (sa < 0.75 || st < 0.75) continue;
    let s = sa + st;
    if (BAD_VERSION.test(x.trackName) && !song.t.some(t => BAD_VERSION.test(t))) s -= 0.4;
    if (/karaok|tribute|cover/i.test(`${x.collectionName || ''} ${x.artistName || ''}`)) s -= 0.6;
    if (s > bs) { bs = s; best = x; }
  }
  return best;
}
