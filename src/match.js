// Détection des réponses : il faut taper le titre ou l'artiste en entier.
// Pendant la frappe, seule la réponse exacte (accents, majuscules et ponctuation ignorés) est validée ;
// avec Entrée, quelques fautes de frappe sont tolérées selon la longueur.

const STOP = new Set(['the', 'le', 'la', 'les', 'l', 'un', 'une', 'des', 'de', 'du', 'd', 'a', 'and', 'et',
  'feat', 'ft', 'featuring', 'of', 'en', 'au', 'aux', 'y', 'n']);

export const THRESHOLD = 0.9;

export function norm(s) {
  return (s || '').toString().toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/&/g, ' and ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function strip(n) {
  return n.split(' ').filter(x => x && !STOP.has(x)).join(' ');
}

// [complet, sans articles, complet collé, sans articles collé]
// la forme sans articles n'est gardée que si elle reste assez longue (« a-ha » ne devient pas « ha »)
function forms(s) {
  const full = norm(s);
  let st = strip(full);
  if (st.replace(/ /g, '').length < 4) st = full;
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

// fautes tolérées selon le nombre de lettres de la réponse
export const allowed = len => (len <= 4 ? 0 : len <= 8 ? 1 : len <= 14 ? 2 : 3);

// 1 : identique ; 0,9 : petites fautes tolérées (seulement si fuzzy) ; sinon ressemblance < 0,9
export function score(input, targets, fuzzy = false) {
  const fi = forms(input);
  let best = 0;
  for (const target of targets) {
    const ft = forms(target);
    for (let k = 0; k < 4; k++) {
      if (!fi[k] || !ft[k]) continue;
      if (fi[k] === ft[k]) return 1;
      if (k < 2) continue;
      const d = lev(fi[k], ft[k]);
      if (fuzzy && d <= allowed(ft[k].length)) best = Math.max(best, THRESHOLD);
      best = Math.max(best, Math.min(0.89, 1 - d / Math.max(fi[k].length, ft[k].length)));
    }
  }
  return best;
}

// song : { t: [titres acceptés], a: [artistes acceptés] } ; fuzzy = Entrée appuyée
// renvoie { title, artist, near } ; near = « tu brûles »
export function judge(input, song, fuzzy = false) {
  const text = norm(input);
  if (text.replace(/ /g, '').length < 2) return { title: false, artist: false, near: 0 };
  const st = score(input, song.t, fuzzy);
  const sa = score(input, song.a, fuzzy);
  let title = st >= THRESHOLD;
  let artist = sa >= THRESHOLD;
  if (title && artist) {
    if (st >= sa) artist = false; else title = false;
  }
  if (!(title && artist)) {
    // « artiste titre » ou « titre artiste » d'un seul coup
    const w = text.split(' ');
    for (let k = 1; k < w.length; k++) {
      const left = w.slice(0, k).join(' '), right = w.slice(k).join(' ');
      if ((score(left, song.a, fuzzy) >= THRESHOLD && score(right, song.t, fuzzy) >= THRESHOLD) ||
          (score(left, song.t, fuzzy) >= THRESHOLD && score(right, song.a, fuzzy) >= THRESHOLD)) {
        title = artist = true;
        break;
      }
    }
  }
  return { title, artist, near: title || artist ? 1 : Math.max(st, sa) };
}
