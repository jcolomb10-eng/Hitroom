// Réglages de confort (version 1.12) : taille du texte, thème clair, mode daltonien (wrangler dev en local avec MOCK_MUSIC=1)
// NODE_PATH=$(npm root -g) node test/e2e-confort.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 30 s)
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const errors = [];
// clarté d'une couleur css « rgb(r, g, b) » (0 noir … 255 blanc)
const light = c => { const [r, g, b] = c.match(/\d+/g).map(Number); return (r * 299 + g * 587 + b * 114) / 1000; };

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + '/');
  await page.click('#loginGuest');
  await page.fill('#onbName', 'Confort');
  await page.click('#onbGo');
  await page.waitForSelector('#v-home:not(.hide)');
  const root = () => page.evaluate(() => ({ ...document.documentElement.dataset }));
  const zoom = sel => page.$eval(sel, e => +getComputedStyle(e).zoom || 1);
  ok(!(await root()).fs && !(await root()).light && !(await root()).cb, 'au départ : texte normal, thème sombre, couleurs normales');

  await page.click('#tabbar [data-tab="profile"]');
  await page.click('#profSet');
  await page.waitForSelector('#fsSeg');
  // 1. taille du texte
  await page.click('#fsSeg [data-fs="2"]');
  ok((await root()).fs === '2' && Math.abs((await zoom('#v-settings .scroll')) - 1.25) < 0.01, 'taille du texte A++ : zones de lecture agrandies (×1,25)');
  await page.click('#fsSeg [data-fs="1"]');
  ok((await root()).fs === '1' && Math.abs((await zoom('#v-settings .scroll')) - 1.12) < 0.01, 'taille du texte A+ (×1,12)');
  // 2. thème clair
  await page.click('[data-tg="light"]');
  const ink = await page.$eval('#v-settings .set span:nth-child(2)', e => getComputedStyle(e).color);
  ok((await root()).light === '1' && light(ink) < 80, `thème clair : texte foncé (${ink})`);
  ok(await page.$eval('meta[name="theme-color"]', m => m.content) === '#f7f2fa', 'thème clair : barre du téléphone claire');
  // 3. mode daltonien
  await page.click('[data-tg="cb"]');
  const green = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--green').trim());
  ok((await root()).cb === '1' && green === '#1f6fd1', `mode daltonien : le vert devient bleu (${green})`);
  await page.screenshot({ path: `${OUT}/k01_parametres.png` });

  // 4. tout est gardé après rechargement
  await page.reload();
  await page.waitForSelector('#v-home:not(.hide)');
  const r = await root();
  ok(r.fs === '1' && r.light === '1' && r.cb === '1', 'après rechargement : réglages gardés');
  ok(!(await page.$eval('#v-home .bgvid', v => v.offsetParent !== null).catch(() => false)), 'thème clair : pas de vidéo sombre derrière l’accueil');

  // 5. salon en A++ : la zone de message et le bouton d'envoi restent dans l'écran
  await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('hitroom.v1')); S.set.fs = 2; localStorage.setItem('hitroom.v1', JSON.stringify(S)); });
  await page.reload();
  await page.waitForSelector('#v-home:not(.hide)');
  await page.click('#bCreate');
  await page.click('[data-c="rock"]');
  await page.click('#catsOk');
  await page.waitForSelector('#v-lobby:not(.hide)');
  const w = page.viewportSize().width;
  const btn = await page.$eval('#lobbyChatSend', b => b.getBoundingClientRect().right);
  ok(btn <= w + 1, `salon en A++ : bouton d’envoi visible (bord droit ${Math.round(btn)} ≤ ${w})`);
  await page.screenshot({ path: `${OUT}/k02_salon_grand_clair.png` });

  ok(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failures ? `${failures} échec(s)` : 'Tout est bon');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
