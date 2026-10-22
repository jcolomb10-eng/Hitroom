// Choix du bon résultat dans une recherche iTunes ou Deezer : même artiste, même titre,
// en évitant les versions live, remix, karaoké, reprises et imitateurs, et en préférant la plus écoutée (Deezer).
import { norm, lev } from './match.js';

const flat = s => s.replace(/ /g, '');
const noThe = s => s.replace(/^the /, '');

// titre : identique, ou titre du catalogue contenu dans un titre plus long (0,8, moins bien qu'identique) ;
// un titre plus court que celui du catalogue n'est pas le bon (« Somebody » ≠ « Somebody That I Used to Know »)
function titleSim(a, b) {
  if (!a || !b) return 0;
  if (a === b || flat(a) === flat(b)) return 1;
  if ((' ' + a + ' ').includes(' ' + b + ' ')) return 0.8;
  return 1 - lev(flat(a), flat(b)) / Math.max(flat(a).length, flat(b).length);
}
const cleanTitle = s => norm((s || '').replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, ''));
const titleScore = (it, titles) => Math.max(...titles.map(t => Math.max(titleSim(cleanTitle(it), norm(t)), titleSim(norm(it), norm(t)))));

// artiste : nom identique, ou un des noms d'un duo (« Dick Dale & His Del-Tones », « Eurythmics, Annie Lennox ») ;
// petites différences tolérées seulement sur les noms longs (« Siam » ≠ « Sia », « Hello I'm Adele » ≠ « Adele »)
const SPLIT = /\s*(?:,|&|\/|;|\+|\bfeat\.?|\bft\.?|\bfeaturing\b|\bwith\b|\bx\b|\band\b|\bet\b|\bvs\.?)\s*/i;
function artistSim(it, a) {
  const b = noThe(norm(a));
  let best = 0;
  for (const part of [it, ...(it || '').split(SPLIT)]) {
    const p = noThe(norm(part));
    if (!p || !b) continue;
    if (p === b || flat(p) === flat(b)) return 1;
    if (Math.min(flat(p).length, flat(b).length) >= 6) best = Math.max(best, 1 - lev(flat(p), flat(b)) / Math.max(flat(p).length, flat(b).length));
  }
  return best >= 0.85 ? best : 0;
}
const artistScore = (it, artists) => Math.max(...artists.map(a => artistSim(it, a)));

// versions à éviter : très différentes de l'original (forte pénalité) ou simplement remaniées (légère)
const OTHER_VERSION = /\b(live|en concert|karaok\w*|instrumental|acousti\w*|unplugged|remix\w*|re-?mix|demo|rehearsal|commentary|re-?recorded|piano|pianoforte|orchestral|symphon\w*|sped up|slowed|nightcore|a ?cappella|lullaby|berceuse|version (?:espagnole|anglaise|english|spanish|italiana?)|(?:spanish|english|italian) version)\b/i;
const EDITED = /\b(edit|mix|maxi|extended|club|dub)\b/i;
// album de remix ou de concert ; mentions sans conséquence entre parenthèses (featuring, remaster, B.O.…)
const OTHER_ALBUM = /\b(remix\w*|re-?mixes|mixes|megamix|live|en concert|unplugged|acousti\w*)\b/i;
const BENIGN = /^(feat|ft\b|featuring|with |avec |from |de |du film|bande originale|theme|love theme|original|version originale|single version|album version|explicit|clean|mono|stereo)|remaster/i;
// pas l'artiste lui-même : karaoké, hommage, reprise, « rendu célèbre par »…
const NOT_ARTIST = /\b(karaok\w*|tribute|hommage|covers?|covered|reprise|parod\w*|originally|made famous|in the style|rendu c[ée]l[èe]bre|interpr[ée]t[ée]e? (?:à|a) l.origine)\b/i;

// reste-t-il autre chose que le titre et des mentions sans conséquence ? (« Blue (DJ Ponte Ice Pop Radio) »)
function extraBits(name, song) {
  const kept = (name || '').replace(/\s*[([]([^)\]]*)[)\]]/g, (m, inner) => (BENIGN.test(inner.trim()) ? '' : m))
    .replace(/\s+-\s+(.*)$/, (m, rest) => (BENIGN.test(rest.trim()) ? '' : m));
  return !song.t.some(t => norm(t) === norm(kept)) && /[([]|\s-\s/.test(kept);
}

export function pickBest(results, song) {
  const ok = [];
  for (const x of results || []) {
    if (!x.previewUrl || x.kind !== 'song') continue;
    const sa = artistScore(x.artistName, song.a);
    const st = titleScore(x.trackName, song.t);
    if (sa < 0.75 || st < 0.75) continue;
    ok.push({ x, s: sa + st });
  }
  // popularité (Deezer) : la version la plus écoutée est presque toujours l'originale
  const top = Math.max(1, ...ok.map(o => o.x.rank || 0));
  let best = null, bs = -Infinity;
  for (const { x, s: base } of ok) {
    let s = base + 0.3 * (x.rank || 0) / top;
    const own = re => song.t.some(t => re.test(t));
    if (OTHER_VERSION.test(x.trackName) && !own(OTHER_VERSION)) s -= 0.5;
    else if (EDITED.test(x.trackName) && !own(EDITED)) s -= 0.2;
    else if (extraBits(x.trackName, song)) s -= 0.1;
    if (OTHER_ALBUM.test(x.collectionName || '') && !own(OTHER_ALBUM)) s -= 0.2;
    if (NOT_ARTIST.test(`${x.trackName} ${x.collectionName || ''} ${x.artistName || ''}`) && !own(NOT_ARTIST)) s -= 1;
    if (s > bs) { bs = s; best = x; }
  }
  return best;
}
