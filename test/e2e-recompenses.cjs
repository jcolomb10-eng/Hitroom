// Récompenses de bout en bout (wrangler dev en local avec MOCK_MUSIC=1)
// NODE_PATH=$(npm root -g) node test/e2e-recompenses.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut)
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(BASE + '/');
  await page.click('#loginGuest');
  await page.fill('#onbName', 'Sarah');
  await page.click('#onbGo');
  await page.waitForSelector('#v-home:not(.hide)');
  const uid = await page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).uid);

  // progression simulée : médailles, titre de catégorie, route de saison au palier 16, rang Maître la saison passée
  await fetch(`${BASE}/__mock/saison?uid=${uid}&sc=2026-09&rp=1800`);
  await page.evaluate(() => {
    const S = JSON.parse(localStorage.getItem('hitroom.v1'));
    Object.assign(S.st, { games: 12, wins: 2, nA: 60, nT: 55, streak: 5, fast: 2500, perfect: 1, rounds: 120, cats: ['rock', '80', '90'], byCat: { rapfr: 120 } });
    S.road.xp = 16 * (S.road.sc < '2026-11' ? 100 : 500) + 50; // palier 16 (XP par palier : roadXp dans index.html)
    localStorage.setItem('hitroom.v1', JSON.stringify(S));
  });
  const coins0 = 200;
  await page.reload();
  await page.waitForSelector('#v-home:not(.hide)');
  await sleep(1500);
  await page.click('#sheetBox [data-close]').catch(() => {});
  const S1 = await page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')));
  console.log('médailles :', JSON.stringify(S1.medals), 'pièces', S1.coins, 'titres', S1.knownTitles.join(', '));
  ok(S1.medals.win === 1 && S1.medals.fire === 2 && S1.medals.flash === 2 && S1.medals.artist === 1, 'médailles débloquées au bon niveau');
  ok(S1.knownTitles.includes('c-rapfr') && S1.knownTitles.includes('r-maitre'), 'titres « Roi du Rap FR » et « Maître du son » débloqués');
  ok(S1.coins > coins0, `pièces des médailles et de la saison ajoutées (${S1.coins})`);
  await shot(page, 'r01_accueil_route');
  ok((await page.textContent('#homeRoad')).includes('Palier 16/30'), 'accueil : route de saison au palier 16');

  // profil, médailles, titre, vitrine, carte
  await page.click('[data-go="profile"]');
  await sleep(500);
  await shot(page, 'r02_profil');
  await page.click('[data-med="fire"]');
  await sleep(300);
  await shot(page, 'r03_medaille');
  await page.click('#sheetBox [data-close]');
  await page.click('#profTitle');
  await page.click('[data-t="c-rapfr"]');
  await sleep(300);
  ok((await page.textContent('#profTitle')).includes('Roi du Rap FR'), 'titre choisi : Roi du Rap FR');
  await page.click('#profShow');
  await page.click('#scGrid [data-m="fire"]');
  await page.click('#scGrid [data-m="flash"]');
  await page.click('#scOk');
  await page.click('#profCard');
  await sleep(300);
  await shot(page, 'r04_carte_joueur');
  await page.click('#sheetBox [data-close]');
  await page.goBack();

  // route de saison
  await page.click('#homeRoad');
  await sleep(400);
  await shot(page, 'r05_route');
  for (const n of [5, 15]) await page.click(`[data-claim-road="${n}"]`);
  const S2 = await page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')));
  ok(S2.avs.length === 1 && /^R\d\d$/.test(S2.avs[0]) && S2.titles.includes('fidele'), `route : avatar rare ${S2.avs[0]} et titre « Fidèle au poste » obtenus`);
  await page.goBack();

  // boutique : cadres de rang débloqués jusqu'à Maître, affichés tout seuls en classé (version 1.8 : plus à choisir)
  await page.click('[data-go="shop"]');
  await sleep(400);
  await page.click('[data-it="r8"]');
  ok((await page.textContent('#toast')).includes('Grand Maître'), 'cadre Grand Maître : rang pas atteint');
  await page.click('[data-it="r7"]');
  const t7 = await page.textContent('#toast'); // lu tout de suite : les messages de déblocage en file peuvent le remplacer
  await shot(page, 'r06_boutique_cadres');
  const fr7 = await page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).fr);
  ok(t7.includes('partie classée') && fr7 === 'def', `cadre Maître débloqué, pas à équiper : il s’affiche tout seul en classé (${fr7} : ${t7})`);
  await page.click('[data-kind="buy"][data-it="def"]');
  await page.goBack();

  // salon privé : pas de contour ni de titre de rang (parties amicales), titre de catégorie et vitrine acceptés
  await page.click('#bCreate');
  await page.click('#catsOk');
  await page.waitForSelector('#v-lobby:not(.hide)');
  await sleep(500);
  await shot(page, 'r07_salon_titre_cadre');
  const code = (await page.textContent('#lobbyCode')).trim();
  // un tricheur qui force le cadre Grand Maître sans avoir le rang
  const ws = new WebSocket(`ws://127.0.0.1:8787/api/salon/${code}/ws?uid=tricheur01&name=Tricheur&fr=r8&title=r-gm&show=win:4`);
  await sleep(800);
  const me = await page.evaluate(() => 0);
  const players = await page.$$eval('#lobbyPlayers .prow', r => r.map(x => x.outerHTML));
  const cheat = players.find(h => h.includes('Tricheur')) || '';
  ok(cheat && !cheat.includes('f-r8') && !cheat.includes('Grand'), 'serveur : ni cadre ni titre Grand Maître pour le tricheur');
  const mine = players.find(h => h.includes('Sarah')) || '';
  ok(!/f-r\d/.test(mine) && !mine.includes('Maître') && mine.includes('Roi du Rap FR'), 'salon privé : pas de contour ni de rang, titre « Roi du Rap FR » affiché');
  await page.click('#lobbyPlayers [data-pid]');
  await sleep(300);
  await shot(page, 'r08_carte_dans_salon');
  ws.close();
  await page.click('#sheetBox [data-close]');
  await page.goBack();

  // code de sauvegarde : récupération sur un autre téléphone
  await page.waitForSelector('#v-home:not(.hide)');
  await page.click('[data-go="profile"]');
  await page.click('#profSet');
  await page.click('#saveBtn');
  await sleep(4500); // laisse partir la sauvegarde
  const saveCode = (await page.textContent('#sheetBox .codein')).trim();
  await shot(page, 'r09_code_sauvegarde');
  console.log('code :', saveCode);
  const other = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  other.on('dialog', d => d.accept());
  await other.goto(BASE + '/');
  await other.click('#loginGuest');
  await other.fill('#onbName', 'Nouveau');
  await other.click('#onbGo');
  await other.waitForSelector('#v-home:not(.hide)');
  await other.click('[data-go="profile"]');
  await other.click('#profSet');
  await other.click('#saveBtn');
  await other.fill('#restoreIn', saveCode);
  await other.click('#restoreGo');
  await other.waitForTimeout(2500);
  await other.waitForSelector('#v-home:not(.hide)');
  const S3 = await other.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')));
  ok(S3.name === 'Sarah' && S3.uid === uid && S3.fr === 'def' && S3.avs.length === 1 && S3.knownTitles.includes('r-maitre'), 'progression récupérée sur l’autre téléphone (même joueur, titres, avatar rare)');

  ok(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
