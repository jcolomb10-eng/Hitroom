// Bloquer et signaler un joueur (version 1.12) de bout en bout (wrangler dev en local avec MOCK_MUSIC=1 et ADMIN_KEY=essai-local)
// NODE_PATH=$(npm root -g) node test/e2e-signaler.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 1 min)
// bloquer depuis le chat (messages et réactions masqués, dans tous les salons, gardé après rechargement), débloquer
// dans les Paramètres, signaler (motif), 3 signalements de personnes différentes = chat suspendu, /api/signalements
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const WS = BASE.replace(/^http/, 'ws');
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const until = async (fn, ms, step = 150) => { for (let t = 0; t < ms; t += step) { if (await fn()) return true; await sleep(step); } return !!(await fn()); };
function client(path, q) {
  const ws = new WebSocket(`${WS}${path}?${new URLSearchParams(q)}`);
  const c = { ws, msgs: [] };
  ws.onmessage = e => c.msgs.push(JSON.parse(e.data));
  c.send = m => ws.send(JSON.stringify(m));
  c.me = () => c.msgs.find(m => m.t === 'welcome')?.you;
  return new Promise(res => { ws.onopen = () => res(c); ws.onerror = () => res(c); });
}
const errors = [];
async function player(browser, name, url = BASE + '/') {
  const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  page.on('dialog', d => d.accept());
  page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
  await page.goto(url);
  await page.click('#loginGuest');
  await page.fill('#onbName', name);
  await page.click('#onbGo');
  return page;
}
const chatText = page => page.$$eval('#lobbyMsgs .msg', m => m.map(x => x.innerText).join('\n'));
const run = Date.now().toString(36);

