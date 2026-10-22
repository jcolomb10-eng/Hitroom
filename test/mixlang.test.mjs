import test from 'node:test';
import assert from 'node:assert/strict';
import { langOrder, langMins, langFits, minPerLang } from '../src/mixlang.js';
import { CATS, songsOf } from '../src/catalog.js';

const songs = (fr, other) => [...Array(fr)].map((_, i) => ({ k: 'fr' + i, fr: true })).concat([...Array(other)].map((_, i) => ({ k: 'en' + i, fr: false })));
const maxRun = list => { let best = 0, run = 0; list.forEach((s, i) => { run = i && s.fr === list[i - 1].fr ? run + 1 : 1; best = Math.max(best, run); }); return best; };

test('jamais 3 morceaux de suite dans la même langue, quand c’est possible', () => {
  for (const [fr, other] of [[3, 7], [7, 3], [5, 5], [2, 4], [4, 2], [10, 20], [1, 1], [3, 3], [6, 2]]) {
    for (let i = 0; i < 300; i++) {
      const out = langOrder(songs(fr, other));
      assert.equal(out.length, fr + other);
      assert.ok(maxRun(out) <= 2, `${fr} fr + ${other} autres : ${out.map(s => (s.fr ? 'F' : 'A')).join('')}`);
    }
  }
});

test('l’ordre change d’une partie à l’autre (fr, fr, autre… mais pas toujours le même)', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(langOrder(songs(5, 5)).map(s => (s.fr ? 'F' : 'A')).join(''));
  assert.ok(seen.size > 10, `${seen.size} ordres différents`);
});

test('pas assez d’une langue : tous les morceaux quand même, l’autre langue intercalée', () => {
  const out = langOrder(songs(8, 2));
  assert.equal(out.length, 10);
  assert.equal(out.filter(s => !s.fr).length, 2);
});

test('une seule langue (Rap US, K-Pop) : tous les morceaux, sans blocage', () => {
  assert.equal(langOrder(songs(0, 10)).length, 10);
  assert.equal(langOrder(songs(10, 0)).length, 10);
  assert.equal(langOrder(songs(1, 9)).length, 10);
});

test('minimum de chaque langue par partie, sans épuiser une langue rare', () => {
  assert.equal(minPerLang(10), 3);
  assert.equal(minPerLang(5), 1);
  assert.equal(minPerLang(30), 10);
  const m80 = langMins(songsOf('80'), 10);
  assert.deepEqual(m80, { fr: 3, other: 3 });
  assert.equal(langMins(songsOf('rapus'), 10).fr, 0, 'Rap US : aucun français à imposer');
  assert.equal(langMins(songsOf('electro'), 10).fr, 0, 'Électro : un seul français, pas imposé');
  assert.ok(langMins(songsOf('rock'), 10).fr === 3, 'Rock : assez de rock français');
  // la place du minimum de l'autre langue est gardée
  const cnt = { fr: 7, other: 0 };
  assert.equal(langFits({ fr: true }, cnt, { fr: 3, other: 3 }, 10), false);
  assert.equal(langFits({ fr: false }, cnt, { fr: 3, other: 3 }, 10), true);
  // 2 français et 7 autres : la dernière place est pour le 3e français
  assert.equal(langFits({ fr: false }, { fr: 2, other: 7 }, { fr: 3, other: 3 }, 10), false);
  assert.equal(langFits({ fr: true }, { fr: 2, other: 7 }, { fr: 3, other: 3 }, 10), true);
});

test('catalogue : les catégories mélangées ont assez de français pour la règle', () => {
  for (const id of ['mix', '80', '90', '2000', '2010', '2020', 'rock']) {
    const l = songsOf(id), fr = l.filter(s => s.fr).length;
    assert.ok(fr / l.length >= 0.15, `${id} : ${fr} morceaux français sur ${l.length}`);
  }
  for (const c of CATS) for (const s of songsOf(c.id)) assert.equal(typeof s.fr, 'boolean');
});
