// Mélange des langues (demande de l'utilisateur) : jamais 3 morceaux de suite dans la même langue
// (français / autres langues), quand la catégorie le permet. « fr » vient du catalogue (« | fr »).

// pour n manches, il faut au moins ce nombre de morceaux de chaque langue (sinon la règle est impossible)
export const minPerLang = n => Math.max(0, Math.ceil((n - 2) / 3));

// minimum à prendre de chaque langue, sans dépasser le tiers des morceaux de cette langue dans la catégorie
// (sinon ils reviendraient trop souvent : Électro n'a qu'un morceau français, Rap US aucun)
export function langMins(list, n) {
  const fr = list.filter(s => s.fr).length;
  const need = minPerLang(n);
  return { fr: Math.min(need, Math.floor(fr / 3)), other: Math.min(need, Math.floor((list.length - fr) / 3)) };
}

// un morceau de cette langue peut-il encore entrer, en gardant la place du minimum de l'autre langue ?
export function langFits(s, cnt, mins, n) {
  const theirs = s.fr ? 'other' : 'fr';
  return cnt.fr + cnt.other + 1 + Math.max(0, mins[theirs] - cnt[theirs]) <= n;
}

function shuffle(a, rnd) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ordre au hasard, mais jamais 3 de suite dans la même langue quand c'est possible
// (à chaque pas, une langue n'est choisie que s'il reste une suite possible avec les morceaux restants)
export function langOrder(songs, rnd = Math.random) {
  const pool = { true: shuffle(songs.filter(s => s.fr), rnd), false: shuffle(songs.filter(s => !s.fr), rnd) };
  const memo = new Map();
  const possible = (a, b, last, run) => {
    if (!a && !b) return true;
    const key = `${a},${b},${last},${run}`;
    if (!memo.has(key)) {
      memo.set(key, (a > 0 && !(last === true && run >= 2) && possible(a - 1, b, true, last === true ? run + 1 : 1))
        || (b > 0 && !(last === false && run >= 2) && possible(a, b - 1, false, last === false ? run + 1 : 1)));
    }
    return memo.get(key);
  };
  const out = [];
  let last = null, run = 0;
  while (pool.true.length || pool.false.length) {
    const a = pool.true.length, b = pool.false.length;
    const ok = [true, false].filter(fr => (fr ? a : b) > 0 && !(last === fr && run >= 2)
      && possible(a - (fr ? 1 : 0), b - (fr ? 0 : 1), fr, last === fr ? run + 1 : 1));
    // deux choix possibles : au hasard selon ce qui reste ; aucun (pas assez d'une langue) : on évite quand même
    // une 3e de suite si l'autre langue est là, sinon la plus nombreuse
    const fr = ok.length === 2 ? rnd() < a / (a + b) : ok.length === 1 ? ok[0]
      : run >= 2 && (last ? b : a) > 0 ? !last : a >= b;
    out.push(pool[fr].shift());
    if (last === fr) run++; else { last = fr; run = 1; }
  }
  return out;
}