(async () => {
  const browser = await chromium.launch();
  const A = await player(browser, 'Alice');
  await A.waitForSelector('#v-home:not(.hide)');
  await A.click('#bCreate');
  await A.click('[data-c="rock"]');
  await A.click('#catsOk');
  await A.waitForSelector('#v-lobby:not(.hide)');
  const code = (await A.textContent('#lobbyCode')).trim();
  const B = await player(browser, 'Bruno', `${BASE}/?salon=${code}`);
  await B.waitForSelector('#v-lobby:not(.hide)', { timeout: 8000 });
  const T = await client(`/api/salon/${code}/ws`, { uid: 'trollsignal' + run, name: 'Troll', av: 'A03' });
  await sleep(500);
  T.send({ t: 'chat', text: 'premier message du troll' });
  ok(await until(async () => (await chatText(B)).includes('premier message du troll'), 3000), 'Bruno voit le message de Troll');

  // 1. Bruno touche le pseudo de Troll dans le chat → carte → Bloquer
  await B.click('#lobbyMsgs [data-cp]');
  await B.waitForSelector('#pcBlock');
  ok((await B.textContent('#pcBlock')).includes('Bloquer') && !!(await B.$('#pcReport')), 'carte du joueur : boutons Bloquer et Signaler');
  await B.screenshot({ path: `${OUT}/s01_carte.png` });
  await B.click('#pcBlock');
  ok((await B.textContent('#pcBlock')).includes('Débloquer'), 'Troll bloqué (bouton Débloquer)');
  await B.click('#sheet [data-close]');
  ok(!(await chatText(B)).includes('premier message du troll'), 'ses anciens messages disparaissent chez Bruno');
  await sleep(800);
  T.send({ t: 'chat', text: 'deuxième message du troll' });
  T.send({ t: 'react', e: '😂' });
  ok(await until(async () => (await chatText(A)).includes('deuxième message du troll'), 3000), 'Alice (qui n’a pas bloqué) voit toujours ses messages');
  await sleep(500);
  ok(!(await chatText(B)).includes('deuxième message du troll'), 'Bruno ne voit plus ses nouveaux messages');
  ok(!(await B.$$eval('#reactLayer .rb b', bs => bs.map(b => b.textContent))).includes('Troll'), 'Bruno ne voit plus ses réactions');
  const pk = (await B.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).blocked))[0]?.pk;
  ok(/^[0-9a-f]{12}$/.test(pk || '') && !pk.includes('trollsignal'), 'blocage par identifiant public (l’uid secret n’est jamais envoyé)');

  // 2. blocage gardé après rechargement, puis débloquer dans les Paramètres
  await B.reload();
  await B.waitForSelector('#v-lobby:not(.hide)', { timeout: 8000 });
  await sleep(500);
  ok(!(await chatText(B)).includes('message du troll'), 'après rechargement : Troll toujours bloqué');
  await B.click('#lobbyBack').catch(() => {});
  await B.waitForSelector('#v-home:not(.hide)', { timeout: 5000 }).catch(() => {});
  await B.click('#tabbar [data-tab="profile"]');
  await B.click('#profSet');
  ok((await B.textContent('#blockBtn')).includes('1'), 'Paramètres : « Joueurs bloqués 1 »');
  await B.click('#blockBtn');
  ok((await B.textContent('#sheetBox')).includes('Troll'), 'liste des joueurs bloqués : Troll');
  await B.screenshot({ path: `${OUT}/s02_bloques.png` });
  await B.click('[data-ub="0"]');
  ok((await B.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).blocked)).length === 0, 'Troll débloqué');
  await B.click('#sheet [data-close]');

  // 3. Alice signale Troll : motif obligatoire, « Bloquer aussi » coché
  await A.click('#lobbyMsgs [data-cp]');
  await A.click('#pcReport');
  ok(await A.$eval('#repGo', b => b.disabled), 'signalement : il faut choisir un motif');
  await A.click('[data-why="insultes"]');
  await A.screenshot({ path: `${OUT}/s03_signaler.png` });
  await A.click('#repGo');
  ok(await until(async () => (await A.textContent('#toast')).includes('Merci'), 3000), 'signalement envoyé (message de remerciement)');
  ok((await A.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).blocked)).some(b => b.name === 'Troll'), '« Bloquer aussi » : Troll bloqué chez Alice');

  // 4. deux autres joueurs signalent Troll → 3 personnes : chat suspendu 24 h
  const id = T.me();
  const C = await client(`/api/salon/${code}/ws`, { uid: 'temoinc' + run, name: 'Chloé', av: 'A04' });
  const D = await client(`/api/salon/${code}/ws`, { uid: 'temoind' + run, name: 'Dan', av: 'A05' });
  await sleep(400);
  C.send({ t: 'report', id, why: 'spam' });
  C.send({ t: 'report', id, why: 'spam' }); // deux fois la même personne : compte pour un
  await sleep(500);
  ok(!T.msgs.some(m => m.t === 'sys' && m.text.includes('suspendu')), 'deux personnes : pas encore suspendu');
  D.send({ t: 'report', id, why: 'insultes' });
  ok(await until(() => T.msgs.some(m => m.t === 'sys' && m.text.includes('suspendu')), 3000), '3 personnes différentes : Troll prévenu, chat suspendu');
  const before = C.msgs.length;
  T.send({ t: 'chat', text: 'message après suspension' });
  await sleep(800);
  ok(!C.msgs.slice(before).some(m => m.t === 'chat' && m.text === 'message après suspension'), 'chat suspendu : son message n’est pas diffusé');
  ok(C.msgs.some(m => m.t === 'reported' && m.ok) && D.msgs.some(m => m.t === 'reported' && m.ok), 'les signalements répondent « reçu »');
  // en revenant dans un autre salon, il est toujours suspendu
  T.ws.close();
  const T2 = await client(`/api/open/rock/ws`, { uid: 'trollsignal' + run, name: 'Troll', av: 'A03' });
  const W = await client(`/api/open/rock/ws`, { uid: 'temoinw' + run, name: 'Wanda', av: 'A06' });
  await sleep(700);
  T2.send({ t: 'chat', text: 'je suis ailleurs' });
  await sleep(800);
  ok(!W.msgs.some(m => m.t === 'chat' && m.text === 'je suis ailleurs') && T2.msgs.some(m => m.t === 'sys' && m.text.includes('suspendu')), 'dans un autre salon : toujours suspendu');

  // 5. liste pour le propriétaire : protégée par ADMIN_KEY
  const bad = await fetch(`${BASE}/api/signalements?key=faux`);
  ok(bad.status === 403, '/api/signalements : refusé sans la bonne clé');
  const list = await (await fetch(`${BASE}/api/signalements?key=essai-local`)).json();
  const tr = list.find(x => x.name === 'Troll');
  ok(tr && tr.n === 3 && tr.muted && tr.why.insultes === 2 && tr.msgs.includes('premier message du troll') && !JSON.stringify(list).includes('trollsignal'),
    `/api/signalements : Troll, 3 signalements, motifs, messages, sans uid (${JSON.stringify(tr)})`);

  for (const c of [C, D, T2, W]) c.ws.close();
  ok(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failures ? `${failures} échec(s)` : 'Tout est bon');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
