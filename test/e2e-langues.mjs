// Mélange des langues (version 1.14) sur le serveur local (wrangler dev avec MOCK_MUSIC=1) : node test/e2e-langues.mjs (≈ 20 s)
// tirages de parties dans chaque catégorie : jamais 3 morceaux de suite dans la même langue quand la catégorie le permet,
// assez de français et d'autres langues, pas de doublon
import { songsOf } from '../src/catalog.js';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const maxRun = list => { let best = 0, run = 0; list.forEach((s, i) => { run = i && s.fr === list[i - 1].fr ? run + 1 : 1; best = Math.max(best, run); }); return best; };
const pick = async (cat, n) => (await fetch(`${BASE}/__mock/pick?cat=${cat}&n=${n}`)).json();

for (const [cat, n] of [['80', 10], ['90', 10], ['2000', 10], ['2010', 10], ['2020', 10], ['mix', 10], ['rock', 10], ['80', 5], ['mix', 15], ['rock+80', 30]]) {
  let worst = 0, minFr = 99, minOther = 99, dup = false, short = false;
  const shown = [];
  for (let i = 0; i < 25; i++) {
    const list = await pick(cat, n);
    if (list.length !== n) short = true;
    if (new Set(list.map(s => s.k)).size !== list.length) dup = true;
    worst = Math.max(worst, maxRun(list));
    const fr = list.filter(s => s.fr).length;
    minFr = Math.min(minFr, fr); minOther = Math.min(minOther, list.length - fr);
    if (i < 3) shown.push(list.map(s => (s.fr ? 'FR' : 'EN')).join(' '));
  }
  ok(!short && !dup && worst <= 2, `${cat}, ${n} manches : jamais 3 de suite dans la même langue (au pire ${worst}), au moins ${minFr} en français et ${minOther} dans une autre langue`);
  console.log('   ex. :', shown[0]);
}
// catégories d'une seule langue : la partie se fait quand même
for (const cat of ['rapus', 'kpop', 'rapfr', 'electro']) {
  const list = await pick(cat, 10);
  ok(list.length === 10, `${cat} : 10 morceaux (${list.filter(s => s.fr).length} en français)`);
}
console.log(failures ? `${failures} échec(s)` : 'Tout est bon');
process.exit(failures ? 1 : 0);
