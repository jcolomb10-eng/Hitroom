import test from 'node:test';
import assert from 'node:assert/strict';
import { judge, lev } from '../src/match.js';

const song = (t, a) => ({ t: [].concat(t), a: [].concat(a) });
const ok = (input, s, title, artist) => {
  const r = judge(input, s);
  assert.equal(r.title, title, `titre pour « ${input} »`);
  assert.equal(r.artist, artist, `artiste pour « ${input} »`);
};

test('distance avec inversion', () => {
  assert.equal(lev('beleive', 'believe'), 1);
  assert.equal(lev('abc', 'abc'), 0);
  assert.equal(lev('', 'abc'), 3);
});

test('titre exact, accents et casse', () => {
  const s = song("Je l'aime à mourir", 'Francis Cabrel');
  ok("je l'aime a mourir", s, true, false);
  ok('JE LAIME A MOURIR', s, true, false);
  ok('je laime a mourire', s, true, false);
});

test('artiste : nom complet, faute, nom de famille', () => {
  const s = song('Comme toi', 'Jean-Jacques Goldman');
  ok('jean jacques goldman', s, false, true);
  ok('jean-jaques goldman', s, false, true);
  ok('goldman', s, false, true);
  ok('jean', s, false, false);
});

test('saisie partielle du titre', () => {
  const s = song("Pour que tu m'aimes encore", 'Céline Dion');
  ok("pour que tu m'aimes", s, true, false);
  ok('pour que', s, false, false);
});

test('artiste et titre tapés ensemble', () => {
  const s = song('Billie Jean', 'Michael Jackson');
  ok('michael jackson billie jean', s, true, true);
  ok('billie jean michael jackson', s, true, true);
  ok('billie jean', s, true, false);
});

test('variantes acceptées', () => {
  const s = song(['Blue', 'Da Ba Dee'], 'Eiffel 65');
  ok('da ba dee', s, true, false);
  ok('eiffel 65', s, false, true);
  ok('eifel 65', s, false, true);
  const g = song('Bella', ['Gims', 'Maître Gims']);
  ok('maitre gims', g, false, true);
  ok('gims', g, false, true);
});

test('pas de faux positifs sur les titres courts', () => {
  const s = song('Stay', 'The Kid LAROI');
  ok('stan', s, false, false);
  ok("stayin alive", s, false, false);
  ok('kid laroi', s, false, true);
  const h = song('Happy', 'Pharrell Williams');
  ok('hapy', h, true, false);
  ok('ha', h, false, false);
});

test('symboles et noms particuliers', () => {
  ok('acdc', song('Back in Black', 'AC/DC'), false, true);
  ok('ac dc', song('Back in Black', 'AC/DC'), false, true);
  ok('aha', song('Take On Me', 'a-ha'), false, true);
  ok('bigflo et oli', song('Dommage', 'Bigflo & Oli'), false, true);
  ok('beyonce', song('Crazy in Love', 'Beyoncé'), false, true);
  ok('believe', song('Believe', 'Cher'), true, false);
  ok('beleive', song('Believe', 'Cher'), true, false);
});

test('« tu brûles »', () => {
  const r = judge('michel jakson', song('Billie Jean', 'Michael Jackson'));
  assert.ok(r.artist || r.near >= 0.6);
  assert.ok(judge('zzzz', song('Billie Jean', 'Michael Jackson')).near < 0.5);
});
