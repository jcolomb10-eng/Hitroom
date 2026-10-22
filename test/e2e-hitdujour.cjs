// Hit du jour (version 1.15) de bout en bout (wrangler dev en local avec MOCK_MUSIC=1)
// NODE_PATH=$(npm root -g) node test/e2e-hitdujour.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 2 min 30)
// tuile de l'accueil, règle avant de jouer, partie de 5 extraits, réponse fausse effacée après Entrée, grille et partage
// façon Wordle, bonus de pièces, classement du jour, mêmes extraits pour tout le monde, un seul essai (même quitté en route),
// série de jours, lien ?hit
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const WS = BASE.replace(/^http/, 'ws');
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const until = async (fn, ms, step = 150) => { for (let t = 0; t < ms; t += step) { if (await fn()) return true; await sleep(step); } return !!(await fn()); };
const DAY = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const N = Math.round((Date.parse(DAY + 'T12:00:00Z') - Date.parse('2026-10-21T12:00:00Z')) / 86400000);
const YESTERDAY = new Date(Date.parse(DAY + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);
const api = async p => (await fetch(BASE + p)).json();
const errors = [];

function client(q) {
  const ws = new WebSocket(`${WS}/api/hit/ws?${new URLSearchParams(q)}`);
  const c = { ws, msgs: [], last: null };
  ws.onmessage = e => { const m = JSON.parse(e.data); c.msgs.push(m); if (m.t === 'state') c.last = m; };
  c.send = m => ws.send(JSON.stringify(m));
  return new Promise(res => { ws.onopen = () => res(c); ws.onerror = () => res(c); });
}
const keyOf = url => decodeURIComponent(url.match(/__mock\/a\/(.+)\.wav/)[1]).split('|');
// joueur sans navigateur : trouve tout pendant `rounds` manches, puis s'arrête ; renvoie les réponses entendues
async function playWs(c, rounds = 5) {
  const heard = [];
  let round = 0;
  await until(async () => {
    const st = c.last;
    if (st?.phase === 'reveal' && st.reveal && !heard.some(h => h.round === st.round)) heard.push({ round: st.round, t: st.reveal.t, a: st.reveal.a });
    if (st?.phase === 'play' && st.round !== round && Date.now() > st.cur.start + 100) {
      round = st.round;
      if (round <= rounds) {
        const [artist, title] = keyOf(st.cur.url);
        c.send({ t: 'guess', text: artist, enter: true });
        await sleep(200);
        c.send({ t: 'guess', text: title, enter: true });
      }
    }
    return st?.phase === 'end' || (round > rounds);
  }, 150000, 120);
  return heard;
}

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  // partage : on garde le texte au lieu d'ouvrir la fenêtre du téléphone
  await ctx.addInitScript(() => { window.__shared = []; navigator.share = d => { window.__shared.push(d); return Promise.resolve(); }; });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  page.on('pageerror', e => errors.push(e.message));
  const shot = name => page.screenshot({ path: `${OUT}/${name}.png` });
  await page.goto(BASE + '/');
  await page.click('#loginGuest');
  await page.fill('#onbName', 'Hélène');
  await page.click('#onbGo');
  await page.waitForSelector('#v-home:not(.hide)');
  const uid = await page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).uid);

  // 1. tuile de l'accueil, règle avant de jouer
  await until(async () => (await page.textContent('#homeHit')).includes(`HIT DU JOUR #${N}`), 4000);
  ok((await page.textContent('#homeHit')).includes(`HIT DU JOUR #${N}`) && (await page.textContent('#homeHit')).includes('Jouer'), `accueil : tuile « Hit du jour #${N} » avec Jouer`);
  await shot('h01_accueil');
  await page.click('#homeHit');
  await page.waitForSelector('#hitGo');
  ok((await page.textContent('#sheetBox')).includes('Un seul essai'), 'avant de jouer : la règle (un seul essai)');
  await shot('h02_regle');
  const coins0 = await page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).coins);
  await page.click('#hitGo');
  await page.waitForSelector('#v-game:not(.hide)');
  await until(async () => (await page.textContent('#gameTitle')).includes(`Hit du jour #${N}`), 8000);
  ok((await page.textContent('#gameTitle')).includes(`Hit du jour #${N}`) && (await page.textContent('#gameCount')).includes('1/1'), 'partie : titre « Hit du jour », un seul joueur');
  ok(await page.$eval('#gameReacts', e => e.classList.contains('hide')) && await page.$eval('#chatFab', e => e.classList.contains('hide')), 'partie : ni réactions ni chat (on joue seul)');

  // 2. 5 extraits : tout trouvé aux manches 1, 3 et 5, l'artiste à la 2, rien à la 4 → 🎵🎤🎵⬛🎵
  const heardA = [];
  for (let round = 1; round <= 5; round++) {
    await page.waitForFunction(r => document.querySelector('#gameTitle').innerText.includes(`Manche ${r}/`) &&
      document.querySelector('#reveal').classList.contains('hide') && document.querySelector('#gOverlay').classList.contains('hide'), round, { timeout: 40000 });
    await sleep(900);
    const [artist, title] = keyOf(await page.$eval('#audio', a => a.src));
    heardA.push(artist + '|' + title);
    if (round === 1) {
      // réponse fausse validée avec Entrée : la case se vide toute seule
      await page.fill('#guessIn', 'zzz pas du tout');
      await page.press('#guessIn', 'Enter');
      ok(await until(async () => (await page.inputValue('#guessIn')) === '', 2000) && (await page.textContent('#hint')).includes('Raté'), 'réponse fausse + Entrée : texte effacé automatiquement (« Raté »)');
      await shot('h03_rate_efface');
    }
    if (round !== 4) { await page.fill('#guessIn', artist); await page.press('#guessIn', 'Enter'); await sleep(250); }
    if (round === 1) {
      await page.fill('#guessIn', artist);
      await page.press('#guessIn', 'Enter');
      ok(await until(async () => (await page.inputValue('#guessIn')) === '', 2000) && (await page.textContent('#hint')).includes('Déjà trouvé'), 'réponse déjà trouvée + Entrée : texte effacé aussi');
      await sleep(250);
    }
    if (round % 2) { await page.fill('#guessIn', title); await page.press('#guessIn', 'Enter'); }
  }
  await page.waitForSelector('#v-end:not(.hide)', { timeout: 40000 });
  await until(async () => (await page.$$('#hitBox .tiles span')).length === 5, 8000);
  await sleep(1500);
  await shot('h04_fin');
  const tiles = await page.$$eval('#hitBox .tiles span', s => s.map(x => x.className + ':' + x.textContent).join(' '));
  ok(tiles === 's3:🎵 s2:🎤 s3:🎵 s0:⬛ s3:🎵', `fin : grille 🎵🎤🎵⬛🎵 (${tiles})`);
  const score = +(await page.textContent('#hitBox .sc')).replace(/\D/g, '');
  const gain = +((await page.textContent('#endRecap')).match(/\+(\d+) pièces/) || [])[1];
  ok(gain === 5 + Math.floor(score / 10) + 25, `fin : pièces complètes + 25 de bonus (+${gain} pour ${score} pts)`);
  ok(await page.$eval('#podium', e => e.classList.contains('hide')) && await page.$eval('#endReacts', e => e.classList.contains('hide')), 'fin : pas de podium ni de réactions (partie seul)');
  const coins1 = await page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).coins);
  ok(coins1 - coins0 >= gain, 'pièces ajoutées à la sauvegarde');

  // 3. partage façon Wordle
  await page.click('#hitShare');
  const shared = await page.evaluate(() => window.__shared.map(s => s.text));
  ok(shared.length === 1 && new RegExp(`^Hitroom #${N} 🎵🎤🎵⬛🎵\\n🏆 ${score} pts`).test(shared[0]) && shared[0].includes('/?hit'), `partage : « ${(shared[0] || '').split('\n').join(' / ')} »`);
  await page.click('#endNew');
  ok((await page.evaluate(() => window.__shared.length)) === 2, 'bouton Partager en bas de l’écran');

  // 4. classement du jour
  await page.click('#endSame');
  await until(async () => (await page.textContent('#endFull')).includes('Toi'), 5000);
  ok((await page.textContent('#endFull')).includes(`Hit du jour #${N}`) && (await page.textContent('#endFull')).includes('Toi'), 'classement du jour : je suis dedans');
  await shot('h05_classement_jour');
  const info = await api(`/api/hit?uid=${uid}`);
  ok(info.mine?.grid === '32303' && info.mine.done === 1 && info.mine.score === score && info.streak === 1, `serveur : résultat gardé (${info.mine?.grid}, ${info.mine?.score} pts, série ${info.streak})`);

  // 5. retour à l'accueil : déjà joué, le résultat (pas une 2e partie)
  await page.click('#endHome');
  await page.waitForSelector('#v-home:not(.hide)');
  await until(async () => (await page.textContent('#homeHit')).includes('JOUÉ'), 4000);
  ok((await page.$$('#homeHit .hg i')).length === 5 && (await page.textContent('#homeHit')).includes('Prochain Hit'), 'accueil : « joué », grille et prochain Hit');
  await shot('h06_accueil_joue');
  await page.click('#homeHit');
  await page.waitForSelector('#sheetBox .hitres');
  await sleep(600);
  const view = await page.evaluate(() => [...document.querySelectorAll('.view')].find(v => !v.classList.contains('hide')).id);
  ok(view === 'v-home' && !!(await page.$('#sheetBox #hitShare')), 'déjà joué : on voit son résultat, pas de nouvelle partie');
  await page.click('#sheetBox [data-close]');

  // 6. un 2e joueur entend les mêmes 5 extraits, dans le même ordre
  const B = await client({ uid: 'hitbruno' + Date.now(), name: 'Bruno', av: 'A05', create: 1 });
  const heardB = await playWs(B, 5);
  ok(heardB.length === 5 && heardB.map(h => (h.a + '|' + h.t).toLowerCase()).join() === heardA.join(), 'mêmes extraits pour tout le monde, dans le même ordre');
  await until(() => B.msgs.some(m => m.t === 'hit'), 8000);
  const hb = B.msgs.find(m => m.t === 'hit');
  ok(hb && hb.total >= 2 && hb.grid === '33333' && hb.rank >= 1, `2e joueur : place du jour envoyée (${hb?.rank}e sur ${hb?.total})`);
  B.ws.close();

  // 7. un seul essai : partie quittée après le 1er extrait = essai utilisé, même en revenant
  const cuid = 'hitchloe' + Date.now();
  const C = await client({ uid: cuid, name: 'Chloé', av: 'A07', create: 1 });
  await until(() => C.last?.phase === 'play', 15000);
  await sleep(800);
  C.ws.close();
  console.log('   (attente de la fermeture du salon abandonné, 17 s)');
  await sleep(17000);
  const C2 = await client({ uid: cuid, name: 'Chloé', av: 'A07', create: 1 });
  await until(() => C2.msgs.some(m => m.t === 'error'), 4000);
  ok(C2.msgs.some(m => m.t === 'error' && /déjà joué/.test(m.msg)), 'partie quittée en route puis 2e essai : refusé (« déjà joué »)');
  const ci = await api(`/api/hit?uid=${cuid}`);
  ok(ci.mine && ci.mine.score === 0, 'la partie quittée compte telle quelle (0 pt)');

  // 8. série de jours : joué hier aussi → 2 jours de suite
  await api(`/__mock/hit?uid=${uid}&day=${YESTERDAY}&score=80`);
  const st = await api(`/api/hit?uid=${uid}`);
  ok(st.streak === 2 && st.mine.streak === 2, `série : 2 jours de suite (${st.streak})`);

  // 9. lien partagé ?hit : un nouveau joueur arrive directement sur la règle du Hit du jour
  const D = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  D.on('pageerror', e => errors.push('D: ' + e.message));
  await D.goto(BASE + '/?hit');
  await D.click('#loginGuest');
  await D.fill('#onbName', 'Dylan');
  await D.click('#onbGo');
  ok(!!(await D.waitForSelector('#hitGo', { timeout: 5000 }).catch(() => null)), 'lien ?hit : la règle du Hit du jour s’ouvre après l’inscription');
  await D.screenshot({ path: `${OUT}/h07_lien.png` });

  ok(!errors.length, `aucune erreur JavaScript${errors.length ? ' : ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(failures ? `\n${failures} échec(s)` : '\nTout est bon ✅');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
