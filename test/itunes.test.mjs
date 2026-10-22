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

// résultats au format Deezer converti (avec la popularité « rank »)
const dz = (artistName, trackName, rank, collectionName = 'Album') => ({ ...r(artistName, trackName, collectionName), rank });

test('refuse les imitateurs et les titres plus courts', () => {
  assert.equal(pickBest([r("Hello I'm Adele", 'Rolling In The Deep')], song('Rolling in the Deep', 'Adele')), null);
  assert.equal(pickBest([r('Siam', 'Chandelier Bbop and Roksteadi Radio')], song('Chandelier', 'Sia')), null);
  assert.equal(pickBest([r('Gotye', 'Somebody (2024)')], song('Somebody That I Used to Know', 'Gotye')), null);
  assert.equal(pickBest([r('Shaggy', 'Angel Eyes')], song('Angel', 'Shaggy')), null);
  assert.equal(pickBest([r('Garou', 'La Belle Et La Bête')], song('Belle', 'Garou')), null);
  assert.equal(pickBest([r('Dalida', 'Jésus bambino')], song('Bambino', 'Dalida')), null);
  assert.ok(pickBest([r('Dick Dale and His Del-Tones', 'Misirlou')], song('Misirlou', 'Dick Dale')));
  assert.ok(pickBest([r('The Notorious B.I.G.', 'Juicy')], song('Juicy', 'Notorious B.I.G.')));
});

test('Deezer : la version la plus écoutée, sans remix ni « rendu célèbre par »', () => {
  const pick = (res, s) => pickBest(res, s).trackName;
  assert.equal(pick([
    dz('Daft Punk', 'One More Time (12 Mix)', 365353),
    dz('Daft Punk', 'One More Time', 896666, 'Discovery'),
    dz('Daft Punk', 'One More Time (Short Radio Edit)', 692551),
  ], song('One More Time', 'Daft Punk')), 'One More Time');
  assert.equal(pick([
    dz('Tragédie', 'Hey Oh, Pt. 2', 247185),
    dz('Tragédie', 'Hey Oh (Radio Edit)', 857278),
    dz('Tragédie', 'Hey Oh (feat. Willy William) (Ragga Remix)', 249283),
  ], song('Hey Oh', 'Tragédie')), 'Hey Oh (Radio Edit)');
  assert.equal(pick([
    dz('Elegance', "Vacances j'oublie tout (Maxi version)", 240063),
    dz('Karaoké Playback Français', "Vacances j'oublie tout (Rendu célèbre par Elegance)", 924977),
    dz('Elegance', "Vacances j'oublie tout (Version originale 1982)", 592524),
  ], song("Vacances j'oublie tout", 'Elegance')), "Vacances j'oublie tout (Version originale 1982)");
  assert.equal(pick([
    dz('Lady Gaga', 'Poker Face (Glam As You Radio Mix)', 490372, 'Poker Face (Remixes Part 1)'),
    dz('Lady Gaga', 'Poker Face', 234377, 'Poker Face (Remixes Part 1)'),
  ], song('Poker Face', 'Lady Gaga')), 'Poker Face');
  assert.equal(pick([
    dz('Gipsy Kings', 'Medley: Bamboleo, Volare, Djobi Djoba', 900000),
    dz('Gipsy Kings', 'Bamboléo', 700000),
  ], song('Bamboléo', 'Gipsy Kings')), 'Bamboléo');
  assert.equal(pick([
    dz('Bryan Adams', '(Everything I Do) I Do It For You (Live)', 400000, 'Bare Bones (Live)'),
    dz('Bryan Adams', '(Everything I Do) I Do It For You', 300000),
  ], song('(Everything I Do) I Do It for You', 'Bryan Adams')), '(Everything I Do) I Do It For You');
  // seulement des remix, un instrumental ou une version orchestre : introuvable plutôt que méconnaissable
  assert.equal(pickBest([dz('Don Omar', 'Danza Kuduro (Tiësto Remix)', 500000)], song('Danza Kuduro', 'Don Omar')), null);
  assert.equal(pickBest([dz('Lady Gaga', "Just Dance (HCCR'S Bambossa Main Mix)", 500000)], song('Just Dance', 'Lady Gaga')), null);
  assert.equal(pickBest([dz('MIKA', 'Elle Me Dit (Orchestra Version)', 500000)], song('Elle me dit', 'Mika')), null);
  // un live reste reconnaissable : gardé faute de mieux
  assert.equal(pick([dz('Coldplay', 'Viva La Vida (Live)', 500000, 'Live 2012')], song('Viva la Vida', 'Coldplay')), 'Viva La Vida (Live)');
  assert.equal(pick([dz('PNAU', 'x', 1), dz('Elton John', 'Cold Heart (PNAU Remix)', 500000)], song(['Cold Heart', 'Cold Heart (PNAU Remix)'], 'Elton John')), 'Cold Heart (PNAU Remix)');
  // un morceau du catalogue qui contient lui-même le mot n'est pas pénalisé
  assert.equal(pick([
    dz('Queen', 'Live Forever', 10),
  ], song('Live Forever', 'Queen')), 'Live Forever');
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
