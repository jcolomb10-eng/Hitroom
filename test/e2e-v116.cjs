// Version 1.16 de bout en bout (wrangler dev en local avec MOCK_MUSIC=1)
// NODE_PATH=$(npm root -g) node test/e2e-v116.cjs   (captures dans SHOTS ; ≈ 1 min)
// page de connexion à chaque ouverture (pas après un rechargement ni une coupure), bande défilante de l'accueil,
// vitrine dynamique, 30 derniers morceaux, mentions légales, achat et application d'un thème (aussi en thème clair)
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const until = async (fn, ms, step = 150) => { for (let t = 0; t < ms; t += step) { if (await fn()) return true; await sleep(step); } return !!(await fn()); };
const errors = [];
const view = p => p.evaluate(() => [...document.querySelectorAll('.view')].find(v => !v.classList.contains('hide'))?.id);
const patch = (p, fn, arg) => p.evaluate(([f, a]) => { const S = JSON.parse(localStorage.getItem('hitroom.v1')); new Function('S', 'a', f)(S, a); localStorage.setItem('hitroom.v1', JSON.stringify(S)); }, [fn, arg]);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const open = async () => { const p = await ctx.newPage(); p.on('dialog', d => d.accept()); p.on('pageerror', e => errors.push(e.message)); return p; };
  const A = await open();
  await A.goto(BASE + '/');
  await A.click('#loginGuest');
  await A.fill('#onbName', 'Zoé');
  await A.click('#onbGo');
  await A.waitForSelector('#v-home:not(.hide)');

  // 1. bande défilante de l'accueil
  const tk = await A.$eval('#homeTk', e => ({ spans: e.querySelectorAll('span').length, anim: getComputedStyle(e).animationName, txt: e.textContent }));
  ok(tk.spans === 8 && tk.anim === 'tick' && /Application en développement/.test(tk.txt) && /retours et vos idées/.test(tk.txt), 'accueil : bande défilante en boucle (« Application en développement », « vos retours et vos idées »)');
  const x0 = await A.$eval('#homeTk', e => e.getBoundingClientRect().left); await sleep(700);
  ok((await A.$eval('#homeTk', e => e.getBoundingClientRect().left)) < x0, 'la bande défile');
  await A.screenshot({ path: `${OUT}/v1_accueil.png` });

  // 2. quitter puis rouvrir = page de connexion ; rechargement et coupure = on reste connecté
  await A.reload();
  await A.waitForSelector('#v-home:not(.hide)');
  ok((await view(A)) === 'v-home', 'rechargement : directement l’accueil');
  await ctx.setOffline(true); await sleep(800); await ctx.setOffline(false); await sleep(800);
  ok((await view(A)) === 'v-home', 'coupure puis retour du réseau : toujours connecté');
  const B = await open();
  await B.goto(BASE + '/');
  await B.waitForSelector('#v-login:not(.hide)');
  ok((await B.textContent('#loginGuestTxt')).includes('Continuer en invité · Zoé'), 'application rouverte : page de connexion, « Continuer en invité · Zoé »');
  await B.screenshot({ path: `${OUT}/v2_connexion.png` });
  await B.click('#loginGuest');
  await B.waitForSelector('#v-home:not(.hide)');
  ok((await B.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')).name)) === 'Zoé', 'continuer : même profil, sans nouvelle inscription');
  await B.close();

  // 3. mentions légales : réglages et page de connexion
  const C = await open();
  await C.goto(BASE + '/');
  await C.waitForSelector('#v-login:not(.hide)');
  await C.click('#loginLegal');
  ok((await C.textContent('#sheetBox')).includes('Cloudflare') && (await C.textContent('#sheetBox')).includes('Mentions légales'), 'connexion : lien « Mentions légales » (éditeur, hébergeur Cloudflare…)');
  await C.screenshot({ path: `${OUT}/v3_legal.png` });
  await C.close();
  await A.click('#tabbar [data-tab="profile"]');
  await A.click('#profSet');
  await A.click('#legalBtn');
  ok((await A.textContent('#sheetBox')).includes('Données personnelles') && (await A.textContent('#sheetBox')).includes('Droit français'), 'Paramètres : Mentions légales');
  await A.click('#sheetBox [data-close].cta');

  // 4. vitrine : vide d'abord, puis dynamique avec des médailles
  await A.click('#v-settings .back');
  await A.waitForSelector('#v-profile:not(.hide)');
  ok((await A.textContent('#profBody .vit')).includes('Gagne ta première médaille') && (await A.$$('#profBody .vslot.empty')).length === 3, 'vitrine vide : 3 places libres et message');
  await patch(A, `S.st.games=70;S.st.wins=60;S.st.nA=300;S.st.nT=260;S.st.streak=6;S.st.fast=2500;S.st.top=210;S.st.cats=['80','90','2000','2010','2020','rock'];S.hit={day:'x',streak:3};`);
  await A.reload();
  await A.waitForSelector('#v-home:not(.hide)');
  await A.click('#tabbar [data-tab="profile"]');
  await A.waitForSelector('#profBody .vslot:not(.empty)');
  const slots = await A.$$eval('#profBody .vslot:not(.empty)', s => s.map(x => x.className + ':' + x.dataset.med));
  ok(slots.length === 3 && slots.some(x => x.includes('k1')), `vitrine : 3 médailles sur le podium (${slots.join(' ')})`);
  const anim = await A.$eval('#profBody .vslot .fl', e => getComputedStyle(e).animationName);
  ok(anim === 'vfloat' && (await A.$$('#profBody .vsp')).length >= 9 && (await A.$$('#profBody .vbeam')).length === 2, 'médailles qui flottent, étincelles et faisceaux');
  const box = await A.$eval('#profBody .vit', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width * 0.9, y: r.top + r.height * 0.3 }; });
  await A.mouse.move(box.x, box.y);
  ok(parseFloat(await A.$eval('#profBody .vit', e => e.style.getPropertyValue('--ry'))) > 5, 'inclinaison des médailles au toucher');
  const lab = () => A.$eval('#vitTick .vl', e => e.textContent).catch(() => '');
  const t1 = await lab();
  await until(async () => (await lab()) !== t1, 6000, 300);
  const t2 = await lab();
  ok(t1 && t2 && t1 !== t2, `faits marquants qui défilent (« ${t1} » puis « ${t2} »)`);
  await A.screenshot({ path: `${OUT}/v4_vitrine.png` });
  await A.click('#profBody .vslot.k1');
  ok((await A.textContent('#sheetBox')).includes('Ton record'), 'toucher une médaille : sa fiche');
  await A.click('#sheetBox [data-close]');
  await A.click('#profCard');
  ok(!!(await A.$('#sheetBox .vit .vslot')), 'carte de joueur : la vitrine animée');
  await A.screenshot({ path: `${OUT}/v5_carte.png` });
  await A.click('#sheetBox [data-close]');

  // 5. Mes découvertes : 30 derniers morceaux seulement
  await patch(A, `localStorage.setItem('hitroom.disc', JSON.stringify(Array.from({length:45},(_,i)=>({g:'g:'+i,t:'Titre '+i,a:'Artiste',art:'',link:'',ts:Date.now()-i*1000,f:3}))));`);
  await A.reload();
  await A.waitForSelector('#v-home:not(.hide)');
  await A.click('#tabbar [data-tab="profile"]');
  await A.click('#profDisc');
  await A.waitForSelector('#discList .song');
  ok((await A.$$('#discList .song')).length === 30 && (await A.textContent('#sheetBox')).includes('30 derniers') && (await A.textContent('#sheetBox')).includes('Titre 0') && !(await A.textContent('#sheetBox')).includes('Titre 30'), 'Mes découvertes : 30 morceaux, les plus récents');
  await A.click('#sheetBox [data-close]');

  // 6. thème acheté : appliqué tout de suite, après rechargement, et visible en thème clair
  await patch(A, `S.coins=9000;`);
  await A.reload();
  await A.waitForSelector('#v-home:not(.hide)');
  await A.click('#tabbar [data-tab="shop"]');
  await A.click('[data-st="themes"]');
  await A.click('[data-it="saphir"]');
  await A.click('#prevBuy');
  await sleep(400);
  const st = await A.evaluate(() => { const S = JSON.parse(localStorage.getItem('hitroom.v1')); return [document.documentElement.dataset.theme, S.theme, S.themes.includes('saphir'), S.coins]; });
  ok(st[0] === 'saphir' && st[1] === 'saphir' && st[2] && st[3] === 4500, `achat : thème Saphir appliqué tout de suite (${st.join(', ')})`);
  ok((await A.textContent('#toast')).includes('acheté et appliqué') && (await A.textContent('[data-it="saphir"]')).includes('Appliqué'), 'message « acheté et appliqué », carte « ✓ Appliqué »');
  await A.reload();
  await A.waitForSelector('#v-home:not(.hide)');
  ok((await A.evaluate(() => document.documentElement.dataset.theme)) === 'saphir', 'après rechargement : le thème acheté est toujours appliqué');
  await patch(A, `S.set.light=true;`);
  await A.reload();
  await A.waitForSelector('#v-home:not(.hide)');
  const bg = await A.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  ok(bg === '#e9efff', `thème clair : le thème acheté teinte le fond (${bg})`);
  await A.screenshot({ path: `${OUT}/v6_theme_clair.png` });
  await A.click('#tabbar [data-tab="shop"]');
  await A.click('[data-st="themes"]');
  await A.click('[data-it="or"]');
  ok((await A.evaluate(() => document.documentElement.dataset.theme)) === 'or' && (await A.textContent('#toast')).includes('appliqué'), 'thème déjà acheté : un toucher l’applique (« appliqué »)');
  await A.click('[data-it="saphir"]');
  ok((await A.evaluate(() => document.documentElement.dataset.theme)) === 'saphir', 'et on peut revenir au Saphir sans le racheter');

  ok(!errors.length, `aucune erreur JavaScript${errors.length ? ' : ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(failures ? `\n${failures} échec(s)` : '\nTout est bon ✅');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
