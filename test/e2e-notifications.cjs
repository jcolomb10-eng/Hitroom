// Notifications (version 1.13) de bout en bout — wrangler dev en local avec MOCK_MUSIC=1 (rien n'est envoyé : /__mock/push)
// NODE_PATH=$(npm root -g) node test/e2e-notifications.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 1 min)
// activer depuis les Paramètres (service du téléphone simulé), préférences, rappel quotidien seulement si pas encore joué,
// nouvelle saison le 1er, signature VAPID valide, boîte de messages, notification affichée par le service worker,
// invitations à ses partenaires de jeu (limites, refus si bloqué ou coupé), lien ?go=defis
const { chromium, devices } = require('playwright');
const { webcrypto } = require('crypto');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const until = async (fn, ms, step = 150) => { for (let t = 0; t < ms; t += step) { if (await fn()) return true; await sleep(step); } return !!(await fn()); };
const errors = [];
const run = Date.now().toString(36);
const post = async (path, body) => (await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
const mock = async () => (await fetch(BASE + '/__mock/push')).json();
const b64u = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// le service de notifications du navigateur n'est pas joignable en test : abonnement simulé, adresse https propre au joueur
const fakePush = name => `(() => {
  const endpoint = 'https://push.example.test/${name}-${run}';
  const sub = { endpoint, toJSON: () => ({ endpoint }), unsubscribe: async () => { localStorage.removeItem('fakesub'); return true; } };
  PushManager.prototype.subscribe = async function () { localStorage.setItem('fakesub', '1'); return sub; };
  PushManager.prototype.getSubscription = async function () { return localStorage.getItem('fakesub') ? sub : null; };
})()`;
async function player(browser, name, url = BASE + '/') {
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx.grantPermissions(['notifications'], { origin: BASE });
  await ctx.addInitScript(fakePush(name));
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
  await page.goto(url);
  await page.click('#loginGuest');
  await page.fill('#onbName', name);
  await page.click('#onbGo');
  await page.waitForSelector('#v-home:not(.hide)');
  return page;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chromium' }); // le Chromium allégé refuse les notifications
  // 1. Alice active les notifications dans les Paramètres
  const A = await player(browser, 'Alice');
  await A.click('#tabbar [data-tab="defis"]');
  ok(await A.isVisible('#defiNotif'), 'Défis : « Me rappeler mes défis chaque jour »');
  await A.click('#defiNotif');
  ok((await A.$$('#sheetBox [data-np]')).length === 4 && await A.isVisible('#notifGo'), 'fiche Notifications : 4 choix et bouton Activer');
  await A.screenshot({ path: `${OUT}/n01_notifications.png` });
  await A.click('#notifGo');
  ok(await until(async () => (await A.textContent('#toast')).includes('activées'), 5000), 'notifications activées');
  let m = await mock();
  ok(m.subs.length >= 1, `abonnement enregistré sur le serveur (${m.subs.length})`);
  ok(m.log.some(l => l.endpoint.includes('Alice-' + run) && l.title.includes('activées')), 'notification de bienvenue envoyée à l’activation');
  const welcome = await post('/api/push/inbox', { endpoint: `https://push.example.test/Alice-${run}` });
  ok(welcome.length === 1 && welcome[0].title.includes('activées'), 'boîte d’Alice : le message de bienvenue');
  await A.click('#sheetBox [data-np="season"]');
  await sleep(600);
  m = await mock();
  const prefsA = m.subs.map(s => JSON.parse(s.prefs)).find(p => p.season === false);
  ok(prefsA && prefsA.daily && prefsA.invites, 'préférence « Nouvelle saison » coupée, envoyée au serveur');
  await A.click('#sheet [data-close]');
  ok(!(await A.isVisible('#defiNotif')), 'Défis : le rappel n’est plus proposé une fois activé');

  // 2. rappel du jour : pas pour Alice (elle a déjà ouvert l'appli aujourd'hui), oui pour un joueur absent
  await post('/api/push/sub', { uid: 'absentjoueur' + run, endpoint: `https://push.example.test/absent-${run}`, prefs: {} });
  await post('/api/push/inbox', { endpoint: `https://push.example.test/absent-${run}` }); // message de bienvenue lu
  const n0 = (await mock()).log.length;
  await fetch(BASE + '/__mock/cron');
  m = await mock();
  const sent = m.log.slice(n0);
  ok(sent.some(l => l.endpoint.includes('absent-' + run) && l.title.includes('défis')), 'rappel des défis envoyé au joueur qui n’a pas joué aujourd’hui');
  ok(!sent.some(l => l.endpoint.includes('Alice-' + run)), 'pas de rappel pour Alice, déjà venue aujourd’hui');
  // signature VAPID : vérifiée avec la clé publique du serveur
  const { key } = await (await fetch(BASE + '/api/push/key')).json();
  const auth = sent.find(l => l.endpoint.includes('absent-' + run)).auth;
  const [, jwt, k] = auth.match(/^vapid t=([^,]+), k=(.+)$/);
  const [h, p, sig] = jwt.split('.');
  const pub = await webcrypto.subtle.importKey('raw', b64u(key), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const valid = await webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, b64u(sig), Buffer.from(`${h}.${p}`));
  const claims = JSON.parse(b64u(p).toString());
  ok(valid && k === key && claims.aud === 'https://push.example.test' && claims.exp > Date.now() / 1000, 'jeton VAPID signé et valide (audience du service, expiration)');
  // boîte de messages lue par le service worker, puis vidée
  const inbox = await post('/api/push/inbox', { endpoint: `https://push.example.test/absent-${run}` });
  ok(inbox.length === 1 && inbox[0].url === '/?go=defis', 'boîte de messages : le rappel, avec le lien vers les Défis');
  ok((await post('/api/push/inbox', { endpoint: `https://push.example.test/absent-${run}` })).length === 0, 'boîte vidée après lecture');
  // 1er du mois : nouvelle saison, sauf pour Alice qui l'a coupée
  const n1 = (await mock()).log.length;
  await fetch(BASE + '/__mock/cron?first=1');
  const season = (await mock()).log.slice(n1);
  ok(season.some(l => l.endpoint.includes('absent-' + run) && l.title.includes('saison')) && !season.some(l => l.endpoint.includes('Alice-' + run)), 'nouvelle saison : envoyée, sauf à qui l’a coupée');
  // abonnement disparu chez le service : effacé
  await post('/api/push/sub', { uid: 'partijoueur' + run, endpoint: `https://push.example.test/gone-${run}`, prefs: {} });
  await fetch(BASE + '/__mock/cron');
  ok(!(await mock()).subs.some(s => s.endpoint.includes('gone-' + run)), 'abonnement disparu chez le service (410) : effacé');
  ok((await post('/api/push/sub', { uid: 'x' + run + 'yyyyy', endpoint: 'http://pas-https.test/x', prefs: {} })).ok === 0, 'adresse non https refusée');

  // 3. le service worker affiche la notification (push simulé par le navigateur)
  const cdp = await A.context().newCDPSession(A);
  const regs = [];
  cdp.on('ServiceWorker.workerRegistrationUpdated', e => regs.push(...e.registrations));
  await cdp.send('ServiceWorker.enable');
  await until(() => regs.length > 0, 3000);
  await cdp.send('ServiceWorker.deliverPushMessage', { origin: BASE, registrationId: regs[0].registrationId, data: '' });
  ok(await until(async () => (await A.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).length)) > 0, 4000), 'le service worker affiche une notification à la réception');

  // 4. invitations : Bruno a joué avec Alice ; il active les notifications
  await A.click('#tabbar [data-tab="home"]');
  await A.click('#bCreate');
  await A.click('[data-c="rock"]');
  await A.click('#catsOk');
  await A.waitForSelector('#v-lobby:not(.hide)');
  const code1 = (await A.textContent('#lobbyCode')).trim();
  const B = await player(browser, 'Bruno', `${BASE}/?salon=${code1}`);
  await B.waitForSelector('#v-lobby:not(.hide)', { timeout: 8000 });
  await sleep(600);
  ok((await A.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).mates)).some(x => x.name === 'Bruno'), 'Bruno noté parmi les partenaires de jeu d’Alice');
  await B.click('#lobbyBack');
  await B.waitForSelector('#v-home:not(.hide)');
  await B.evaluate(() => { const S = JSON.parse(localStorage.getItem('hitroom.v1')); S.push = { on: false }; localStorage.setItem('hitroom.v1', JSON.stringify(S)); });
  await B.click('#tabbar [data-tab="profile"]');
  await B.click('#profSet');
  await B.click('#notifBtn');
  await B.click('#notifGo');
  await until(async () => (await B.textContent('#toast')).includes('activées'), 5000);
  // Alice ouvre un nouveau salon et invite Bruno
  await A.click('#lobbyBack');
  await A.waitForSelector('#v-home:not(.hide)');
  await A.click('#bCreate');
  await A.click('[data-c="80"]');
  await A.click('#catsOk');
  await A.waitForSelector('#v-lobby:not(.hide)');
  const code2 = (await A.textContent('#lobbyCode')).trim();
  await A.click('#lobbyInvite');
  ok(await A.isVisible('#invShare') && (await A.textContent('#sheetBox')).includes('Bruno'), 'Inviter : partager le lien, et Bruno dans les partenaires');
  await A.screenshot({ path: `${OUT}/n02_inviter.png` });
  await A.click('#sheetBox [data-inv]');
  ok(await until(async () => (await A.textContent('#toast')).includes('Invitation envoyée'), 4000), 'invitation envoyée à Bruno');
  const inv = (await post('/api/push/inbox', { endpoint: `https://push.example.test/Bruno-${run}` })).filter(x => !x.title.includes('activées'));
  ok(inv.length === 1 && inv[0].title.includes('Alice') && inv[0].url === `/?salon=${code2}`, `Bruno reçoit « ${inv[0]?.title} » avec le lien du salon`);
  // 3e invitation dans l'heure : refusée
  await A.evaluate(() => { document.querySelector('#sheetBox [data-inv]').disabled = false; });
  await A.click('#sheetBox [data-inv]'); await sleep(500);
  await A.evaluate(() => { document.querySelector('#sheetBox [data-inv]').disabled = false; });
  await A.click('#sheetBox [data-inv]');
  ok(await until(async () => (await A.textContent('#toast')).includes('déjà invité'), 4000), '3e invitation dans l’heure : « tu as déjà invité »');
  // Chloé (dans le même salon) invite Bruno : reçu ; Bruno la bloque ; sa 2e invitation est refusée sans dire pourquoi
  const brunoPk = (await A.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).mates)).find(x => x.name === 'Bruno').pk;
  const chloeUid = 'chloeinvite' + run;
  const { publicKey } = await import('../src/ids.js');
  const C = new WebSocket(BASE.replace(/^http/, 'ws') + `/api/salon/${code2}/ws?uid=${chloeUid}&name=Chloé`);
  const cmsgs = [];
  C.onmessage = e => cmsgs.push(JSON.parse(e.data));
  await new Promise(r => { C.onopen = r; });
  C.send(JSON.stringify({ t: 'invite', pk: brunoPk }));
  ok(await until(() => cmsgs.some(x => x.t === 'invited' && x.ok), 3000), 'Chloé invite Bruno : envoyé');
  await B.evaluate(pk => { const S = JSON.parse(localStorage.getItem('hitroom.v1')); S.blocked = [{ pk, name: 'Chloé', ts: Date.now() }]; S.push.d = ''; localStorage.setItem('hitroom.v1', JSON.stringify(S)); }, publicKey(chloeUid));
  await B.reload();
  await B.waitForSelector('#v-home:not(.hide)');
  ok(await until(async () => (await mock()).subs.map(s => JSON.parse(s.prefs)).some(p => (p.blocked || []).includes(publicKey(chloeUid))), 4000), 'blocage transmis au serveur avec l’abonnement de Bruno');
  C.send(JSON.stringify({ t: 'invite', pk: brunoPk }));
  ok(await until(() => cmsgs.some(x => x.t === 'invited' && !x.ok && x.why === 'off'), 3000), 'Bruno a bloqué Chloé : invitation refusée (« pas de notifications », sans dire qu’il l’a bloquée)');
  C.close();
  // lien ?go=defis (notification du rappel)
  await B.goto(BASE + '/?go=defis');
  await B.waitForSelector('#v-defis:not(.hide)', { timeout: 6000 });
  ok(true, 'lien de la notification : ouvre les Défis');

  ok(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failures ? `${failures} échec(s)` : 'Tout est bon');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
