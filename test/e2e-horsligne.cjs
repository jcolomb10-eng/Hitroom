// Chargement rapide et hors connexion (version 1.12, service worker public/sw.js) — wrangler dev en local avec MOCK_MUSIC=1
// NODE_PATH=$(npm root -g) node test/e2e-horsligne.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 30 s)
// service worker installé, fichiers du jeu gardés, appli qui s'ouvre sans réseau (profil, découvertes), parties
// refusées gentiment hors ligne, retour en ligne, nouvelle version = nouvelle copie et ménage des anciennes
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const until = async (fn, ms, step = 150) => { for (let t = 0; t < ms; t += step) { if (await fn()) return true; await sleep(step); } return !!(await fn()); };
const errors = [];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + '/');
  await page.click('#loginGuest');
  await page.fill('#onbName', 'Voyageur');
  await page.click('#onbGo');
  await page.waitForSelector('#v-home:not(.hide)');
  ok(await until(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.active), 8000), 'service worker installé et actif');
  const version = await page.evaluate(() => document.body.innerHTML.match(/const VERSION = '([^']+)'/)?.[1] || '');
  const keys = await page.evaluate(() => caches.keys());
  ok(keys.length === 1 && keys[0] === 'hitroom-' + version, `une seule copie, à la version du jeu (${keys.join(', ')})`);
  // les images vues sont gardées (avatars dans le profil)
  await page.reload();
  await page.waitForSelector('#v-home:not(.hide)');
  await page.click('#tabbar [data-tab="profile"]');
  await sleep(800);
  const cached = await page.evaluate(async () => (await (await caches.open((await caches.keys())[0])).keys()).map(r => new URL(r.url).pathname));
  ok(['/', '/art.js', '/logo.webp'].every(p => cached.includes(p)) && cached.some(p => p.startsWith('/av/')), `fichiers gardés : page, script, logo, avatars (${cached.length})`);
  ok(!cached.some(p => /^\/(api|__mock)\//.test(p) || /\.(mp4|webm|m4a|ogg)$/.test(p)), 'jamais gardés : /api/, extraits, vidéos et sons');

  // sans réseau : l'appli s'ouvre quand même
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector('#v-home:not(.hide)', { timeout: 8000 });
  ok(await page.isVisible('#offbar') && (await page.textContent('#offbar')).includes('Hors connexion'), 'hors connexion : l’appli s’ouvre avec la barre « Hors connexion »');
  await page.click('#tabbar [data-tab="profile"]');
  ok((await page.textContent('#profBody')).includes('Voyageur'), 'hors connexion : profil consultable');
  await page.click('#profDisc');
  ok(await page.isVisible('#discList'), 'hors connexion : Mes découvertes consultable');
  await page.click('#sheet [data-close]');
  await page.screenshot({ path: `${OUT}/h01_hors_connexion.png` });
  await page.click('#tabbar [data-tab="home"]');
  await page.click('#bSolo');
  await page.click('[data-c="rock"]');
  await page.click('#catsOk');
  ok(await until(async () => (await page.textContent('#toast')).includes('Pas de connexion'), 2000), 'hors connexion : partie refusée avec un message clair');
  ok(!(await page.isVisible('#v-game')), 'hors connexion : pas d’écran de partie bloqué');

  // retour du réseau
  await ctx.setOffline(false);
  ok(await until(async () => !(await page.$('#offbar')), 3000), 'retour en ligne : la barre disparaît');
  await page.click('#catsOk');
  ok(await until(() => page.isVisible('#v-game'), 10000), 'retour en ligne : la partie démarre');

  // nouvelle version : nouvelle copie, l'ancienne est effacée
  await page.evaluate(() => navigator.serviceWorker.register('/sw.js?v=essai-nouvelle'));
  ok(await until(async () => JSON.stringify(await page.evaluate(() => caches.keys())) === '["hitroom-essai-nouvelle"]', 8000), 'nouvelle version : ancienne copie effacée');

  ok(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failures ? `${failures} échec(s)` : 'Tout est bon');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
