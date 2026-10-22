import test from 'node:test';
import assert from 'node:assert/strict';
import { parisDay, dayAdd, hitNumber, hitCandidates, seededRnd, streaks, friendCode, AT_RE, CLUB_EMBLEMS, HIT_POOL } from '../src/social.js';

test('Hit du jour : le jour change à minuit heure de Paris', () => {
  assert.equal(parisDay(new Date('2026-10-22T21:59:00Z')), '2026-10-22'); // 23 h 59 à Paris (heure d'été)
  assert.equal(parisDay(new Date('2026-10-22T22:01:00Z')), '2026-10-23');
  assert.equal(parisDay(new Date('2026-12-31T23:30:00Z')), '2027-01-01'); // heure d'hiver : UTC+1
  assert.equal(dayAdd('2026-10-31', 1), '2026-11-01');
  assert.equal(dayAdd('2027-01-01', -1), '2026-12-31');
});

test('Hit du jour : numéro (22 octobre 2026 = n° 1), passage à l’heure d’hiver compris', () => {
  assert.equal(hitNumber('2026-10-22'), 1);
  assert.equal(hitNumber('2026-10-25'), 4);
  assert.equal(hitNumber('2026-10-26'), 5);
  assert.equal(hitNumber('2027-10-22'), 366);
});

test('Hit du jour : candidats tirés d’après la date, toujours dans le même ordre, parmi les plus connus', () => {
  const a = hitCandidates('2026-11-03'), b = hitCandidates('2026-11-03'), c = hitCandidates('2026-11-04');
  assert.deepEqual(a.map(s => s.k), b.map(s => s.k));
  assert.notDeepEqual(a.slice(0, 10).map(s => s.k), c.slice(0, 10).map(s => s.k));
  assert.equal(new Set(a.map(s => s.k)).size, a.length, 'pas de doublon');
  assert.ok(a.length > 300 && a.length <= 12 * HIT_POOL);
  assert.ok(a.every(s => s.cat && s.cat !== 'mix'));
  assert.ok(a.some(s => s.fr) && a.some(s => !s.fr));
  const r1 = seededRnd('x'), r2 = seededRnd('x');
  assert.deepEqual([r1(), r1(), r1()], [r2(), r2(), r2()]);
});

test('Hit du jour : séries de jours (la série continue jusqu’à minuit le lendemain)', () => {
  assert.deepEqual(streaks([], '2026-10-22'), { cur: 0, best: 0 });
  assert.deepEqual(streaks(['2026-10-22', '2026-10-21', '2026-10-20'], '2026-10-22'), { cur: 3, best: 3 });
  assert.deepEqual(streaks(['2026-10-21', '2026-10-20'], '2026-10-22'), { cur: 2, best: 2 }); // pas encore joué aujourd'hui
  assert.deepEqual(streaks(['2026-10-20', '2026-10-19'], '2026-10-22'), { cur: 0, best: 2 }); // série cassée hier
  assert.deepEqual(streaks(['2026-10-22', '2026-10-15', '2026-10-14', '2026-10-13', '2026-10-12'], '2026-10-22'), { cur: 1, best: 4 });
  assert.deepEqual(streaks(['2026-11-01', '2026-10-31'], '2026-11-01'), { cur: 2, best: 2 }); // changement de mois
});

test('amis : code ami de 6 caractères lisibles, le même pour le même joueur', () => {
  const c = friendCode('a3f9c2e81b4d');
  assert.match(c, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(friendCode('a3f9c2e81b4d'), c);
  assert.notEqual(friendCode('a3f9c2e81b4d', 1), c);
  assert.notEqual(friendCode('b3f9c2e81b4d'), c);
});

test('amis : seuls les lieux prévus sont acceptés (code du salon visible par les amis)', () => {
  for (const ok of ['menu', 'hit', 'solo', 'ranked:rapfr', 'open:80', 'priv:AB2C', 'duel:XYZ9']) assert.match(ok, AT_RE);
  for (const ko of ['', 'priv:abcd', 'priv:ABCDE', 'ranked:<b>', 'menu ', 'salon:ABCD']) assert.doesNotMatch(ko, AT_RE);
});

test('clubs : 24 emblèmes différents', () => {
  assert.equal(new Set(CLUB_EMBLEMS).size, 24);
});
