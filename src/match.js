// Détection des réponses : tolère accents, fautes de frappe, articles, saisie partielle,
// et reconnaît « artiste + titre » tapés d'un coup.

const STOP = new Set(['the', 'le', 'la', 'les', 'l', 'un', 'une', 'des', 'de', 'du', 'd', 'a', 'and', 'et',
  'feat', 'ft', 'featuring', 'of', 'en', 'au', 'aux', 'y', 'n']);

export const THRESHOLD = 0.8;

export function norm(s) {
  return (s || '').toString().toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/&/g, ' and ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function strip(n) {
  const w = n.split(' ').filter(x => x && !STOP.has(x));
  return w.length ? w.join(' ') : n;
}

function forms(s) {
  const full = norm(s);
  const st = strip(full);
  return [full, st, full.replace(/ /g, ''), st.replace(/ /g, '')];
}

// distance d'édition avec inversion de deux lettres (« beleive » = 1 faute)
export function lev(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let pp = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
      if (pp && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], pp[j - 2] + 1);
    }
    pp = prev;
    prev = cur;
  }
  return prev[b.length];
}

function pairScore(i, t, spaced, isArtist) {
  if (!i || !t) return 0;
  if (i === t) return 1;
  if (spaced) {
    // saisie partielle : début de réponse suffisamment long (« pour que tu m aimes » pour « pour que tu m aimes encore »)
    if (i.length >= 3 && t.startsWith(i) && i.length >= t.length * 0.6) return 0.92;
    // nom de famille seul pour un artiste en plusieurs mots (« goldman », « aznavour »)
    if (isArtist && i.length >= 4) {
      const words = t.split(' ');
      if (words.length >= 2 && words[words.length - 1] === i) return 0.9;
    }
  }
  const d = lev(i, t);
  return 1 - d / Math.max(i.length, t.length);
}

export function score(input, targets, isArtist = false) {
  const fi = forms(input);
  let best = 0;
  for (const target of targets) {
    const ft = forms(target);
    for (let k = 0; k < 4; k++) {
      const s = pairScore(fi[k], ft[k], k < 2, isArtist);
      if (s > best) best = s;
      if (best === 1) return 1;
    }
  }
  return best;
}

// song : { t: [titres acceptés], a: [artistes acceptés] }
// renvoie { title, artist, near } ; near = « tu brûles »
export function judge(input, song) {
  const text = norm(input);
  if (text.replace(/ /g, '').length < 2) return { title: false, artist: false, near: 0 };
  const st = score(input, song.t, false);
  const sa = score(input, song.a, true);
  let title = st >= THRESHOLD;
  let artist = sa >= THRESHOLD;
  if (title && artist) {
    // un seul texte qui ressemble aux deux : on garde le plus proche
    if (st >= sa) artist = false; else title = false;
  }
  if (!(title && artist)) {
    // « artiste titre » ou « titre artiste » d'un seul coup
    const w = text.split(' ');
    for (let k = 1; k < w.length; k++) {
      const left = w.slice(0, k).join(' '), right = w.slice(k).join(' ');
      if ((score(left, song.a, true) >= 0.86 && score(right, song.t) >= 0.86) ||
          (score(left, song.t) >= 0.86 && score(right, song.a, true) >= 0.86)) {
        title = artist = true;
        break;
      }
    }
  }
  const near = Math.max(st, sa);
  return { title, artist, near: title || artist ? 1 : near };
}
