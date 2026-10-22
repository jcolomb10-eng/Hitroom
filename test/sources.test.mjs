import test from 'node:test';
import assert from 'node:assert/strict';
import { itunesFind, deezerFind, deezerPreview } from '../src/sources.js';

const song = { k: 'daft punk|one more time', t: ['One More Time'], a: ['Daft Punk'] };
const fake = answers => async (src, url) => {
  for (const [re, data] of answers) if (re.test(url)) { if (data instanceof Error) throw data; return data; }
  return {};
};

test('iTunes : extrait, pochette 600 px et lien', async () => {
  const r = await itunesFind(fake([[/itunes/, { results: [{ kind: 'song', trackId: 1, artistName: 'Daft Punk', trackName: 'One More Time', previewUrl: 'https://a/p.m4a', artworkUrl100: 'https://img/x/100x100bb.jpg', trackViewUrl: 'https://music' }] }]]), song);
  assert.deepEqual(r, { ok: 1, src: 'it', ext: '1', url: 'https://a/p.m4a', art: 'https://img/x/600x600bb.jpg', link: 'https://music' });
});

test('Deezer : format de réponse converti, deuxième recherche si la première est vide', async () => {
  const hit = { id: 3135556, title: 'One More Time', preview: 'https://cdnt-preview.dzcdn.net/x.mp3?hdnea=exp=1', link: 'https://www.deezer.com/track/3135556',
    artist: { name: 'Daft Punk' }, album: { title: 'Discovery', cover_big: 'https://cdn/cover.jpg' } };
  // recherche simple vide, recherche avancée « artist: » en secours
  const r = await deezerFind(fake([[/artist%3A/, { data: [hit] }], [/search/, { data: [] }]]), song);
  assert.equal(r.src, 'dz');
  assert.equal(r.ext, '3135556');
  assert.equal(r.art, 'https://cdn/cover.jpg');
  assert.equal(await deezerPreview(fake([[/track\/3135556/, { preview: 'https://frais.mp3' }]]), '3135556'), 'https://frais.mp3');
});

test('aucun résultat reconnu : null ; erreur réseau : remontée', async () => {
  assert.equal(await deezerFind(fake([[/search/, { data: [{ id: 1, title: 'Autre chose', artist: { name: 'Quelqu’un' }, preview: 'x' }] }]]), song), null);
  await assert.rejects(itunesFind(fake([[/itunes/, new Error('HTTP 403')]]), song), /403/);
});
