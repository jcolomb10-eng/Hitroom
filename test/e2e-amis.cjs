// Amis et duels (version 1.15) de bout en bout (wrangler dev en local avec MOCK_MUSIC=1)
// NODE_PATH=$(npm root -g) node test/e2e-amis.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 2 min 30)
// code ami, demande et acceptation, en ligne / où il joue, rejoindre son salon, ajouter depuis la carte d'un joueur,
// défi en duel (catégorie, 2 joueurs max, départ à l'arrivée de l'adversaire, victoire et bilan), refus, retirer un ami
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const WS = BASE.replace(/^http/, 'ws');
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const until = async (fn, ms, step = 150) => { for (let t = 0; t < ms; t += step) { if (await fn()) return true; await sleep(step); } return !!(await fn()); };
const api = async p => (await fetch(BASE + p)).json();
const errors = [];
function client(path, q) {
  const ws = new WebSocket(`${WS}${path}?${new URLSearchParams(q)}`);
  const c = { ws, msgs: [], last: null };
  ws.onmessage = e => { const m = JSON.parse(e.data); c.msgs.push(m); if (m.t === 'state') c.last = m; };
  return new Promise(res => { ws.onopen = () => res(c); ws.onerror = () => res(c); });
}
async function player(browser, name) {
  const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  page.on('dialog', d => d.accept());
  page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
  await page.goto(BASE + '/');
  await page.click('#loginGuest');
  await page.fill('#onbName', name);
  await page.click('#onbGo');
  await page.waitForSelector('#v-home:not(.hide)');
  return page;
}
const uidOf = page => page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).uid);
const viewOf = page => page.evaluate(() => [...document.querySelectorAll('.view')].find(v => !v.classList.contains('hide'))?.id);
const ping = page => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); // l'appli se signale (sinon chaque minute)
const toastHas = (page, txt) => until(async () => (await page.textContent('#toast')).includes(txt), 4000);
const keyOf = url => decodeURIComponent(url.match(/__mock\/a\/(.+)\.wav/)[1]).split('|');

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const A = await player(browser, 'Alice'), B = await player(browser, 'Bruno');
  const uidA = await uidOf(A), uidB = await uidOf(B);

  // 1. code ami : Bruno ajoute Alice avec son code (erreurs : code inconnu, son propre code)
  await A.click('#bFriends');
  await A.waitForSelector('#v-friends:not(.hide)');
  await until(async () => (await A.textContent('#friBody')).includes('Pas encore d’amis'), 5000);
  ok((await A.textContent('#friBody')).includes('Pas encore d’amis'), 'Mes amis : vide au début, avec « Ajouter des amis »');
  await A.click('[data-ft="add"]');
  await until(async () => /^[A-Z2-9]{6}$/.test(((await A.textContent('.fcode b').catch(() => '')) || '').trim()), 5000);
  const codeA = (await A.textContent('.fcode b')).trim();
  ok(/^[A-HJ-NP-Z2-9]{6}$/.test(codeA), `code ami de 6 caractères (${codeA})`);
  await A.screenshot({ path: `${OUT}/a01_code_ami.png` });
  await B.click('#bFriends');
  await B.click('[data-ft="add"]');
  await B.waitForSelector('#fcIn');
  await B.fill('#fcIn', 'ZZZZZZ');
  await B.click('#fcGo');
  ok(await toastHas(B, 'introuvable'), 'code inconnu : « Code ami introuvable »');
  const codeB = (await B.textContent('.fcode b')).trim();
  await B.fill('#fcIn', codeB);
  await B.click('#fcGo');
  ok(await toastHas(B, 'propre code'), 'son propre code : refusé');
  await B.fill('#fcIn', codeA.toLowerCase());
  await B.click('#fcGo');
  ok(await toastHas(B, 'Demande d’ami envoyée à Alice'), 'demande envoyée à Alice (code tapé en minuscules)');

  // 2. Alice voit la demande (pastille sur l'accueil, onglet Demandes) et accepte
  await A.click('#v-friends .back');
  await A.waitForSelector('#v-home:not(.hide)');
  await ping(A);
  ok(await until(async () => !(await A.$eval('#friDot', e => e.classList.contains('hide'))), 4000) && (await A.textContent('#friLine')).includes('1 demande'), 'accueil d’Alice : pastille et « 1 demande d’ami »');
  await A.click('#bFriends');
  await A.click('[data-ft="req"]');
  await until(async () => (await A.$$('#friBody [data-acc]')).length === 1, 5000);
  ok((await A.textContent('[data-ft="req"]')).includes('(1)') && (await A.textContent('#friBody')).includes('Bruno'), 'onglet Demandes : Bruno');
  await A.screenshot({ path: `${OUT}/a02_demande.png` });
  await A.click('#friBody [data-acc]');
  ok(await toastHas(A, 'Nouvel ami'), 'Alice accepte : « Nouvel ami ajouté »');
  await A.click('[data-ft="list"]');
  await until(async () => (await A.$$('#friBody .fri[data-fp]')).length === 1, 5000);
  ok((await A.$$('#friBody .fri .dot.on')).length === 1 && (await A.textContent('#friBody')).includes('Bruno'), 'Alice : Bruno dans ses amis, en ligne');
  const fl = await (await fetch(`${BASE}/api/friends?uid=${uidA}`)).text();
  ok(!fl.includes(uidB) && fl.includes('Bruno'), 'la liste d’amis ne révèle jamais l’identifiant secret');

  // 3. où joue un ami : Alice ouvre un salon entre amis → Bruno le voit et le rejoint d'un toucher
  await A.click('#v-friends .back');
  await A.click('#bCreate');
  await A.click('[data-c="variete"]');
  await A.click('#catsOk');
  await A.waitForSelector('#v-lobby:not(.hide)');
  const code = (await A.textContent('#lobbyCode')).trim();
  await sleep(1500); // présence envoyée (l'appli se signale en entrant dans un salon)
  ok(await until(async () => {
    await B.click('[data-ft="list"]'); // changer d'onglet recharge la liste
    await sleep(700);
    return (await B.textContent('#friBody')).includes('Dans un salon entre amis') && !!(await B.$(`#friBody [data-join="${code}"]`));
  }, 10000, 300), 'Bruno voit Alice « Dans un salon entre amis » avec Rejoindre');
  await B.screenshot({ path: `${OUT}/a03_ami_en_salon.png` });
  await B.click(`#friBody [data-join="${code}"]`);
  ok(await until(async () => (await viewOf(B)) === 'v-lobby', 8000), 'Rejoindre : Bruno arrive dans le salon d’Alice');

  // 4. ajouter en ami depuis la carte d'un joueur croisé dans le salon
  const uidC = 'amichloe' + Date.now();
  const C = await client(`/api/salon/${code}/ws`, { uid: uidC, name: 'Chloé', av: 'A07' });
  ok(await until(async () => (await A.textContent('#lobbyPlayers')).includes('Chloé'), 5000), `Chloé arrive dans le salon (${C.msgs.map(m => m.t).join(' ')})`);
  await A.click('#lobbyPlayers [data-pid]:has-text("Chloé")');
  await A.waitForSelector('#pcFriend');
  ok((await A.textContent('#pcFriend')).includes('Ajouter en ami'), 'carte de Chloé : « ➕ Ajouter en ami »');
  await A.click('#pcFriend');
  ok(await until(async () => (await A.textContent('#pcFriend').catch(() => '')).includes('Demande d’ami envoyée'), 4000), 'après le toucher : « Demande d’ami envoyée »');
  const fc = await api(`/api/friends?uid=${uidC}`);
  ok(fc.inq.some(r => r.name === 'Alice'), 'Chloé a bien reçu la demande d’Alice');
  await A.click('#sheetBox [data-close]');
  C.ws.close();
  await A.click('#lobbyBack');
  await B.click('#lobbyBack');
  await A.waitForSelector('#v-home:not(.hide)');
  await B.waitForSelector('#v-home:not(.hide)');

  // 5. défi en duel : Alice choisit la catégorie, Bruno reçoit le défi et accepte, la partie démarre toute seule
  await A.click('#bFriends');
  await until(async () => !!(await A.$('#friBody [data-duel]')), 5000);
  await A.click('#friBody [data-duel]');
  await A.waitForSelector('#v-cats:not(.hide)');
  ok((await A.textContent('#catsTitle')).includes('Duel contre Bruno'), 'défi : « Duel contre Bruno », choix de la catégorie');
  await A.click('[data-c="rock"]');
  await A.click('#catsOk');
  await A.waitForSelector('#v-lobby:not(.hide)');
  ok(await toastHas(A, 'Défi envoyé à Bruno'), 'défi envoyé');
  await until(async () => (await A.textContent('#lobbyCount')).includes('1/2'), 4000);
  ok((await A.textContent('#lobbyTitle')).includes('Duel') && (await A.textContent('#lobbyCount')).includes('1/2') && await A.$eval('#lobbyStart', b => b.disabled),
    'salon du duel : 1/2, bouton « En attente de ton adversaire »');
  // extraits de 15 s et 5 manches pour un test plus court
  await A.click('#lobbyGear');
  ok(!(await A.$('#sheetBox [data-k="bots"]')), 'duel : pas de bots dans les paramètres');
  await A.click('#sheetBox [data-k="rounds"] [data-v="5"]');
  await A.click('#sheetBox [data-k="dur"] [data-v="15"]');
  await A.click('#sheetBox .cta[data-close]');
  await A.screenshot({ path: `${OUT}/a04_duel_attente.png` });
  const duelCode = (await A.textContent('#lobbyCode')).trim();
  await ping(B);
  ok(!!(await B.waitForSelector('#chYes', { timeout: 6000 }).catch(() => null)) && (await B.textContent('#sheetBox')).includes('Alice te défie en 1 contre 1 en Rock'), 'Bruno reçoit le défi : « Alice te défie en 1 contre 1 en Rock »');
  await B.screenshot({ path: `${OUT}/a05_defi_recu.png` });
  await B.click('#chYes');
  ok(await until(async () => (await viewOf(A)) === 'v-game' && (await viewOf(B)) === 'v-game', 12000), 'Bruno accepte : le duel démarre tout seul');
  const D = await client(`/api/salon/${duelCode}/ws`, { uid: 'amidylan' + Date.now(), name: 'Dylan' });
  await until(() => D.msgs.some(m => m.t === 'error'), 3000);
  ok(D.msgs.some(m => m.t === 'error' && /complet/.test(m.msg)), 'un 3e joueur est refusé : « Ce duel est complet »');

  // Alice trouve tout ; Bruno rate l'artiste de la 1re manche puis trouve tout
  for (let round = 1; round <= 5; round++) {
    await A.waitForFunction(r => document.querySelector('#gameTitle').innerText.includes(`Manche ${r}/`) &&
      document.querySelector('#reveal').classList.contains('hide') && document.querySelector('#gOverlay').classList.contains('hide'), round, { timeout: 40000 });
    await sleep(1800);
    const [artist, title] = keyOf(await A.$eval('#audio', a => a.src));
    await A.fill('#guessIn', artist); await A.press('#guessIn', 'Enter'); await sleep(200);
    await A.fill('#guessIn', title); await A.press('#guessIn', 'Enter');
    await sleep(300);
    await B.fill('#guessIn', title); await B.press('#guessIn', 'Enter'); await sleep(200);
    if (round > 1) { await B.fill('#guessIn', artist); await B.press('#guessIn', 'Enter'); }
  }
  await A.waitForSelector('#v-end:not(.hide)', { timeout: 40000 });
  await B.waitForSelector('#v-end:not(.hide)', { timeout: 10000 });
  await until(async () => (await A.textContent('#rankBox')).includes('Vos duels'), 5000);
  ok((await A.textContent('#rankBox')).includes('Victoire') && (await A.textContent('#rankBox')).includes('Toi 1 – 0 Bruno'), 'Alice : « Victoire en duel », bilan Toi 1 – 0 Bruno');
  await until(async () => (await B.textContent('#rankBox')).includes('Vos duels'), 5000);
  ok((await B.textContent('#rankBox')).includes('Défaite') && (await B.textContent('#rankBox')).includes('Toi 0 – 1 Alice'), 'Bruno : « Défaite… revanche ? », bilan Toi 0 – 1 Alice');
  ok((await A.textContent('#endNew')).includes('Revanche'), 'l’hôte peut lancer la revanche');
  await A.screenshot({ path: `${OUT}/a06_duel_fin.png` });
  await B.screenshot({ path: `${OUT}/a07_duel_fin_b.png` });
  await A.click('#endHome');
  await B.click('#endHome');
  await A.waitForSelector('#v-home:not(.hide)');

  // 6. refus : le salon d'Alice est prévenu tout de suite
  await A.click('#bFriends');
  await until(async () => !!(await A.$('#friBody [data-duel]')), 5000);
  await A.click('#friBody [data-fp]');
  await A.waitForSelector('#fsDuel');
  ok((await A.textContent('#sheetBox')).includes('Toi 1 – 0 Bruno'), 'fiche de Bruno : bilan des duels');
  await A.click('#fsDuel');
  await A.click('[data-c="kpop"]');
  await A.click('#catsOk');
  await A.waitForSelector('#v-lobby:not(.hide)');
  await sleep(500);
  await ping(B);
  await B.waitForSelector('#chNo', { timeout: 6000 });
  await B.click('#chNo');
  ok(await until(async () => (await A.textContent('#lobbyMsgs')).includes('Bruno ne peut pas jouer maintenant'), 5000), 'Bruno refuse : « Bruno ne peut pas jouer maintenant » dans le salon d’Alice');
  await A.click('#lobbyBack');
  await A.waitForSelector('#v-home:not(.hide)');

  // 7. retirer un ami
  await B.click('#bFriends');
  await until(async () => !!(await B.$('#friBody [data-fp]')), 5000);
  await B.click('#friBody [data-fp]');
  await B.click('#fsDel');
  ok(await toastHas(B, 'ne fait plus partie de tes amis'), 'Bruno retire Alice de ses amis');
  const la = await api(`/api/friends?uid=${uidA}`);
  ok(!la.list.length, 'la relation est retirée des deux côtés');

  ok(!errors.length, `aucune erreur JavaScript${errors.length ? ' : ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(failures ? `\n${failures} échec(s)` : '\nTout est bon ✅');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
