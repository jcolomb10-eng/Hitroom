// « Écouter sur Deezer » et « Mes découvertes » (version 1.12) de bout en bout (wrangler dev en local avec MOCK_MUSIC=1)
// NODE_PATH=$(npm root -g) node test/e2e-decouvertes.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 1 min)
// bouton Écouter et cœur à la révélation, onglet « Morceaux » en fin de partie, Profil → Mes découvertes (récents, favoris),
// conservé après rechargement
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const errors = [];

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  page.on('dialog', d => d.accept());
  page.on('pageerror', e => errors.push(e.message));
  const state = () => page.evaluate(() => ({ S: JSON.parse(localStorage.getItem('hitroom.v1')), D: JSON.parse(localStorage.getItem('hitroom.disc') || '[]') }));
  await page.goto(BASE + '/');
  await page.click('#loginGuest');
  await page.fill('#onbName', 'Mélomane');
  await page.click('#onbGo');
  await page.waitForSelector('#v-home:not(.hide)');

  // partie solo de 5 manches : tout trouver pour aller vite
  await page.click('#bSolo');
  await page.click('#soloLvl [data-l="0"]');
  await page.click('[data-c="variete"]');
  await page.click('#catsOk');
  await page.waitForSelector('#v-game:not(.hide)');
  for (let round = 1; round <= 5; round++) {
    await page.waitForFunction(r => document.querySelector('#gameTitle').innerText.includes(`Manche ${r}/`) &&
      document.querySelector('#reveal').classList.contains('hide') && document.querySelector('#gOverlay').classList.contains('hide'), round, { timeout: 40000 });
    await sleep(1800);
    const m = (await page.$eval('#audio', a => a.src)).match(/__mock\/a\/(.+)\.wav/);
    const [artist, title] = decodeURIComponent(m[1]).split('|');
    if (round !== 2) { await page.fill('#guessIn', title); await page.press('#guessIn', 'Enter'); await sleep(150); }
    await page.fill('#guessIn', artist); await page.press('#guessIn', 'Enter');
    if (round === 1) {
      // révélation : bouton Écouter et cœur
      await page.waitForSelector('#reveal:not(.hide) #rvFav', { timeout: 30000 });
      const lsn = await page.$eval('#reveal .lsn', a => ({ txt: a.textContent, href: a.href, tgt: a.target }));
      ok(lsn.txt.includes('Écouter sur Deezer') && lsn.href.includes('deezer.com') && lsn.tgt === '_blank', `révélation : bouton « ${lsn.txt} » vers Deezer (nouvel onglet)`);
      ok((await page.textContent('#rvFav')) === '🤍', 'révélation : cœur vide au départ');
      await page.click('#rvFav');
      ok((await page.textContent('#rvFav')) === '❤️' && (await state()).S.favs.length === 1, 'révélation : ❤️ ajoute le morceau aux favoris');
      await page.screenshot({ path: `${OUT}/d01_revelation.png` });
    }
  }
  await page.waitForSelector('#v-end:not(.hide)', { timeout: 40000 });
  await sleep(800);
  const { D } = await state();
  ok(D.length === 5 && D.every(d => d.t && d.a && d.link), `historique : les 5 morceaux de la partie notés (${D.length})`);
  ok(D[D.length - 1].f === 3 && D[D.length - 2].f === 2, 'historique : ce que j’ai trouvé (manche 1 : tout, manche 2 : artiste)');

  // fin de partie : onglet Morceaux, dans l'ordre de la partie
  await page.click('[data-et="songs"]');
  const songs = await page.$$eval('#endSongs .song', s => s.map(x => ({ t: x.querySelector('b').textContent, fav: x.querySelector('.fav').textContent, lsn: !!x.querySelector('.lsn') })));
  ok(songs.length === 5 && songs.every(s => s.lsn), 'fin de partie : onglet « Morceaux » avec les 5 morceaux et Écouter');
  ok(songs[0].t === D[4].t && songs[0].fav === '❤️' && songs.slice(1).every(s => s.fav === '🤍'), 'fin de partie : dans l’ordre joué, le 1er déjà en favori');
  await page.click('#endSongs .song:nth-child(3) .fav');
  ok((await state()).S.favs.length === 2, 'fin de partie : 2e favori ajouté');
  await page.screenshot({ path: `${OUT}/d02_fin_morceaux.png` });

  // Profil → Mes découvertes
  await page.click('#endHome');
  await page.waitForSelector('#v-home:not(.hide)');
  await page.click('#tabbar [data-tab="profile"]');
  await page.waitForSelector('#profDisc');
  ok((await page.textContent('#profDisc')).includes('5 morceaux • 2 ❤️'), 'profil : « Mes découvertes : 5 morceaux • 2 ❤️ »');
  await page.click('#profDisc');
  ok((await page.$$('#discList .song')).length === 5, 'découvertes : 5 morceaux récents');
  await page.screenshot({ path: `${OUT}/d03_decouvertes.png` });
  await page.click('[data-dc="favs"]');
  ok((await page.$$('#discList .song')).length === 2 && (await page.textContent('#discList')).includes('ajouté le'), 'découvertes : onglet Favoris (2)');
  await page.click('#discList .song:first-child .fav');
  ok((await state()).S.favs.length === 1, 'découvertes : retirer un favori');
  await page.click('#sheet [data-close]');
  ok((await page.textContent('#profDisc')).includes('1 ❤️'), 'profil mis à jour (1 ❤️)');

  // après rechargement : tout est gardé
  await page.reload();
  await page.waitForSelector('#v-home:not(.hide)');
  await page.click('#tabbar [data-tab="profile"]');
  ok((await page.textContent('#profDisc')).includes('5 morceaux • 1 ❤️'), 'après rechargement : historique et favoris gardés');
  await page.click('#profDisc');
  await page.click('[data-dc="favs"]');
  ok((await page.$$('#discList .song')).length === 1, 'après rechargement : 1 favori');

  ok(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failures ? `${failures} échec(s)` : 'Tout est bon');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
