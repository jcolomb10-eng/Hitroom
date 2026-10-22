// Halloween 2026 (version 1.19) dans l'appli (wrangler dev en local avec MOCK_MUSIC=1, état vide : rm -rf .wrangler/state)
// NODE_PATH=$(npm root -g) node test/e2e-halloween.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 1 min)
// tuile et décor dès le jeudi soir, catégorie Frissons (jouable, pas classée), feuille de l'événement,
// récompenses du lundi (cadre Citrouille, avatar Chauve-citrouille), équiper le cadre et l'avatar
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const until = async (fn, ms, step = 150) => { for (let t = 0; t < ms; t += step) { if (await fn()) return true; await sleep(step); } return !!(await fn()); };
const api = async p => (await fetch(BASE + p)).json();
const errors = [];
const tag = Date.now().toString(36).slice(-4);
const shot = async (page, n) => page.screenshot({ path: `${OUT}/hw_${n}.png` });

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  page.on('dialog', d => d.accept());
  page.on('pageerror', e => errors.push(e.message));
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')));
  const text = sel => page.$eval(sel, e => e.textContent).catch(() => '');
  await api('/__mock/horloge?t=2026-10-30T17:00:00Z'); // vendredi 18 h à Paris
  await page.goto(BASE + '/');
  await page.click('#loginGuest');
  await page.fill('#onbName', 'Mina' + tag);
  await page.click('#onbGo');
  await page.waitForSelector('#homeName');
  await sleep(2000);
  const uid = (await state()).uid;

  // 1. vendredi : événement à venir, décor déjà là
  ok(await until(() => page.$eval('#homeEvent', e => e.classList.contains('hw') && e.textContent.includes('Nuit des Frissons') && e.textContent.includes('CE WEEK-END')), 8000), 'vendredi : tuile Halloween « ce week-end »');
  ok(await page.evaluate(() => document.documentElement.dataset.hw === '1' && !!document.querySelector('.hwfx')), 'décor d’Halloween sur l’accueil');
  ok((await text('#homeTk')).includes('Nuit des Frissons'), 'bande défilante : message d’Halloween');
  await shot(page, '01_accueil_vendredi');

  // 2. samedi 20 h 30 : en cours ; catégorie Frissons jouable en solo / non classé, pas en classé
  await api('/__mock/horloge?t=2026-10-31T19:30:00Z');
  await page.goto(BASE + '/');
  ok(await until(() => page.$eval('#homeEvent', e => e.textContent.includes('ÉVÉNEMENT EN COURS')), 8000), 'samedi : événement en cours');
  await page.click('#homeEvent');
  ok(await until(async () => (await text('#sheetBox')).includes('Cadre Citrouille') && (await text('#sheetBox')).includes('Frissons'), 6000), 'feuille : cadeaux et catégorie Frissons');
  await shot(page, '02_feuille');
  await page.click('#sheetBox [data-close]').catch(() => {});
  await page.goto(BASE + '/');
  await page.waitForSelector('#bSolo');
  await page.click('#bOpen');
  ok(await until(async () => (await text('#v-cats')).includes('Frissons'), 5000), 'Non classé : catégorie Frissons proposée');
  await shot(page, '03_categories');
  ok((await api('/api/public/frissons/ws')).error !== undefined, 'Classé : Frissons refusée par le serveur');
  const rc = (await api(`/api/me?uid=${uid}&name=Mina&av=A02&fr=def&lvl=1`)).rcats;
  ok(!rc.includes('frissons') && rc.includes('rock'), 'catégories classées sans Frissons');

  // 3. points pendant l'événement : la page est 1re, trois autres joueurs derrière
  const mk = async (n, name, pts) => { const id = `hw${tag}${n}xxxxxxxx`; await api(`/api/me?uid=${id}&name=${name}&av=A03&fr=def&lvl=2`); await api(`/__mock/points?uid=${id}&pts=${pts}&cat=frissons`); };
  await api(`/__mock/points?uid=${uid}&pts=900&cat=frissons`);
  await mk(1, 'Lola', 700); await mk(2, 'Hugo', 500); await mk(3, 'Sam', 320); await mk(4, 'Ana', 100);
  const ev = await api(`/api/event?uid=${uid}`);
  ok(ev.me.place === 1 && ev.cat === 'frissons' && ev.theme === 'halloween' && ev.gifts.frame === 'citrouille', 'classement de l’événement : 1re place, thème Halloween');

  // 4. lundi : récompenses (pièces, titre, cadre Citrouille, avatar Chauve-citrouille)
  await api('/__mock/horloge?t=2026-11-02T09:00:00Z');
  await page.goto(BASE + '/');
  ok(await until(async () => (await text('#sheetBox')).includes('Bravo, tu es récompensé'), 10000), 'lundi : feuille de récompenses');
  ok((await text('#sheetBox')).includes('Citrouille') && (await text('#sheetBox')).includes('Chauve-souris') && (await text('#sheetBox')).includes('Chauve-citrouille'), 'cadeaux : cadre Citrouille et les deux avatars');
  await shot(page, '04_recompenses');
  const st = await state();
  ok(st.owned.includes('citrouille') && st.avs.includes('H01') && st.avs.includes('H02') && st.titles.includes('h-ev-ehallo-261026'), 'cadre, avatar et titre enregistrés');
  await page.click('#sheetBox [data-close]');
  ok(await until(() => page.evaluate(() => document.documentElement.dataset.hw === ''), 4000), 'lundi : le décor disparaît');

  // 5. équiper le cadre (boutique) et l'avatar (profil)
  await page.click('[data-tab="shop"]');
  await page.click('[data-st="frames"]');
  await sleep(500);
  const frameBtn = await page.$('[data-kind="event"][data-it="citrouille"]');
  ok(!!frameBtn, 'boutique : cadre Citrouille dans les cadres d’événement');
  if (frameBtn) { await frameBtn.scrollIntoViewIfNeeded(); await shot(page, '05_boutique'); await frameBtn.click(); }
  ok(await until(async () => (await state()).fr === 'citrouille', 4000), 'cadre Citrouille équipé');
  await page.click('[data-tab="profile"]');
  await sleep(800);
  await page.click('#profAv');
  ok(await until(async () => !!(await page.$('#sheetBox [data-av="H02"]')), 3000), 'choix de l’avatar : Chauve-citrouille proposée');
  await shot(page, '06_avatars');
  await page.click('#sheetBox [data-av="H02"]');
  ok(await until(async () => (await state()).av === 'H02', 3000), 'avatar Chauve-citrouille équipé');
  await sleep(800);
  await shot(page, '07_profil_halloween');
  ok(errors.length === 0, errors.length ? 'erreurs : ' + errors.join(' | ') : 'aucune erreur dans la page');
  await browser.close();
  console.log(failures ? `\n${failures} ÉCHEC(S)` : '\nTout est bon.');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
