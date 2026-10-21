import test from 'node:test';
import assert from 'node:assert/strict';
import { judge, lev, allowed } from '../src/match.js';

const song = (t, a) => ({ t: [].concat(t), a: [].concat(a) });
// live = pendant la frappe (réponse exacte), enter = Entrée appuyée (petites fautes tolérées)
const check = (input, s, title, artist, mode = 'live') => {
  const r = judge(input, s, mode === 'enter');
  assert.equal(r.title, title, `titre pour « ${input} » (${mode})`);
  assert.equal(r.artist, artist, `artiste pour « ${input} » (${mode})`);
};

test('distance et fautes tolérées selon la longueur', () => {
  assert.equal(lev('beleive', 'believe'), 1);
  assert.equal(lev('', 'abc'), 3);
  assert.deepEqual([3, 4, 5, 8, 9, 14, 15].map(allowed), [0, 0, 1, 1, 2, 2, 3]);
});

test('un début de mot ne suffit jamais (« tchi » pour Tchikita)', () => {
  const s = song('Tchikita', 'Jul');
  for (const t of ['tchi', 'tchik', 'tchiki', 'tchikit']) {
    check(t, s, false, false, 'live');
  }
  check('tchi', s, false, false, 'enter');
  check('tchikita', s, true, false, 'live');
  check('TCHIKITA', s, true, false, 'live');
  check('tchikitta', s, false, false, 'live');
  check('tchikitta', s, true, false, 'enter');
  check('jul', s, false, true, 'live');
});

test('titre en entier : accents, majuscules et ponctuation ignorés', () => {
  const s = song("Je l'aime à mourir", 'Francis Cabrel');
  check("je l'aime a mourir", s, true, false);
  check('JE LAIME A MOURIR', s, true, false);
  check('je laime a mourire', s, false, false, 'live');
  check('je laime a mourire', s, true, false, 'enter');
  check("pour que tu m'aimes", song("Pour que tu m'aimes encore", 'Céline Dion'), false, false, 'enter');
});

test('artiste en entier, pas le nom de famille seul', () => {
  const s = song('Comme toi', 'Jean-Jacques Goldman');
  check('jean jacques goldman', s, false, true);
  check('jean-jaques goldman', s, false, true, 'enter');
  check('goldman', s, false, false, 'enter');
  check('jean', s, false, false, 'enter');
});

test('artiste et titre tapés ensemble', () => {
  const s = song('Billie Jean', 'Michael Jackson');
  check('michael jackson billie jean', s, true, true);
  check('billie jean michael jackson', s, true, true);
  check('micheal jackson bilie jean', s, true, true, 'enter');
  check('billie jean', s, true, false);
});

test('variantes du catalogue et articles', () => {
  check('da ba dee', song(['Blue', 'Da Ba Dee'], 'Eiffel 65'), true, false);
  check('eifel 65', song('Blue', 'Eiffel 65'), false, true, 'enter');
  check('maitre gims', song('Bella', ['Gims', 'Maître Gims']), false, true);
  check('weeknd', song('Blinding Lights', 'The Weeknd'), false, true);
  check('the weeknd', song('Blinding Lights', 'The Weeknd'), false, true);
});

test('mots très courts : aucune faute tolérée, pas de raccourci', () => {
  const s = song('Stay', 'The Kid LAROI');
  check('stan', s, false, false, 'enter');
  check('stayin alive', s, false, false, 'enter');
  check('ha', song('Take On Me', 'a-ha'), false, false, 'enter');
  check('aha', song('Take On Me', 'a-ha'), false, true);
  check('a-ha', song('Take On Me', 'a-ha'), false, true);
  check('le sud', song('Le Sud', 'Nino Ferrer'), true, false);
  check('sud', song('Le Sud', 'Nino Ferrer'), false, false, 'enter');
});

test('symboles et noms particuliers', () => {
  check('acdc', song('Back in Black', 'AC/DC'), false, true);
  check('ac dc', song('Back in Black', 'AC/DC'), false, true);
  check('bigflo et oli', song('Dommage', 'Bigflo & Oli'), false, true);
  check('beyonce', song('Crazy in Love', 'Beyoncé'), false, true);
  check('beleive', song('Believe', 'Cher'), true, false, 'enter');
  check('beleive', song('Believe', 'Cher'), false, false, 'live');
});

test('« tu brûles » quand on est proche', () => {
  assert.ok(judge('michel jakson', song('Billie Jean', 'Michael Jackson')).near >= 0.6);
  assert.ok(judge('zzzz', song('Billie Jean', 'Michael Jackson')).near < 0.5);
});
