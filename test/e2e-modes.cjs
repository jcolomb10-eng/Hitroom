// Version 1.8 de bout en bout (wrangler dev en local, .dev.vars : MOCK_MUSIC=1 et RANKED_CATS=rapfr,cine,2020,rock,electro,kpop)
// NODE_PATH=$(npm root -g) node test/e2e-modes.cjs   (captures dans SHOTS ; ≈ 2 min)
// page de connexion, barre d'onglets, musique, 4 modes, contours selon le mode, partie solo (pièces réduites)
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const WS = BASE.replace(/^http/, 'ws');
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const until = async (fn, ms, step = 200) => { for (let t = 0; t < ms; t += step) { if (await fn()) return true; await sleep(step); } return !!(await fn()); };
function client(path, q) {
  const ws = new WebSocket(`${WS}${path}?${new URLSearchParams(q)}`);
  const c = { ws, last: null, closed: null };
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.t === 'state') c.last = m; };
  ws.onclose = e => { c.closed = e.code; };
  return new Promise(res => { ws.onopen = () => res(c); ws.onerror = () => res(c); });
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')));
  const shot = name => page.screenshot({ path: `${OUT}/${name}.png` });

  // 1. connexion : écran d'accueil, comptes « bientôt », invité → pseudo et avatar → accueil
  await page.goto(BASE + '/');
  await page.waitForSelector('#v-login:not(.hide)');
  ok(await page.$eval('#tabbar', e => e.classList.contains('hide')), 'connexion : affichée au premier lancement, sans barre d’onglets');
  ok(await until(() => page.$eval('.login-mid .logo', i => i.complete && i.naturalWidth > 0), 4000), 'connexion : logo néon affiché');
  await shot('m01_connexion');
  await page.click('#loginGoogle');
  ok((await page.textContent('#toast')).includes('Bientôt'), 'Continuer avec Google : « bientôt »');
  await page.click('#loginGuest');
  await page.waitForSelector('#v-onb:not(.hide)');
  await page.fill('#onbName', 'Nina');
  await page.click('#onbGo');
  await page.waitForSelector('#v-home:not(.hide)');
  await sleep(800);
  await page.click('#sheetBox [data-close]').catch(() => {});
  ok((await state()).acct === 'guest', 'compte invité enregistré');
  await page.reload();
  await page.waitForSelector('#v-home:not(.hide)');
  ok(await page.$eval('#v-login', e => e.classList.contains('hide')), 'au lancement suivant : directement l’accueil');

  // 2. accueil : 4 modes, catégories classées de la saison, vidéo, musique
  ok(await until(() => page.$eval('#homeVid', v => !!v.currentSrc && !v.paused), 4000), 'accueil : vidéo de fond en lecture');
  const home = await page.textContent('#v-home');
  ok(['Classé', 'Non classé', 'Solo', 'Entre amis', 'Créer', 'Rejoindre'].every(t => home.includes(t)), 'accueil : Classé, Non classé, Solo, Entre amis (Créer, Rejoindre)');
  const chips = await page.$$eval('#bPlay .chips span', s => s.map(x => x.textContent));
  ok(chips.length === 6 && chips.includes('Rap FR') && chips.includes('Ciné & séries'), `catégories classées affichées (${chips.join(', ')})`);
  await shot('m02_accueil');
  const music0 = (await state()).set.music;
  await page.click('#homeMusic');
  ok((await state()).set.music === !music0 && (await page.getAttribute('#homeMusic', 'aria-label')).includes('Remettre'), 'bouton musique : coupe la musique (choix retenu)');
  await page.click('#homeMusic');

  // 3. barre d'onglets : changer d'onglet ne s'empile pas, Accueil ramène à l'accueil
  await page.click('[data-tab="shop"]');
  await page.click('[data-tab="profile"]');
  ok(await page.$eval('#v-profile', e => !e.classList.contains('hide')) && await page.$eval('[data-tab="profile"]', e => e.classList.contains('on')), 'onglets : Boutique puis Profil');
  await page.click('#profSet');
  ok(await page.$eval('#tabbar', e => e.classList.contains('hide')), 'réglages (depuis le Profil) : sans barre d’onglets');
  await page.goBack();
  await page.click('[data-tab="home"]');
  await page.waitForSelector('#v-home:not(.hide)');
  ok(true, 'onglet Accueil : retour à l’accueil');

  // 4. Classé : seulement les catégories de la saison ; le serveur refuse les autres
  await page.click('#bPlay');
  await sleep(500);
  const cats = await page.$$eval('#catsGrid .cat', b => b.map(x => x.dataset.c));
  ok(cats.length === 6 && !cats.includes('variete') && !cats.includes('mix'), `Classé : catégories de la saison seulement (${cats.join(',')})`);
  await page.goBack();
  const refused = await client('/api/public/variete/ws', { uid: 'refusmode01', name: 'X' });
  await sleep(500);
  ok(refused.ws.readyState !== 1 && !refused.last, 'serveur : catégorie pas classée cette saison refusée');
  await page.click('#bOpen');
  const nc = (await page.$$('#catsGrid .cat')).length;
  ok(nc === 13 || nc === 14, 'Non classé : toutes les catégories (13, plus Frissons quand le serveur l\'ouvre)');
  await page.goBack();

  // 5. contours : rang actuel en classé, contour choisi ailleurs, rang et titre de rang cachés hors classé
  const season = new Date().toISOString().slice(0, 7);
  await fetch(`${BASE}/__mock/saison?uid=contourmode01&sc=${season}&rp=1800`); // Maître
  const q = { uid: 'contourmode01', name: 'Gold', fr: 'or', title: 'r-maitre' };
  const ranked = await client('/api/public/electro/ws', q);
  const open = await client('/api/open/electro/ws', q);
  await until(() => ranked.last && open.last, 4000);
  const pr = ranked.last.players.find(p => p.name === 'Gold'), po = open.last.players.find(p => p.name === 'Gold');
  ok(ranked.last.ranked && pr.fr === 'r7' && pr.tier === 7 && pr.title === 'r-maitre', `classé : contour du rang actuel (${pr.fr}), rang et titre de rang visibles`);
  ok(!open.last.ranked && po.fr === 'or' && po.tier == null && po.title === '', `non classé : contour choisi (${po.fr}), ni rang ni titre de rang`);
  ranked.ws.close(); open.ws.close();

  // 6. solo : contre 3 bots, partie qui démarre seule, pièces réduites, pas de victoire comptée, « Rejouer »
  await page.click('#bSolo');
  await page.click('#soloLvl [data-l="0"]');
  await page.click('[data-c="rock"]');
  await shot('m03_solo');
  const before = await state();
  await page.click('#catsOk');
  await page.waitForSelector('#v-game:not(.hide)');
  await until(() => page.$eval('#gameTitle', e => e.innerText.includes('Manche 1/')), 15000);
  for (let round = 1; round <= 5; round++) {
    await page.waitForFunction(r => document.querySelector('#gameTitle').innerText.includes(`Manche ${r}/`) &&
      document.querySelector('#reveal').classList.contains('hide') && document.querySelector('#gOverlay').classList.contains('hide'), round, { timeout: 40000 });
    await sleep(600);
    const m = (await page.$eval('#audio', a => a.src)).match(/__mock\/a\/(.+)\.wav/);
    const [artist, title] = decodeURIComponent(m[1]).split('|');
    if (round % 2) { await page.fill('#guessIn', title); await page.press('#guessIn', 'Enter'); await sleep(150); }
    await page.fill('#guessIn', artist); await page.press('#guessIn', 'Enter');
  }
  await page.waitForSelector('#v-end:not(.hide)', { timeout: 40000 });
  await sleep(1000);
  await shot('m04_fin_solo');
  const after = await state();
  const endFull = await page.$$eval('#endFull .rr', r => r.length);
  const myScore = +(await page.textContent('#myrow em')).replace(/\D/g, '');
  const expected = Math.round((5 + Math.floor(myScore / 10)) / 2);
  ok(endFull === 4 && (await page.textContent('#endFull')).split('🤖').length - 1 === 3, 'solo : 3 bots, marqués 🤖');
  const gain = +((await page.textContent('#endRecap')).match(/\+(\d+) pièces/) || [])[1]; // gain de la partie (les médailles débloquées s'y ajoutent à part)
  ok(gain === expected && (await page.textContent('#endRecap')).includes('solo : réduites'), `solo : pièces réduites (+${gain}, attendu +${expected} pour ${myScore} pts)`);
  ok(after.st.wins === before.st.wins && !after.day.top5, 'solo : ni victoire ni top 5 comptés');
  ok((await page.textContent('#rankBox')).includes('Partie solo') && (await page.textContent('#endNew')).includes('Rejouer'), 'fin de partie solo : message et bouton « Rejouer »');
  const board = await (await fetch(`${BASE}/api/board?sc=all&uid=${after.uid}`)).json();
  ok(!board.me, 'solo : points pas comptés dans le classement « Tous les temps »');
  await page.click('#endNew');
  ok(await until(() => page.$eval('#v-game', e => !e.classList.contains('hide')), 6000), '« Rejouer » : nouvelle partie solo');
  await page.click('#gameBack').catch(() => {});
  await page.goto(BASE + '/');
  await page.waitForSelector('#v-home:not(.hide)');

  ok(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failures ? `${failures} échec(s)` : 'Tout est bon');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
