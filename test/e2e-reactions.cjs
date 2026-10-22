// Réactions rapides (version 1.10) de bout en bout (wrangler dev en local avec MOCK_MUSIC=1)
// NODE_PATH=$(npm root -g) node test/e2e-reactions.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 1 min 30)
// salon, partie et fin de partie : l'emoji monte chez tout le monde avec le pseudo ; anti-spam, emojis refusés,
// réglage « Réactions des autres joueurs », rien en solo (bots)
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
// réactions affichées : [{ e, name }]
const bubbles = page => page.$$eval('#reactLayer .rb', bs => bs.map(b => ({ e: b.querySelector('span').textContent, name: b.querySelector('b').textContent })));
const sees = (page, e, name) => until(async () => (await bubbles(page)).some(b => b.e === e && b.name === name), 3000);
const react = (page, view, e) => page.click(`#${view}Reacts [data-react="${e}"]`);

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

  // 1. salon entre amis : Alice crée, Bruno arrive par le lien
  const A = await player(browser, 'Alice');
  await A.waitForSelector('#v-home:not(.hide)');
  await A.click('#bCreate');
  await A.click('[data-c="variete"]');
  await A.click('#catsOk');
  await A.waitForSelector('#v-lobby:not(.hide)');
  const code = (await A.textContent('#lobbyCode')).trim();
  const B = await player(browser, 'Bruno', `${BASE}/?salon=${code}`);
  await B.waitForSelector('#v-lobby:not(.hide)', { timeout: 8000 });
  ok((await A.$$('#lobbyReacts:not(.hide) [data-react]')).length === 5 && (await B.$$('#lobbyReacts:not(.hide) [data-react]')).length === 5, 'salon : 5 réactions 👏 🔥 😂 😮 🎉');

  await react(A, 'lobby', '🔥');
  ok(await sees(B, '🔥', 'Alice'), 'salon : Bruno voit le 🔥 d’Alice avec son pseudo');
  ok(await sees(A, '🔥', 'Toi'), 'salon : Alice voit sa propre réaction (« Toi »)');
  await A.screenshot({ path: `${OUT}/r01_salon_reaction.png` });

  // 2. anti-spam : 10 👏 d'affilée, 5 au plus passent (5 toutes les 3 s)
  await sleep(2800);
  for (let i = 0; i < 10; i++) await react(A, 'lobby', '👏');
  await sleep(700);
  const claps = (await bubbles(B)).filter(b => b.e === '👏').length;
  ok(claps >= 1 && claps <= 5, `anti-spam : ${claps} 👏 sur 10 relayés (5 au plus)`);
  await sleep(3200); // la limite (5 toutes les 3 s) est repassée

  // 3. le serveur refuse les autres emojis et le texte ; une réaction valide d'un 3e joueur passe
  const P = await client(`/api/salon/${code}/ws`, { uid: 'reactpirate01', name: 'Pirate', av: 'A01' });
  await sleep(500);
  P.send({ t: 'react', e: '💩' });
  P.send({ t: 'react', e: '<img src=x onerror=alert(1)>' });
  P.send({ t: 'react', e: '🔥'.repeat(3) });
  await sleep(300);
  P.send({ t: 'react', e: '😮' });
  ok(await sees(B, '😮', 'Pirate'), 'un 3e joueur réagit 😮 : vu par Bruno');
  const all = await bubbles(B);
  ok(!all.some(b => b.e !== '😮' && b.name === 'Pirate') && !(await B.$('#reactLayer img')), 'emojis hors liste et texte refusés par le serveur');
  ok(P.msgs.filter(m => m.t === 'react').every(m => m.e === '😮'), 'le serveur ne relaie que les 5 réactions prévues');
  P.ws.close();

  // 4. réglage « Réactions des autres joueurs » coupé chez Bruno : il ne voit plus celles des autres, toujours les siennes
  await B.evaluate(() => { const S = JSON.parse(localStorage.getItem('hitroom.v1')); S.set.reacts = false; localStorage.setItem('hitroom.v1', JSON.stringify(S)); });
  await B.reload();
  await B.waitForSelector('#v-lobby:not(.hide)', { timeout: 8000 });
  await sleep(500);
  await react(A, 'lobby', '😂');
  ok(await sees(A, '😂', 'Toi'), 'Alice voit son 😂');
  ok(!(await sees(B, '😂', 'Alice')), 'réglage coupé : Bruno ne voit plus les réactions d’Alice');
  await react(B, 'lobby', '🎉');
  ok(await sees(B, '🎉', 'Toi') && await sees(A, '🎉', 'Bruno'), 'réglage coupé : Bruno voit toujours les siennes, Alice aussi');
  await B.evaluate(() => { const S = JSON.parse(localStorage.getItem('hitroom.v1')); S.set.reacts = true; localStorage.setItem('hitroom.v1', JSON.stringify(S)); });
  await B.reload();
  await B.waitForSelector('#v-lobby:not(.hide)', { timeout: 8000 });

  // 5. partie : barre de réactions en bas à gauche, sans toucher au bouton du chat ni sortir de l'écran
  await A.click('#lobbyParams');
  await A.click('[data-k="rounds"] [data-v="5"]');
  await A.click('[data-k="dur"] [data-v="15"]');
  await A.click('#sheetBox .cta');
  await sleep(300);
  await A.click('#lobbyStart');
  const answer = async page => {
    const [artist, title] = decodeURIComponent((await page.$eval('#audio', a => a.src)).match(/__mock\/a\/(.+)\.wav/)[1]).split('|');
    return { artist, title };
  };
  for (let round = 1; round <= 5; round++) {
    for (const pg of [A, B]) {
      await pg.waitForFunction(r => document.querySelector('#gameTitle').innerText.includes(`Manche ${r}/`) &&
        document.querySelector('#reveal').classList.contains('hide') && document.querySelector('#gOverlay').classList.contains('hide'), round, { timeout: 40000 });
    }
    if (round === 1) {
      const box = await B.$eval('#gameReacts', e => { const r = e.getBoundingClientRect(), f = document.querySelector('#chatFab').getBoundingClientRect(); return { r: [r.left, r.right, r.top, r.bottom], f: [f.left, f.right, f.top, f.bottom], w: innerWidth, h: innerHeight, vis: !e.classList.contains('hide') }; });
      ok(box.vis && box.r[0] >= 0 && box.r[1] <= box.w && box.r[3] <= box.h && box.r[1] < box.f[0], 'partie : barre de réactions visible, dans l’écran, à côté du bouton chat');
      await react(B, 'game', '😮');
      ok(await sees(A, '😮', 'Bruno'), 'partie : Alice voit le 😮 de Bruno pendant la manche');
      await A.screenshot({ path: `${OUT}/r02_partie_reaction.png` });
    }
    await sleep(700); // le temps que l'extrait de la manche arrive
    for (const pg of [A, B]) {
      const a = await answer(pg);
      await pg.fill('#guessIn', a.title);
      await pg.press('#guessIn', 'Enter');
      await sleep(150);
      await pg.fill('#guessIn', a.artist);
      await pg.press('#guessIn', 'Enter');
    }
  }

  // 6. fin de partie : réactions sous le podium
  await A.waitForSelector('#v-end:not(.hide)', { timeout: 40000 });
  await B.waitForSelector('#v-end:not(.hide)', { timeout: 40000 });
  ok(!(await B.$eval('#endReacts', e => e.classList.contains('hide'))), 'fin de partie : réactions sous le podium');
  await react(B, 'end', '👏');
  ok(await sees(A, '👏', 'Bruno'), 'fin de partie : Alice voit le 👏 de Bruno');
  await A.screenshot({ path: `${OUT}/r03_fin_reaction.png` });

  // 7. solo : pas de barre de réactions, et le serveur ne relaie rien (ni du joueur ni des bots)
  const C = await player(browser, 'Chloé');
  await C.waitForSelector('#v-home:not(.hide)');
  await C.click('#bSolo');
  await C.click('#soloLvl [data-l="0"]');
  await C.click('[data-c="rock"]');
  await C.click('#catsOk');
  await C.waitForSelector('#v-game:not(.hide)', { timeout: 10000 });
  await sleep(600);
  ok(await C.$eval('#gameReacts', e => e.classList.contains('hide')), 'solo : pas de barre de réactions');
  const S = await client('/api/solo/reactsolo0001/ws', { uid: 'reactsolo01', name: 'Solo', create: 1, cat: 'rock', botlvl: 0 });
  await sleep(600);
  S.send({ t: 'react', e: '🔥' });
  await sleep(3000);
  ok(!S.msgs.some(m => m.t === 'react'), 'solo : réaction refusée par le serveur, aucun bot ne réagit');
  S.ws.close();

  ok(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failures ? `${failures} échec(s)` : 'Tout est bon');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
