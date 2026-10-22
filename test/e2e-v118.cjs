// Version 1.18 dans l'appli (wrangler dev en local avec MOCK_MUSIC=1, état vide : rm -rf .wrangler/state avant de lancer wrangler)
// NODE_PATH=$(npm root -g) node test/e2e-v118.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 2 min)
// tuile et feuille de l'événement, coffre / guerre / rivalité sur la page du club, honneurs reçus (pièces + titre),
// pièces ×2 de l'événement, Survie (une manche ratée = fin, record), Intro 1 s (réécoutes, points ×2), pari de duel
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const until = async (fn, ms, step = 150) => { for (let t = 0; t < ms; t += step) { if (await fn()) return true; await sleep(step); } return !!(await fn()); };
const api = async p => (await fetch(BASE + p)).json();
const post = async (p, b) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json();
const errors = [];
const tag = Date.now().toString(36).slice(-4);
const shot = async (page, n) => page.screenshot({ path: `${OUT}/v118_${n}.png` });
const keyOf = url => decodeURIComponent(url.match(/__mock\/a\/(.+)\.wav/)[1]).split('|');

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  page.on('dialog', d => d.accept());
  page.on('pageerror', e => errors.push(e.message));
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')));
  const bodyText = sel => page.$eval(sel, e => e.textContent).catch(() => '');
  await api('/__mock/horloge?t=2026-10-24T18:30:00Z'); // samedi 20 h 30 à Paris : événement et tournoi en direct
  await page.goto(BASE + '/');
  await page.click('#loginGuest');
  await page.fill('#onbName', 'Léa' + tag);
  await page.click('#onbGo');
  await page.waitForSelector('#homeName');
  await sleep(1500);
  const uid = (await state()).uid;
  const ev = await api(`/api/event?uid=${uid}`);

  // 1. tuile et feuille de l'événement
  ok(await until(() => page.$eval('#homeEvent', e => !e.classList.contains('hide') && e.textContent.includes('ÉVÉNEMENT EN COURS')), 6000), 'accueil : tuile de l’événement en cours');
  await shot(page, '01_accueil');
  await page.click('#homeEvent');
  ok(await until(async () => (await bodyText('#sheetBox')).includes('Tournoi du samedi soir') && (await bodyText('#sheetBox')).includes(ev.name), 5000), 'feuille de l’événement : règles, classement, tournoi');
  await shot(page, '02_evenement');

  // 2. vraie partie dans la catégorie de l'événement : pièces ×2 et points de l'événement
  await page.click('#evOpen');
  ok(await until(() => page.evaluate(() => !document.querySelector('#v-game').classList.contains('hide')), 15000), 'Jouer depuis l’événement : partie lancée');
  const c0 = (await state()).coins;
  let round = 0;
  const ended = await until(async () => {
    const info = await page.evaluate(() => { const g = document.querySelector('#v-game'); return { game: !g.classList.contains('hide'), end: !document.querySelector('#v-end').classList.contains('hide') }; });
    if (info.end) return true;
    const url = await page.evaluate(() => document.querySelector('#audio').src).catch(() => '');
    const m = /__mock\/a\/(.+)\.wav/.exec(url || '');
    const r = await page.evaluate(() => document.querySelector('#gameTitle small')?.textContent || '');
    if (m && r !== round && info.game && !(await page.$('#reveal:not(.hide)'))) {
      round = r;
      const [artist, title] = decodeURIComponent(m[1]).split('|');
      await page.fill('#guessIn', artist).catch(() => {}); await page.keyboard.press('Enter'); await sleep(250);
      await page.fill('#guessIn', title).catch(() => {}); await page.keyboard.press('Enter');
    }
    return false;
  }, 170000, 400);
  ok(ended, 'partie de l’événement terminée');
  await sleep(1500);
  const gain = (await state()).coins - c0;
  ok((await bodyText('#endRecap')).includes('événement ×2'), `fin de partie : « événement ×2 » (+${gain} pièces)`);
  await shot(page, '03_fin_evenement');
  const ev2 = await api(`/api/event?uid=${uid}`);
  ok(ev2.me.pts > 0 && ev2.tour.me.pts > 0, `points de l’événement (${ev2.me.pts}) et du tournoi (${ev2.tour.me.pts}) enregistrés`);

  // 3. club : coffre, guerre, rivalité
  const names = ['Etoile' + tag, 'Comete' + tag];
  const ca = await post('/api/club', { uid, act: 'create', name: names[0], e: '🔥', c: 0 });
  const other = 'v118b' + tag + 'xxxxxx', other2 = 'v118c' + tag + 'xxxxxx', third = 'v118d' + tag + 'xxxxxx';
  for (const [o, n] of [[other, 'Max'], [other2, 'Zoe'], [third, 'Tom']]) await api(`/api/me?uid=${o}&name=${n}&av=A02&fr=def&lvl=2`);
  await post('/api/club', { uid: other, act: 'join', id: ca.id });
  const cb = await post('/api/club', { uid: other2, act: 'create', name: names[1], e: '🚀', c: 2 });
  await post('/api/club', { uid: third, act: 'join', id: cb.id });
  await api(`/__mock/points?uid=${uid}&pts=1600&cat=${ev.cat}`);
  await api(`/__mock/points?uid=${other2}&pts=1400&cat=${ev.cat}`);
  await page.goto(BASE + '/?club=' + ca.id);
  ok(await until(async () => { const t = await bodyText('#clubBody'); return t.includes('Coffre de la semaine') && t.includes('Guerre de clubs') && t.includes('Rivalité'); }, 8000), 'page du club : coffre, guerre, rivalité');
  ok((await bodyText('#clubBody')).includes(names[1]), 'guerre : l’adversaire est affiché');
  await shot(page, '04_club');
  const c1 = (await state()).coins;
  await page.click('#chestGo');
  ok(await until(async () => (await state()).coins === c1 + 100, 4000), 'coffre : +100 pièces récupérées');
  ok(await until(() => page.$eval('#clubBody', e => !e.querySelector('#chestGo')), 4000), 'coffre : bouton retiré une fois récupéré');
  await api('/__mock/horloge?t=2026-10-26T09:00:00Z'); // lundi : guerre terminée
  await page.goto(BASE + '/?club=' + ca.id);
  ok(await until(() => page.$eval('#clubBody', e => !!e.querySelector('#warGo')), 8000), 'lundi : bouton de récompense de guerre');
  // les honneurs du week-end passé arrivent par-dessus, à l'ouverture de l'appli
  ok(await until(async () => (await bodyText('#sheetBox')).includes('Bravo, tu es récompensé'), 10000), 'honneurs : feuille de récompenses à l’ouverture');
  await shot(page, '05_honneurs');
  const titles = (await state()).titles.filter(t => t.startsWith('h-'));
  ok(titles.length === 2 && titles.some(t => t.startsWith('h-ev-')) && titles.includes('h-tour-261019'), `titres gagnés : ${titles.join(', ')}`);
  await page.click('#sheetBox [data-close]');
  await sleep(500);
  await shot(page, '06_guerre');
  const c2 = (await state()).coins;
  await page.click('#warGo');
  ok(await until(async () => (await state()).coins >= c2 + 75, 4000), 'guerre : pièces récupérées');

  // 4. le titre gagné est proposé dans le profil
  await page.goto(BASE + '/');
  await sleep(1500);
  await page.click('[data-tab="profile"]');
  await page.click('#profTitle');
  ok((await bodyText('#sheetBox')).includes('Vainqueur du tournoi'), 'le titre gagné est proposé dans le profil');
  await page.click('#sheetBox [data-close]').catch(() => {});
  await api('/__mock/horloge?t=');

  // 5. Survie
  await page.goto(BASE + '/');
  await page.waitForSelector('#bSolo');
  await page.click('#bSolo');
  await page.click('#soloMode [data-m="survie"]');
  ok((await bodyText('#soloDesc')).includes('Une manche sans rien trouver'), 'solo : mode Survie proposé');
  await shot(page, '07_solo_modes');
  await page.click('#catsOk');
  const phase = () => page.evaluate(() => ({ g: !document.querySelector('#v-game').classList.contains('hide'), rv: !document.querySelector('#reveal').classList.contains('hide'), t: document.querySelector('#gameTitle')?.textContent || '', url: document.querySelector('#audio').src }));
  ok(await until(async () => (await phase()).t.includes('Survie · manche 1'), 25000), 'Survie : partie lancée (manche 1)');
  await sleep(500);
  const guess = async () => {
    const { url } = await phase();
    const [artist, title] = decodeURIComponent(/__mock\/a\/(.+)\.wav/.exec(url)[1]).split('|');
    await page.fill('#guessIn', artist); await page.keyboard.press('Enter'); await sleep(250);
    await page.fill('#guessIn', title); await page.keyboard.press('Enter');
  };
  await guess();
  ok(await until(async () => (await phase()).t.includes('manche 2'), 15000), 'manche 1 réussie : on passe à la manche 2');
  await shot(page, '08_survie_jeu');
  ok(await until(() => page.$eval('#v-end', e => !e.classList.contains('hide')), 60000, 300), 'manche 2 ratée : la partie s’arrête');
  ok(await until(async () => (await bodyText('#rankBox')).includes('1 manche tenue'), 8000), 'fin de partie : « 1 manche tenue »');
  await shot(page, '09_survie_fin');
  ok((await bodyText('#rankBox')).includes('NOUVEAU RECORD'), 'record battu annoncé');
  const cat = (await state()).cat;
  const sv = await api(`/api/survie?cat=${encodeURIComponent(cat)}&uid=${uid}`);
  ok(sv.me === 1 && sv.top[0].best === 1, 'classement de survie : record enregistré');
  await page.goto(BASE + '/');

  // 6. Intro 1 seconde
  await page.waitForSelector('#bSolo');
  await page.click('#bSolo');
  await page.click('#soloMode [data-m="intro"]');
  await page.click('#catsOk');
  ok(await until(() => page.$('#introBtn'), 25000) && (await bodyText('#introBtn')).includes('(3)'), 'Intro : bouton « Intro 1 s (3) »');
  await sleep(2500);
  ok(await page.evaluate(() => document.querySelector('#audio').paused), 'l’extrait s’arrête après 1 seconde');
  await page.click('#introBtn');
  ok((await bodyText('#introBtn')).includes('(2)'), 'une réécoute de moins');
  const { url } = await phase();
  await page.fill('#guessIn', decodeURIComponent(/__mock\/a\/(.+)\.wav/.exec(url)[1]).split('|')[0]); await page.keyboard.press('Enter');
  ok(await until(async () => /\+(\d+)/.test(await bodyText('.floatpts').catch(() => '')) || (await page.evaluate(() => [...document.querySelectorAll('#podmini .pm.me')].map(x => x.textContent).join(' '))).match(/(\d+) pts/)?.[1] >= 20, 4000), 'points doublés en mode Intro (≥ 20 pour l’artiste)');
  await shot(page, '10_intro');

  ok(errors.length === 0, errors.length ? 'erreurs : ' + errors.join(' | ') : 'aucune erreur dans la page');
  await browser.close();
  console.log(failures ? `\n${failures} ÉCHEC(S)` : '\nTout est bon.');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
