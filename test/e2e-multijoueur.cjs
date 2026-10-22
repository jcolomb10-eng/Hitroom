// Test bout en bout : 3 joueurs dans un salon privé + 1 joueur en salon public.
// 1. npx wrangler dev --port 8787   (avec MOCK_MUSIC=1 dans .dev.vars : extraits simulés)
// 2. NODE_PATH=$(npm root -g) node test/e2e-multijoueur.cjs   (captures d'écran dans SHOTS, /tmp/hitroom-shots par défaut)
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(14, 23), ...a);
const errors = [];

async function player(browser, name, url = BASE + '/') {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], hasTouch: true, isMobile: true, defaultBrowserType: 'chromium' });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  page.on('pageerror', e => { errors.push(`${name}: ${e.message}`); log('PAGEERROR', name, e.message); });
  page.on('console', m => { if (m.type() === 'error') { errors.push(`${name} console: ${m.text()}`); log('CONSOLE', name, m.text()); } });
  await page.goto(url);
  await page.click('#loginGuest');
  await page.fill('#onbName', name);
  await page.click('#onbAv button:nth-child(3)');
  await page.click('#onbGo');
  return { ctx, page, name };
}
const answer = async page => {
  const src = await page.$eval('#audio', a => a.src);
  const m = src.match(/__mock\/a\/(.+)\.wav/);
  if (!m) return null;
  const [artist, title] = decodeURIComponent(m[1]).split('|');
  return { artist, title };
};
const typeSlow = async (page, text) => { await page.click('#guessIn'); await page.fill('#guessIn', ''); await page.type('#guessIn', text, { delay: 40 }); };
const phase = page => page.evaluate(() => document.querySelector('#v-game').classList.contains('hide') ? 'notgame' : 'game');

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const A = await player(browser, 'Julien');
  await A.page.screenshot({ path: OUT + '/01_accueil.png' });

  // A crée un salon Variété FR
  await A.page.click('#bCreate');
  await A.page.waitForSelector('#v-cats:not(.hide)');
  await A.page.click('[data-c="variete"]');
  await A.page.screenshot({ path: OUT + '/02_categories.png' });
  await A.page.click('#catsOk');
  await A.page.waitForSelector('#v-lobby:not(.hide)');
  const code = (await A.page.textContent('#lobbyCode')).trim();
  log('code du salon', code);

  // B arrive par le lien d'invitation, C par le code
  const B = await player(browser, 'Marie', `${BASE}/?salon=${code}`);
  await B.page.waitForSelector('#v-lobby:not(.hide)', { timeout: 8000 });
  const C = await player(browser, 'Karim');
  await C.page.click('#bJoin');
  await C.page.fill('#codeIn', code.toLowerCase());
  await C.page.click('#codeGo');
  await C.page.waitForSelector('#v-lobby:not(.hide)', { timeout: 8000 });
  await B.page.fill('#lobbyChatIn', 'Salut tout le monde !');
  await B.page.press('#lobbyChatIn', 'Enter');
  await sleep(600);
  log('joueurs vus par A :', await A.page.$$eval('#lobbyPlayers .prow', r => r.map(x => x.innerText.split('\n')[0])));
  log('chat vu par C :', await C.page.textContent('#lobbyMsgs'));
  log('bouton lancer chez B :', await B.page.textContent('#lobbyStart'), await B.page.$eval('#lobbyStart', b => b.disabled));

  // A règle : 5 manches, 15 s, 2 bots
  await A.page.click('#lobbyParams');
  await A.page.click('[data-k="rounds"] [data-v="5"]');
  await A.page.click('[data-k="dur"] [data-v="15"]');
  await A.page.click('[data-k="bots"] [data-v="2"]');
  await A.page.screenshot({ path: OUT + '/03b_parametres.png' });
  await A.page.click('#sheetBox .cta');
  await sleep(400);
  await A.page.screenshot({ path: OUT + '/03_salon.png' });
  await A.page.click('#lobbyStart');
  await A.page.waitForSelector('#v-game:not(.hide)', { timeout: 10000 });
  await sleep(1200);
  await A.page.screenshot({ path: OUT + '/04a_compte_a_rebours.png' });

  for (let round = 1; round <= 5; round++) {
    // attendre le début de la manche
    await A.page.waitForFunction(r => {
      const t = document.querySelector('#gameTitle').innerText;
      return t.includes(`Manche ${r}/`) && document.querySelector('#reveal').classList.contains('hide') && document.querySelector('#gOverlay').classList.contains('hide');
    }, round, { timeout: 30000 });
    const ans = await answer(A.page);
    const ansB = await answer(B.page);
    log(`manche ${round} : ${ans?.title} — ${ans?.artist}`, ansB?.title === ans?.title ? '(même extrait chez B)' : '!! extrait différent chez B');
    await sleep(1300);
    await typeSlow(B.page, ans.artist.toLowerCase());
    if (round === 3) {
      // coupure réseau de C pendant 3 s
      await C.ctx.setOffline(true);
      log('C hors ligne');
      await sleep(3000);
      await C.ctx.setOffline(false);
      log('C de retour');
      await sleep(2500);
    }
    await sleep(800);
    if (round === 2) {
      // C écrit la réponse dans le chat (doit être compté mais pas affiché)
      await C.page.click('#chatFab');
      await C.page.fill('#chatSheetIn', ans.title);
      await C.page.press('#chatSheetIn', 'Enter');
      await sleep(400);
      await C.page.click('#sheetBox [data-close]');
    } else {
      await typeSlow(C.page, `${ans.artist} ${ans.title}`);
    }
    if (round !== 2) {
      // A tape le titre avec une faute
      const t = ans.title.length > 5 ? ans.title.slice(0, -2) + ans.title.slice(-1) + ans.title.slice(-2, -1) : ans.title;
      await typeSlow(A.page, t);
      await A.page.press('#guessIn', 'Enter'); // faute de frappe : validée seulement avec Entrée
      await sleep(500);
      if (round === 1) await A.page.screenshot({ path: OUT + '/04_partie.png' });
    } else {
      await typeSlow(A.page, 'zzzz');
      await A.page.press('#guessIn', 'Enter');
      await sleep(300);
      log('indice de A :', await A.page.textContent('#hint'));
      await A.page.screenshot({ path: OUT + '/04c_partie_rate.png' });
    }
    await A.page.waitForSelector('#reveal:not(.hide)', { timeout: 30000 });
    await sleep(500);
    if (round === 1) await A.page.screenshot({ path: OUT + '/04b_reponse.png' });
    const sc = await A.page.$$eval('#podmini .pm, #others > div', r => r.map(x => x.innerText.replace(/\n/g, ' ')));
    log('classement A :', sc.join(' | '));
  }
  await A.page.waitForSelector('#v-end:not(.hide)', { timeout: 30000 });
  await sleep(800);
  await A.page.screenshot({ path: OUT + '/05_fin.png' });
  await A.page.click('[data-et="full"]');
  await A.page.screenshot({ path: OUT + '/05b_fin_classement.png' });
  for (const P of [A, B, C]) log('fin', P.name, (await P.page.textContent('#myrow')).trim(), '|', (await P.page.textContent('#endNew')).trim());
  log('chat C (ne doit pas contenir la réponse) :', (await C.page.$$eval('#lobbyMsgs .msg', m => m.map(x => x.innerText))).slice(-3));

  // A relance une partie depuis l'écran de fin
  await B.page.click('#endSame');
  await A.page.click('#endNew');
  await B.page.waitForSelector('#v-game:not(.hide)', { timeout: 10000 });
  log('B est bien passé dans la nouvelle partie');

  // profil, défis, classement de A
  await A.page.goBack();
  await A.page.waitForSelector('#v-home:not(.hide)', { timeout: 5000 });
  await A.page.screenshot({ path: OUT + '/01b_accueil_apres.png' });
  for (const [v, f] of [['profile', '06_profil'], ['board', '07_classements'], ['defis', '08_defis'], ['shop', '09_boutique']]) {
    await A.page.click(`[data-go="${v}"]`);
    await sleep(700);
    await A.page.screenshot({ path: `${OUT}/${f}.png` });
    await A.page.goBack();
    await sleep(200);
  }
  await A.page.click('[data-go="profile"]');
  await A.page.click('#profSet');
  await sleep(300);
  await A.page.screenshot({ path: OUT + '/10_parametres.png' });
  await A.page.goBack();

  // D joue en salon public Rock
  const D = await player(browser, 'Léa');
  await D.page.click('#bPlay');
  await D.page.click('[data-c="rock"]');
  await D.page.click('#catsOk');
  await D.page.waitForSelector('#v-game:not(.hide)', { timeout: 8000 });
  await D.page.waitForFunction(() => document.querySelector('#gameTitle').innerText.includes('Manche 1/'), null, { timeout: 20000 });
  await sleep(6000);
  await D.page.screenshot({ path: OUT + '/11_public_bots.png' });
  log('public, joueurs :', await D.page.$$eval('#podmini .pm, #others > div', r => r.map(x => x.innerText.replace(/\n/g, ' '))));
  log('compteurs :', await (await fetch(BASE + '/api/counts')).text());
  log('classement saison :', JSON.stringify((await (await fetch(BASE + '/api/board?sc=season')).json()).top.map(p => `${p.name}:${p.pts}`)));
  log('ERREURS :', errors.length ? errors : 'aucune');
  await browser.close();
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
