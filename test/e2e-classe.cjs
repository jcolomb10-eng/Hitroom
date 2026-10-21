// Partie classée de bout en bout (wrangler dev en local avec MOCK_MUSIC=1, parties publiques de 5 manches de 15 s)
// NODE_PATH=$(npm root -g) node test/e2e-classe.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut)
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(14, 23), ...a);
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(BASE + '/');
  await page.fill('#onbName', 'Lucas');
  await page.click('#onbGo');
  await page.waitForSelector('#v-home:not(.hide)');
  await sleep(500);
  ok((await page.textContent('#homeLvl')).includes('Bronze'), 'accueil : rang Bronze affiché');

  await page.click('#bPlay');
  ok((await page.textContent('#catsSub')).includes('Bronze – Argent'), 'catégories : partie classée contre Bronze – Argent');
  await page.click('[data-c="rapfr"]');
  await page.screenshot({ path: OUT + '/c01_categories_classe.png' });
  await page.click('#catsOk');
  await page.waitForSelector('#v-game:not(.hide)');

  const answer = async () => {
    const m = (await page.$eval('#audio', a => a.src)).match(/__mock\/a\/(.+)\.wav/);
    const [artist, title] = decodeURIComponent(m[1]).split('|');
    return { artist, title };
  };
  const has = async (sel, cls) => page.$eval(sel, (e, c) => e.classList.contains(c), cls);

  for (let round = 1; round <= 5; round++) {
    await page.waitForFunction(r => document.querySelector('#gameTitle').innerText.includes(`Manche ${r}/`) &&
      document.querySelector('#reveal').classList.contains('hide') && document.querySelector('#gOverlay').classList.contains('hide'), round, { timeout: 40000 });
    await sleep(900);
    const a = await answer();
    log(`manche ${round} : ${a.title} — ${a.artist}`);
    const inp = '#guessIn';
    if (round === 1) {
      const start = a.title.slice(0, Math.max(3, Math.ceil(a.title.length / 2)));
      await page.fill(inp, '');
      await page.type(inp, start, { delay: 60 });
      await sleep(800);
      ok(!(await has('#fT', 'ok')), `début du titre « ${start} » refusé pendant la frappe`);
      await page.type(inp, a.title.slice(start.length), { delay: 60 });
      await sleep(800);
      ok(await has('#fT', 'ok'), 'titre complet accepté sans Entrée');
    } else if (round === 2) {
      const w = a.artist;
      const typo = w.length >= 5 ? w.slice(0, 2) + w[3] + w[2] + w.slice(4) : w;
      await page.fill(inp, '');
      await page.type(inp, typo, { delay: 60 });
      await sleep(800);
      if (typo !== w) ok(!(await has('#fA', 'ok')), `artiste avec faute « ${typo} » refusé pendant la frappe`);
      await page.press(inp, 'Enter');
      await sleep(800);
      ok(await has('#fA', 'ok'), 'artiste avec faute accepté avec Entrée');
      await page.screenshot({ path: OUT + '/c02_partie_classee.png' });
    } else {
      await page.fill(inp, '');
      await page.type(inp, `${a.artist} ${a.title}`, { delay: 25 });
      await sleep(800);
      ok((await has('#fA', 'ok')) && (await has('#fT', 'ok')), 'artiste + titre tapés ensemble');
    }
    await page.waitForSelector('#reveal:not(.hide)', { timeout: 30000 });
  }
  await page.waitForSelector('#v-end:not(.hide)', { timeout: 30000 });
  await page.waitForSelector('#rankBox .rankres', { timeout: 8000 });
  await sleep(1500);
  const rb = (await page.textContent('#rankBox')).replace(/\s+/g, ' ').trim();
  log('fin de partie :', rb);
  ok(/\+\d+ PR/.test(rb), 'points de rang gagnés affichés');
  await page.screenshot({ path: OUT + '/c03_fin_classee.png' });
  await page.click('[data-et="full"]');
  await page.screenshot({ path: OUT + '/c04_fin_classement.png' });

  const uid = await page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).uid);
  const me = await (await fetch(`${BASE}/api/me?uid=${uid}`)).json();
  log('serveur :', JSON.stringify(me));
  ok(me.rp > 0 && me.games === 1, 'rang enregistré sur le serveur');

  // retour à l'accueil, fiche des rangs, classement de la saison
  await page.click('#endHome');
  await page.waitForSelector('#v-home:not(.hide)');
  await page.click('#v-home .who');
  await sleep(300);
  await page.screenshot({ path: OUT + '/c05_rangs.png' });
  await page.click('#sheetBox [data-close]');
  await page.click('[data-go="board"]');
  await sleep(800);
  await page.screenshot({ path: OUT + '/c06_classement_saison.png' });
  ok((await page.textContent('#boardList')).includes('PR'), 'classement de la saison en points de rang');
  await page.goBack();

  // salon privé : partie amicale et niveau des bots
  await page.click('#bCreate');
  await page.click('#catsOk');
  await page.waitForSelector('#v-lobby:not(.hide)');
  ok((await page.textContent('#lobbyNote')).includes('amicale'), 'salon privé : partie amicale');
  await page.click('#lobbyParams');
  await page.click('[data-k="bots"] [data-v="2"]');
  await page.click('[data-k="botlvl"] [data-v="3"]');
  await sleep(300);
  await page.screenshot({ path: OUT + '/c07_reglages_bots.png' });
  await page.click('#sheetBox .cta');
  await sleep(300);
  ok((await page.textContent('#lobbyNote')).includes('Expert'), 'niveau des bots réglé sur Expert');
  await page.goBack();
  await page.waitForSelector('#v-home:not(.hide)');

  // changement de saison : 620 PR (Émeraude) en septembre → Platine en octobre + 700 pièces
  const coinsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).coins);
  await fetch(`${BASE}/__mock/saison?uid=${uid}&sc=2026-09&rp=620`);
  await page.reload();
  await page.waitForSelector('#sheet:not(.hide)', { timeout: 8000 });
  await sleep(400);
  await page.screenshot({ path: OUT + '/c08_fin_de_saison.png' });
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')));
  log('après la saison :', JSON.stringify(after.rank), 'pièces', coinsBefore, '→', after.coins);
  ok(after.rank.tier === 3 && after.rank.rp === 300, 'nouvelle saison : repart en Platine (300 PR)');
  ok(after.coins - coinsBefore === 700, 'récompense de saison Émeraude : +700 pièces');
  await page.click('#sheetBox [data-close]');
  await page.click('[data-go="profile"]');
  await sleep(400);
  await page.screenshot({ path: OUT + '/c09_profil.png', fullPage: false });

  ok(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
