import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIAL, weekKey, isWeekend, eventState, tourState, inTour, eventOfWeek, prevSeason, monthName, topCoins, EVENTS } from '../src/extras.js';
import { CATS, catOpen } from '../src/catalog.js';

test('semaine : le lundi, week-end samedi et dimanche', () => {
  assert.equal(weekKey('2026-10-22'), '2026-10-19'); // jeudi
  assert.equal(weekKey('2026-10-25'), '2026-10-19'); // dimanche
  assert.equal(weekKey('2026-10-26'), '2026-10-26');
  assert.ok(isWeekend('2026-10-24') && isWeekend('2026-10-25'));
  assert.ok(!isWeekend('2026-10-23') && !isWeekend('2026-10-26'));
});
test('événement : lun-mer terminé, jeu-ven à venir, sam-dim en cours', () => {
  assert.equal(eventState('2026-10-26').state, 'done');
  assert.equal(eventState('2026-10-26').wk, '2026-10-19');
  assert.equal(eventState('2026-10-22').state, 'soon');
  assert.equal(eventState('2026-10-24').state, 'live');
  assert.equal(eventState('2026-10-25').ev.id, eventState('2026-10-22').ev.id); // même événement toute la semaine
  assert.notEqual(eventOfWeek('2026-10-19').id, eventOfWeek('2026-10-26').id);
});
test('chaque événement a une catégorie qui existe', () => {
  for (const e of EVENTS) assert.ok(CATS.some(c => c.id === e.cat), e.id);
});
test('tournoi : samedi 20 h - 22 h', () => {
  assert.equal(tourState('2026-10-22', 600), 'soon');
  assert.equal(tourState('2026-10-24', 19 * 60), 'soon');
  assert.equal(tourState('2026-10-24', 20 * 60), 'live');
  assert.equal(tourState('2026-10-24', 22 * 60), 'done');
  assert.equal(tourState('2026-10-25', 21 * 60), 'done');
  assert.ok(inTour('2026-10-24', 21 * 60) && !inTour('2026-10-25', 21 * 60) && !inTour('2026-10-24', 23 * 60));
});
test('saison précédente et récompenses', () => {
  assert.equal(prevSeason('2026-11'), '2026-10');
  assert.equal(prevSeason('2027-01'), '2026-12');
  assert.equal(monthName('2026-10'), 'octobre 2026');
  assert.deepEqual([1, 10, 11, 50, 51, 100].map(topCoins), [1000, 1000, 500, 500, 250, 250]);
});
test('Halloween : événement de 48 h, du vendredi 30 octobre à midi au dimanche 1er novembre à midi', () => {
  const h = SPECIAL['2026-10-26'];
  assert.equal(h.to - h.from, 48 * 3600 * 1000);
  const st = iso => eventState(iso.slice(0, 10), new Date(iso)).state;
  assert.equal(st('2026-10-30T10:59:00Z'), 'soon');
  assert.equal(st('2026-10-30T11:00:00Z'), 'live');
  assert.equal(st('2026-11-01T10:59:00Z'), 'live');
  assert.equal(st('2026-11-01T11:00:00Z'), 'done');
});
test('Halloween : le week-end du 31 octobre 2026 a son événement', () => {
  assert.equal(weekKey('2026-10-31'), '2026-10-26');
  const e = eventState('2026-10-31');
  assert.equal(e.state, 'live');
  assert.equal(e.ev.id, 'ehallo');
  assert.equal(eventState('2026-10-29').state, 'soon');
  assert.ok(CATS.some(c => c.id === SPECIAL['2026-10-26'].cat));
  assert.ok(/^[a-z0-9-]{1,24}$/.test(`h-ev-${e.ev.id}-261026`));
});
test('Frissons : playlist secrète jusqu’au vendredi 30 octobre à midi, ouverte en local', () => {
  assert.equal(catOpen('frissons', {}, Date.parse('2026-10-30T10:59:00Z')), false);
  assert.equal(catOpen('frissons', {}, Date.parse('2026-10-30T11:00:00Z')), true);
  assert.equal(catOpen('rock', {}, 0), true);
  assert.equal(catOpen('frissons', { MOCK_MUSIC: '1' }, 0), true);
  assert.equal(catOpen('frissons', { MOCK_MUSIC: '1', FRISSONS_LOCK: '1' }, 0), false);
});
