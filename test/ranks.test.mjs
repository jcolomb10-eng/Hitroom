import test from 'node:test';
import assert from 'node:assert/strict';
import { TIERS, tierOf, rpDelta, RP_TABLE, softReset, fromOldScale, windowsOf, windowTiers, inWindow, windowSkill, WINDOWS } from '../src/ranks.js';

test('partie à 10 joueurs : les points de la table, place par place', () => {
  for (let t = 0; t < TIERS.length; t++) {
    assert.deepEqual(Array.from({ length: 10 }, (_, i) => rpDelta(t, i + 1, 10)), RP_TABLE[t], `rang ${TIERS[t].name}`);
  }
  // Bronze : le podium gagne beaucoup, les deux derniers perdent un peu
  assert.deepEqual(RP_TABLE[0], [30, 25, 20, 10, 6, 3, 0, 0, -5, -8]);
});

test('jamais mieux classé = moins de points, quel que soit le nombre de joueurs', () => {
  for (let t = 0; t < TIERS.length; t++) {
    for (let n = 2; n <= 16; n++) {
      const d = Array.from({ length: n }, (_, i) => rpDelta(t, i + 1, n));
      for (let i = 1; i < n; i++) assert.ok(d[i] <= d[i - 1], `rang ${t}, ${n} joueurs : ${d.join(' ')}`);
      assert.equal(d[0], RP_TABLE[t][0], 'le 1er garde ses points');
      assert.equal(d[n - 1], RP_TABLE[t][9], 'le dernier garde ses points');
    }
  }
});

test('plus on monte, moins on gagne et plus on perd', () => {
  for (let t = 1; t < TIERS.length; t++) {
    assert.ok(RP_TABLE[t][0] <= RP_TABLE[t - 1][0]);
    assert.ok(RP_TABLE[t][9] <= RP_TABLE[t - 1][9]);
  }
  assert.ok(Math.min(...RP_TABLE.flat()) >= -12, 'une mauvaise partie ne fait jamais perdre beaucoup');
});

test('part de la partie jouée et partie parfaite', () => {
  assert.equal(rpDelta(0, 1, 10, 0.4), 0, 'moins de la moitié jouée : rien');
  assert.equal(rpDelta(0, 1, 10, 0.5), 15);
  assert.equal(rpDelta(0, 1, 10, 1, true), 35);
  assert.equal(rpDelta(0, 1, 1), 0, 'seul : rien');
  assert.ok(!Object.is(rpDelta(4, 7, 10, 0.5), -0));
});

test('paliers progressifs : l’écart grandit à chaque rang', () => {
  const gaps = TIERS.slice(1).map((x, i) => x.min - TIERS[i].min);
  for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i] > gaps[i - 1], gaps.join(' '));
  assert.equal(tierOf(99), 0);
  assert.equal(tierOf(100), 1);
  assert.equal(tierOf(2249), 7);
  assert.equal(tierOf(2250), 8);
});

test('nouvelle saison : moitié des points, arrondie au palier', () => {
  assert.equal(softReset(1400), 700);   // Émeraude → Diamant
  assert.equal(softReset(2300), 1000);  // Grand Maître → Rubis
  assert.equal(softReset(300), 100);
  assert.equal(softReset(90), 0);
});

test('anciens points convertis : chacun garde son rang', () => {
  const OLD = [0, 100, 200, 300, 400, 500, 600, 700, 850];
  for (let t = 0; t < OLD.length; t++) {
    assert.equal(fromOldScale(OLD[t]), TIERS[t].min);
    assert.equal(tierOf(fromOldScale(OLD[t] + 49)), t);
  }
  assert.equal(tierOf(fromOldScale(849)), 7);
  assert.ok(fromOldScale(900) > TIERS[8].min);
});

test('salons publics : jamais plus d’un rang d’écart', () => {
  assert.deepEqual(windowsOf(0), [0]);
  assert.deepEqual(windowsOf(2), [1, 2]);
  assert.deepEqual(windowsOf(8), [7]);
  for (let t = 0; t < TIERS.length; t++) {
    for (const w of windowsOf(t)) {
      assert.ok(inWindow(t, w));
      const [a, b] = windowTiers(w);
      assert.ok(Math.abs(a - t) <= 1 && Math.abs(b - t) <= 1);
    }
  }
  assert.deepEqual(windowSkill(0), [0.25, 0.5]);
  const top = windowSkill(WINDOWS - 1);
  assert.ok(Math.abs(top[0] - 0.7) < 1e-9 && Math.abs(top[1] - 0.92) < 1e-9);
});

test('mode Classé : 4 catégories par saison, les mêmes toute la saison, qui changent d’un mois à l’autre', async () => {
  const { rankedCats, seasonRotation, RANKED_ROTATION, CAT_IDS } = await import('../src/catalog.js');
  if (!RANKED_ROTATION) assert.equal(rankedCats('2026-11').length, CAT_IDS.size - 1, 'rotation pas activée : toutes les catégories sauf Frissons (jamais classée)');
  const a = seasonRotation('2026-11'), b = seasonRotation('2026-11');
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, 4);
  assert.ok(a.every(x => CAT_IDS.has(x) && x !== 'mix'));
  const months = Array.from({ length: 12 }, (_, i) => seasonRotation(`2027-${String(i + 1).padStart(2, '0')}`).join());
  assert.ok(new Set(months).size >= 10, 'le tirage varie selon le mois');
  assert.deepEqual(rankedCats('2026-11', 'rock, rapfr ,inconnue'), ['rock', 'rapfr'], 'liste fixée pour les tests');
});
