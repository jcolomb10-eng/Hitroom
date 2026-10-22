// Statistiques de fréquentation (version 1.12) : /api/stats et page /stats.html (wrangler dev en local avec MOCK_MUSIC=1 et ADMIN_KEY=essai-local)
// NODE_PATH=$(npm root -g) node test/e2e-stats.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 1 min)
// joueurs actifs du jour comptés une fois, nouveaux joueurs, partie comptée par mode et catégorie, page protégée par la clé
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const until = async (fn, ms, step = 200) => { for (let t = 0; t < ms; t += step) { if (await fn()) return true; await sleep(step); } return !!(await fn()); };
const errors = [];
const stats = async () => (await fetch(`${BASE}/api/stats?key=essai-local`)).json();
const today = st => st.jours[st.jours.length - 1];

(async () => {
  ok((await fetch(`${BASE}/api/stats`)).status === 403 && (await fetch(`${BASE}/api/stats?key=faux`)).status === 403, '/api/stats : refusé sans la bonne clé');
  const before = await stats();
  const browser = await chromium.launch();
  const open = async name => {
    const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
    page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    await page.goto(BASE + '/');
    await page.click('#loginGuest');
    await page.fill('#onbName', name);
    await page.click('#onbGo');
    await page.waitForSelector('#v-home:not(.hide)');
    return page;
  };
  const A = await open('Stat1');
  await open('Stat2');
  ok(await until(async () => today(await stats()).actifs === today(before).actifs + 2, 4000), 'deux joueurs ouvrent l’appli : +2 joueurs actifs aujourd’hui');
  let st = await stats();
  ok(today(st).nouveaux === today(before).nouveaux + 2 && st.total === before.total + 2, '+2 nouveaux joueurs, +2 au total');
  await A.reload();
  await A.waitForSelector('#v-home:not(.hide)');
  await sleep(800);
  st = await stats();
  ok(today(st).actifs === today(before).actifs + 2 && today(st).nouveaux === today(before).nouveaux + 2, 'le même joueur qui revient ne compte qu’une fois');

  // une partie solo en Rock : comptée par mode et par catégorie
  await A.click('#bSolo');
  await A.click('#soloLvl [data-l="0"]');
  await A.click('[data-c="rock"]');
  await A.click('#catsOk');
  await A.waitForSelector('#v-game:not(.hide)');
  for (let round = 1; round <= 5; round++) {
    await A.waitForFunction(r => document.querySelector('#gameTitle').innerText.includes(`Manche ${r}/`) &&
      document.querySelector('#reveal').classList.contains('hide') && document.querySelector('#gOverlay').classList.contains('hide'), round, { timeout: 40000 });
    await sleep(400);
    const m = (await A.$eval('#audio', a => a.src)).match(/__mock\/a\/(.+)\.wav/);
    const [artist, title] = decodeURIComponent(m[1]).split('|');
    await A.fill('#guessIn', title); await A.press('#guessIn', 'Enter'); await sleep(150);
    await A.fill('#guessIn', artist); await A.press('#guessIn', 'Enter');
  }
  await A.waitForSelector('#v-end:not(.hide)', { timeout: 40000 });
  ok(await until(async () => { st = await stats(); return (st.modes.solo || 0) === (before.modes.solo || 0) + 1; }, 4000), 'partie solo comptée (mode Solo)');
  ok((st.cats.rock || 0) === (before.cats.rock || 0) + 1 && (st.joueurs.solo || 0) === (before.joueurs.solo || 0) + 1 && today(st).parties === today(before).parties + 1,
    'catégorie Rock +1, 1 joueur, +1 partie aujourd’hui');
  ok(!JSON.stringify(st).match(/[0-9a-f]{32}/), 'aucun identifiant de joueur dans les statistiques');

  // la page /stats.html
  const P = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  P.on('pageerror', e => errors.push(`stats: ${e.message}`));
  await P.goto(BASE + '/stats.html');
  await P.waitForSelector('#login:not(.hide)');
  await P.fill('#key', 'mauvaise');
  await P.click('#go');
  ok(await until(async () => (await P.textContent('#err')).includes('incorrecte'), 3000), 'page : mauvaise clé refusée');
  await P.fill('#key', 'essai-local');
  await P.click('#go');
  await P.waitForSelector('#out:not(.hide)');
  ok((await P.textContent('#tToday')).trim() === String(today(st).actifs), 'page : joueurs du jour affichés');
  ok((await P.$$('#cActive .bars div')).length === 30 && (await P.textContent('#modes')).includes('Solo') && (await P.textContent('#cats')).includes('Rock'), 'page : graphique sur 30 jours, modes et catégories');
  await P.screenshot({ path: `${OUT}/t01_stats.png`, fullPage: true });
  await P.reload();
  await P.waitForSelector('#out:not(.hide)');
  ok(true, 'page : clé gardée après rechargement');

  ok(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failures ? `${failures} échec(s)` : 'Tout est bon');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
