// Clubs (version 1.15) de bout en bout (wrangler dev en local avec MOCK_MUSIC=1)
// NODE_PATH=$(npm root -g) node test/e2e-clubs.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 2 min)
// créer (nom refusé, nom déjà pris), rejoindre par le lien ?club=, tuile de l'accueil, nom du club dans les salons,
// points des parties publiques et du Hit du jour (pas des salons privés), classement des clubs, modifier, exclure,
// quitter, club vide effacé
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
const post = async (p, b) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json();
const errors = [];
const tag = Date.now().toString(36).slice(-4);
function client(path, q) {
  const ws = new WebSocket(`${WS}${path}?${new URLSearchParams(q)}`);
  const c = { ws, msgs: [], last: null };
  ws.onmessage = e => { const m = JSON.parse(e.data); c.msgs.push(m); if (m.t === 'state') c.last = m; };
  c.send = m => ws.send(JSON.stringify(m));
  return new Promise(res => { ws.onopen = () => res(c); ws.onerror = () => res(c); });
}
const keyOf = url => decodeURIComponent(url.match(/__mock\/a\/(.+)\.wav/)[1]).split('|');
// joue une partie entière sans navigateur en trouvant tout ; renvoie le score final du joueur
async function playAll(c, name) {
  let round = 0;
  await until(async () => {
    const st = c.last;
    if (st?.phase === 'play' && st.round !== round && Date.now() > st.cur.start + 100) {
      round = st.round;
      const [artist, title] = keyOf(st.cur.url);
      c.send({ t: 'guess', text: artist, enter: true });
      await sleep(200);
      c.send({ t: 'guess', text: title, enter: true });
    }
    return round > 0 && st?.phase === 'end';
  }, 150000, 120);
  return c.last.results.find(p => p.name === name)?.score || 0;
}
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
const toastHas = (page, txt) => until(async () => (await page.textContent('#toast')).includes(txt), 4000);

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const A = await player(browser, 'Anna');
  await A.waitForSelector('#v-home:not(.hide)');
  const uidA = await A.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).uid);

  // 1. pas de club : tuile de l'accueil, page « Rejoins un club »
  ok((await A.textContent('#bClub')).includes('Rejoins une équipe'), 'accueil : tuile Clubs « Rejoins une équipe »');
  await A.click('#bClub');
  await A.waitForSelector('#clubNew');
  ok((await A.textContent('#clubBody')).includes('Rejoins un club'), 'page des clubs : explication et « Créer mon club »');

  // 2. créer : nom grossier refusé, nom déjà pris refusé, puis le bon
  const taken = 'Pris ' + tag;
  await post('/api/club', { uid: 'clubautre' + tag + '000', act: 'create', name: taken, e: '🎸', c: 1 });
  await A.click('#clubNew');
  await A.fill('#cName', 'connard');
  await A.click('#cGo');
  ok(await toastHas(A, 'Nom refusé'), 'nom grossier : « Nom refusé »');
  await A.fill('#cName', taken.toUpperCase());
  await A.click('#cGo');
  ok(await toastHas(A, 'déjà pris'), 'nom déjà pris (majuscules ignorées) : refusé');
  const name = 'Les Dragons ' + tag;
  await A.fill('#cName', name);
  await A.click('#sheetBox [data-ce="🐉"]');
  await A.click('#sheetBox [data-cc="4"]');
  await A.screenshot({ path: `${OUT}/c01_creer.png` });
  await A.click('#cGo');
  await until(async () => (await A.textContent('#clubTitle')) === name, 5000);
  ok((await A.textContent('#clubBody')).includes('1/30') && !!(await A.$('#clubEdit')) && (await A.textContent('#clubBody')).includes('👑'), 'club créé : 1/30 membre, Anna chef 👑, bouton Modifier');
  await A.screenshot({ path: `${OUT}/c02_club.png` });
  const id = await A.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).club?.id);
  ok(/^[A-Z2-9]{6}$/.test(id || ''), `identifiant du club gardé dans l’appli (${id})`);
  await A.click('#v-club .back');
  await until(async () => (await A.textContent('#clubTile')) === name, 4000);
  ok((await A.textContent('#clubTile')) === name && !!(await A.$('#clubPic .cbadge')), 'accueil : la tuile montre le blason et le nom du club');

  // 3. Basile rejoint avec le lien d'invitation ?club=
  const B = await player(browser, 'Basile', `${BASE}/?club=${id}`);
  await B.waitForSelector('#clubJoin', { timeout: 8000 });
  ok((await B.textContent('#clubTitle')) === name, 'lien ?club= : la page du club s’ouvre après l’inscription');
  await B.click('#clubJoin');
  ok(await toastHas(B, 'Bienvenue'), 'Basile rejoint le club');
  await until(async () => (await B.textContent('#clubBody')).includes('2/30'), 4000);
  ok((await B.textContent('#clubBody')).includes('2/30') && !!(await B.$('#clubLeave')) && !(await B.$('#clubEdit')), '2/30 membres ; Basile peut quitter, pas modifier');
  const uidB = await B.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).uid);

  // 4. le nom du club s'affiche dans les salons (donné par le serveur)
  await B.click('#v-club .back');
  await B.click('#bCreate');
  await B.click('[data-c="80"]');
  await B.click('#catsOk');
  await B.waitForSelector('#v-lobby:not(.hide)');
  ok(await until(async () => (await B.textContent('#lobbyPlayers')).includes('🐉 ' + name), 4000), 'salon : « 🐉 nom du club » sous le pseudo');
  const code = (await B.textContent('#lobbyCode')).trim();
  const fake = await client(`/api/salon/${code}/ws`, { uid: 'clubtricheur' + tag, name: 'Triche', club: '👑 Faux club' });
  await until(() => !!fake.last, 3000);
  ok(fake.last.players.find(p => p.name === 'Triche')?.club === '', 'un faux nom de club envoyé par l’appli est ignoré');
  await B.click('#lobbyPlayers [data-pid]:has-text("Basile")');
  ok((await B.textContent('#sheetBox')).includes(name), 'carte de joueur : le club');
  await B.click('#sheetBox [data-close]');
  fake.ws.close();
  await B.click('#lobbyBack');
  await B.waitForSelector('#v-home:not(.hide)');

  // 5. points : partie non classée et Hit du jour comptent, salon privé non
  const sc0 = (await api(`/api/club/${id}?uid=${uidA}`)).pts;
  const pv = await client(`/api/solo/club${tag}x1/ws`, { uid: uidB, name: 'Basile', create: 1, cat: 'rock' });
  await playAll(pv, 'Basile');
  pv.ws.close();
  ok((await api(`/api/club/${id}?uid=${uidA}`)).pts === sc0, 'partie solo : pas de points pour le club');
  const op = await client('/api/open/rock/ws', { uid: uidB, name: 'Basile' });
  const s1 = await playAll(op, 'Basile');
  op.ws.close();
  await sleep(500);
  const c1 = await api(`/api/club/${id}?uid=${uidA}`);
  ok(s1 > 0 && c1.pts === sc0 + s1 && c1.members.find(m => m.name === 'Basile')?.pts === s1, `partie non classée : +${s1} pts pour le club (${c1.pts}) et pour Basile`);
  const hit = await client('/api/hit/ws', { uid: uidA, name: 'Anna', create: 1 });
  const s2 = await playAll(hit, 'Anna');
  hit.ws.close();
  await sleep(500);
  const c2 = await api(`/api/club/${id}?uid=${uidA}`);
  ok(s2 > 0 && c2.pts === c1.pts + s2 && c2.rank >= 1, `Hit du jour : +${s2} pts pour le club (place #${c2.rank})`);

  // 6. classement des clubs
  await A.click('#tabbar [data-tab="board"]');
  await A.click('[data-bt="clubs"]');
  await until(async () => (await A.textContent('#boardList')).includes(name), 5000);
  ok((await A.textContent('#boardList')).includes(name) && (await A.textContent('#boardList')).includes(`${c2.pts}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')), 'onglet Clubs du classement : le club et ses points');
  await A.screenshot({ path: `${OUT}/c03_classement_clubs.png` });
  await A.click(`#boardList [data-club="${id}"]`);
  ok(await until(async () => (await A.textContent('#clubTitle')) === name && (await A.textContent('#clubBody')).includes('Basile'), 5000), 'toucher un club du classement : sa page et ses membres');

  // 7. le chef modifie le club ; un membre ne peut pas
  await A.click('#clubEdit');
  await A.fill('#cName', name + '!');
  await A.click('#sheetBox [data-ce="🚀"]');
  await A.click('#cGo');
  ok(await until(async () => (await A.textContent('#clubTitle')) === name + '!', 5000), 'le chef renomme le club');
  ok((await post('/api/club', { uid: uidB, act: 'edit', name: 'Pirate' })).why === 'chief', 'un simple membre ne peut pas modifier le club');

  // 8. exclure : Basile ne peut pas revenir tout de suite
  await A.click(`#clubBody [data-mk]:has-text("Basile")`);
  ok(await toastHas(A, 'exclu'), 'le chef exclut Basile');
  ok(!(await api(`/api/clubs?uid=${uidB}`)).mine && (await post('/api/club', { uid: uidB, act: 'join', id })).why === 'banned', 'Basile exclu : plus membre, et ne peut pas revenir avant 7 jours');

  // 9. quitter : le club vide disparaît
  await A.click('#clubLeave');
  ok(await toastHas(A, 'quitté le club'), 'Anna quitte le club');
  ok(!!(await api(`/api/club/${id}`)).error, 'club vide : effacé');
  ok(await until(async () => !!(await A.$('#clubNew')), 4000), 'retour à la page « Rejoins un club »');

  ok(!errors.length, `aucune erreur JavaScript${errors.length ? ' : ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(failures ? `\n${failures} échec(s)` : '\nTout est bon ✅');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
