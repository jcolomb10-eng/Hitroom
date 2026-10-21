import test from 'node:test';
import assert from 'node:assert/strict';
import { pickBest } from '../src/itunes.js';
import { CATS, songsOf } from '../src/catalog.js';

// résultats au format de l'API iTunes Search
const r = (artistName, trackName, collectionName = 'Album') => ({
  kind: 'song', artistName, trackName, collectionName,
  previewUrl: `https://audio-ssl.itunes.apple.com/${encodeURIComponent(trackName)}.m4a`,
  artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/x/100x100bb.jpg',
});
const song = (t, a) => ({ t: [].concat(t), a: [].concat(a) });

test('prend la version originale plutôt que remix, live ou karaoké', () => {
  const res = [
    r('Daft Punk', 'Get Lucky (Radio Edit) [feat. Pharrell Williams & Nile Rodgers]'),
    r('Karaoke Hits Band', 'Get Lucky (Karaoke Version)', 'Karaoke Hits 2013'),
    r('Daft Punk', 'Get Lucky (feat. Pharrell Williams & Nile Rodgers)', 'Random Access Memories'),
    r('Daft Punk', 'Get Lucky (Live)', 'Alive'),
  ];
  assert.equal(pickBest(res, song('Get Lucky', ['Daft Punk', 'Pharrell Williams'])).collectionName, 'Random Access Memories');
});

test('titres avec parenthèses, remasters et artistes en duo', () => {
  const s = song(['Sweet Dreams', 'Sweet Dreams (Are Made of This)'], 'Eurythmics');
  assert.ok(pickBest([r('Eurythmics, Annie Lennox & Dave Stewart', 'Sweet Dreams (Are Made of This) [Remastered]')], s));
  assert.ok(pickBest([r('Mark Ronson', 'Uptown Funk (feat. Bruno Mars)')], song('Uptown Funk', ['Mark Ronson', 'Bruno Mars'])));
  assert.ok(pickBest([r('Dick Dale & His Del-Tones', 'Misirlou')], song('Misirlou', 'Dick Dale')));
  assert.ok(pickBest([r('GIMS', 'Bella')], song('Bella', ['Gims', 'Maître Gims'])));
});

test('titres coréens avec version latine entre parenthèses', () => {
  assert.ok(pickBest([r('BLACKPINK', '뚜두뚜두 (DDU-DU DDU-DU)')], song(['DDU-DU DDU-DU', 'Ddu du ddu du'], 'BLACKPINK')));
});

test('refuse un autre artiste ou un autre titre', () => {
  assert.equal(pickBest([r('Sam Smith', 'Stay With Me')], song('Stay', 'The Kid LAROI')), null);
  assert.equal(pickBest([r('Booba', 'Validée')], song('DKR', 'Booba')), null);
  assert.equal(pickBest([{ ...r('Queen', 'Bohemian Rhapsody'), previewUrl: '' }], song('Bohemian Rhapsody', 'Queen')), null);
});

test('catalogue : chaque catégorie a assez de morceaux, sans ligne cassée', () => {
  for (const c of CATS) {
    const list = songsOf(c.id);
    assert.ok(list.length >= 25, `${c.id} : ${list.length} morceaux`);
    for (const s of list) {
      assert.ok(s.t[0] && s.a[0], `ligne incomplète dans ${c.id}`);
      assert.ok(!s.t.concat(s.a).some(x => x.includes('|')), `séparateur en trop : ${s.k}`);
    }
  }
});

test('salon Premium : jusqu’à 3 catégories mélangées, sans doublon', () => {
  const rock = songsOf('rock'), s80 = songsOf('80'), mixed = songsOf('rock+80');
  const keys = new Set([...rock, ...s80].map(s => s.k));
  assert.equal(mixed.length, keys.size);
  assert.equal(new Set(mixed.map(s => s.k)).size, mixed.length);
  assert.ok(mixed.length > rock.length && mixed.length > s80.length);
  assert.equal(songsOf('inconnue+autre').length, songsOf('mix').length, 'catégories inconnues : tout le catalogue');
});
