// Boutique et économie (version 1.6) de bout en bout (wrangler dev en local avec MOCK_MUSIC=1)
// NODE_PATH=$(npm root -g) node test/e2e-boutique.cjs   (captures dans SHOTS, /tmp/hitroom-shots par défaut ; ≈ 1 min 30)
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.SHOTS || require('os').tmpdir() + '/hitroom-shots';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('hitroom.v1')));
  const patch = async fn => { await page.evaluate(`(() => { const S = JSON.parse(localStorage.getItem('hitroom.v1')); (${fn})(S); localStorage.setItem('hitroom.v1', JSON.stringify(S)); })()`); await page.reload(); await page.waitForSelector('#v-home:not(.hide)'); };
  await page.goto(BASE + '/');
  await page.click('#loginGuest');
  await page.fill('#onbName', 'Lena');
  await page.click('#onbGo');
  await page.waitForSelector('#v-home:not(.hide)');

  // 1. médailles revalorisées : la différence est versée une fois aux joueurs d'avant la 1.6
  await patch(S => { S.medals = { win: 2, fire: 1 }; S.coins = 1000; delete S.eco; });
  await sleep(2200);
  let S = await state();
  ok(S.coins === 1000 + 25 + 140 + 25 && S.eco === 16, `médailles revalorisées : +190 pièces (${S.coins - 1000})`);
  await page.reload();
  await page.waitForSelector('#v-home:not(.hide)');
  await sleep(2000);
  ok((await state()).coins === 1190, 'versé une seule fois');

  // 1 bis. version 1.7 : les anciens avatars emoji deviennent des avatars en image (rare d'octobre au même palier)
  await patch(S => { S.av = '🎤'; S.avs = ['🦋']; });
  S = await state();
  ok(S.av === 'A01' && S.avs.join() === 'R07', `avatars emoji convertis : 🎤 → ${S.av}, 🦋 → ${S.avs}`);
  ok(await page.$eval('#homeAv img', i => i.complete && i.naturalWidth > 0 && i.src.endsWith('/av/A01.webp')), 'accueil : image du Micro d’or chargée');

  // 2. boutique : aperçu d'un thème même sans assez de pièces, puis retour au thème équipé
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
  await patch(S => { S.coins = 1000; });
  await page.click('[data-go="shop"]');
  await page.click('[data-st="themes"]');
  await page.click('[data-kind="theme"][data-it="champagne"]');
  await sleep(400);
  ok(await theme() === 'champagne' && /Il te manque 2\s000/.test(await page.textContent('#prevBar')), 'aperçu du thème Champagne sans assez de pièces');
  await shot(page, 'b00_apercu_theme');
  await page.click('#prevBuy');
  ok((await page.textContent('#toast')).includes('Il te manque') && (await state()).theme === 'or', 'achat refusé, thème équipé inchangé');
  await page.goBack();
  await page.waitForSelector('#v-home:not(.hide)');
  ok(await theme() === 'or', 'en quittant la boutique, retour au thème Or');

  // 1 ter. offres du jour (onglet « À la une ») : 3 objets en promo, prix réduit, le même tirage toute la journée
  await patch(S => { S.coins = 200000; });
  await page.click('[data-go="shop"]');
  await page.click('[data-st="deals"]');
  await sleep(300);
  const deals = await page.$$eval('#shopGrid [data-offer]', b => b.map(x => x.dataset.offer));
  ok(deals.length === 3 && await page.$('#shopGrid .deal.lead .off'), `offres du jour : 3 objets en promo (${deals.join(', ')})`);
  const S0 = await state(), c0 = S0.coins;
  const promo = +(await page.textContent('#shopGrid .deal.lead .newp')).replace(/\D/g, '');
  await page.click('#shopGrid .deal.lead');
  await sleep(300);
  const Sd = await state(), [dk, did] = deals[0].split(':');
  const owned = dk === 'frame' ? Sd.owned.includes(did) : dk === 'theme' ? Sd.themes.includes(did) : dk === 'perk' ? Sd.perks.includes(did) : Sd.avs.includes(did);
  ok(owned && c0 - Sd.coins === promo, `offre à la une achetée au prix réduit (${deals[0]}, −${c0 - Sd.coins} pièces)`);
  ok((await page.textContent('#shopGrid .deal.lead')).includes('Déjà à toi'), 'offre achetée : « Déjà à toi »');
  await shot(page, 'b00b_offres_du_jour');
  await page.reload();
  await page.waitForSelector('#v-home:not(.hide)');
  await page.click('[data-go="shop"]');
  await page.click('[data-st="deals"]');
  ok((await page.$$eval('#shopGrid [data-offer]', b => b.map(x => x.dataset.offer))).join() === deals.join(), 'mêmes offres toute la journée, même après un achat');
  await page.goBack();

  // 2 bis. thèmes de luxe : aperçu puis achat depuis la barre d'aperçu
  // (l'offre du jour est tirée au hasard : on annule son achat pour que la suite du test parte toujours du même état)
  const undo = { owned: S0.owned, themes: S0.themes, perks: S0.perks, avs: S0.avs, fr: S0.fr, av: S0.av, nc: S0.nc, vfx: S0.vfx };
  await patch(`S => { Object.assign(S, ${JSON.stringify(undo)}); S.coins = 200000; S.theme = 'or'; delete S.deals; }`);
  await page.click('[data-go="shop"]');
  await page.click('[data-st="themes"]');
  await page.click('[data-kind="theme"][data-it="lumiere"]');
  await page.click('#prevBuy');
  await sleep(400);
  ok(await page.evaluate(() => document.documentElement.dataset.theme === 'lumiere' && document.documentElement.dataset.lux === '1') && (await state()).theme === 'lumiere', 'thème Lumière acheté depuis l’aperçu et appliqué (reflets de luxe)');
  await shot(page, 'b01_theme_lumiere');
  await page.click('[data-kind="theme"][data-it="aurore"]');
  const g1 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--glow'));
  await sleep(2800);
  const g2 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--glow'));
  ok(g1.trim() !== g2.trim(), `aperçu du thème Aurore : les couleurs changent (${g1.trim()} → ${g2.trim()})`);
  await page.click('#prevBuy');
  await sleep(300);
  ok((await state()).theme === 'aurore' && await page.$eval('#prevBar', e => e.classList.contains('hide')), 'thème Aurore acheté, barre d’aperçu fermée');
  await shot(page, 'b02_theme_aurore');

  // 3. objets utiles
  await page.click('[data-st="items"]');
  for (let i = 0; i < 4; i++) { await page.click('[data-it="shield"]'); await sleep(150); }
  ok((await state()).inv.shield === 3 && (await page.textContent('#toast')).includes('3 en réserve'), 'boucliers : 3 maximum en réserve');
  await page.click('[data-it="boost"]');
  await page.click('[data-it="reroll"]');
  await page.click('[data-it="premium"]');
  await sleep(300);
  S = await state();
  ok(S.boost - Date.now() > 59 * 60000 && S.inv.reroll === 1 && S.perks.includes('premium'), 'XP ×2 (1 h), jeton 🔄 et salon Premium achetés');
  await shot(page, 'b03_objets');

  // 4. prestige : pseudo doré, confettis de victoire (aperçu à l'achat)
  await page.click('[data-st="prestige"]');
  await page.click('[data-it="nc-gold"]');
  await page.click('[data-it="vfx-confetti"]');
  await sleep(300);
  ok(await page.$('.winfx'), 'aperçu des confettis à l’achat');
  S = await state();
  ok(S.nc === 'gold' && S.vfx === 'confetti', 'pseudo doré et confettis équipés');
  await page.click('[data-kind="lav"][data-it="L06"]');
  await sleep(300);
  S = await state();
  ok(S.av === 'L06' && S.avs.includes('L06'), 'avatar légendaire Casque cyber-DJ acheté et équipé');
  await shot(page, 'b04_prestige');

  // 5. cadres de prestige ; cadre Légendaire réservé aux médailles Légendaires
  await page.click('[data-st="frames"]');
  await page.click('[data-kind="buy"][data-it="arc"]');
  await sleep(200);
  ok((await state()).fr === 'arc', 'cadre de prestige Arc-en-ciel acheté et équipé');
  await page.click('[data-it="legend"]');
  ok((await page.textContent('#toast')).includes('Légendaire'), 'cadre Légendaire refusé sans médaille Légendaire');
  await shot(page, 'b05_cadres');
  await page.goBack();

  // 6. défis du jour : 4 parmi 10, 🔄 avec le jeton
  await page.waitForSelector('#v-home:not(.hide)');
  ok((await page.textContent('#homeLvl')).includes('XP ×2'), 'accueil : XP ×2 en cours affiché');
  await page.click('#homeCoins');
  await sleep(300);
  const before = (await state()).day.ids;
  await page.click('[data-reroll]');
  await sleep(300);
  S = await state();
  ok(before?.length === 4 && S.day.ids.length === 4 && S.day.ids.join() !== before.join() && S.inv.reroll === 0, `défi changé avec le jeton (${before} → ${S.day.ids})`);
  await shot(page, 'b06_defis');
  await page.goBack();

  // 7. salon privé Premium : 2 catégories mélangées, 30 manches, pseudo doré et cadre vus par le serveur
  await page.waitForSelector('#v-home:not(.hide)');
  await page.click('#bCreate');
  ok((await page.textContent('#catsTitle')).includes('3 catégories'), 'Premium : choix de plusieurs catégories');
  await page.click('[data-c="rock"]');
  await page.click('[data-c="80"]');
  await shot(page, 'b07_categories_premium');
  await page.click('#catsOk');
  await page.waitForSelector('#v-lobby:not(.hide)');
  await sleep(600);
  ok((await page.textContent('#lobbyTitle')).includes('Rock + Années 80'), 'salon : Rock + Années 80 mélangés');
  const row = await page.$eval('#lobbyPlayers .prow', e => e.outerHTML);
  ok(row.includes('nmc gold') && row.includes('f-arc') && row.includes('/av/L06.webp'), 'serveur : pseudo doré, cadre de prestige et avatar légendaire transmis');
  await page.click('#lobbyGear');
  ok(await page.$('#sheetBox .seg[data-k="rounds"] button[data-v="30"]'), 'Premium : option 30 manches');
  await page.click('#sheetBox .seg[data-k="rounds"] button[data-v="5"]');
  await page.click('#sheetBox .seg[data-k="bots"] button[data-v="1"]');
  await page.click('#sheetBox .cta[data-close]');
  await sleep(400);
  await shot(page, 'b08_salon_premium');
  await page.click('#lobbyStart');
  const answer = async () => {
    const m = (await page.$eval('#audio', a => a.src)).match(/__mock\/a\/(.+)\.wav/);
    const [artist, title] = decodeURIComponent(m[1]).split('|');
    return { artist, title };
  };
  for (let round = 1; round <= 5; round++) {
    await page.waitForFunction(r => document.querySelector('#gameTitle').innerText.includes(`Manche ${r}/`) &&
      document.querySelector('#reveal').classList.contains('hide') && document.querySelector('#gOverlay').classList.contains('hide'), round, { timeout: 40000 });
    await sleep(700);
    const a = await answer();
    await page.fill('#guessIn', a.title);
    await page.press('#guessIn', 'Enter');
    await sleep(700);
    await page.fill('#guessIn', a.artist);
    await page.press('#guessIn', 'Enter');
  }
  await page.waitForSelector('#v-end:not(.hide)', { timeout: 40000 });
  await sleep(1000);
  ok(await page.$('.winfx'), 'victoire : confettis pour tout le salon');
  await shot(page, 'b09_victoire_confettis');
  ok((await page.textContent('#endRecap')).includes('×2'), 'fin de partie : XP doublée');
  const bot = await page.$$eval('#endFull .rr', rs => rs.map(r => r.outerHTML).find(h => h.includes('🤖')) || '');
  ok(/\/av\/A\d\d\.webp/.test(bot), 'bot : avatar classique en image, toujours marqué 🤖');

  // choix de l'avatar : 44 avatars, rares et légendaires verrouillés tant qu'ils ne sont pas obtenus
  await page.click('#endHome');
  await page.waitForSelector('#v-home:not(.hide)');
  await page.click('#homeAv');
  await page.click('#profAv');
  await sleep(1200);
  const grid = await page.$$eval('#sheetBox .avgrid button', bs => bs.map(b => ({ av: b.dataset.av, lock: b.classList.contains('lock'), ok: b.querySelector('img').naturalWidth > 0 })));
  ok(grid.length === 44 && grid.every(g => g.ok), `choix de l’avatar : ${grid.length} avatars, images chargées`);
  // l'offre du jour peut avoir été un avatar légendaire : on compare avec ce que le joueur possède vraiment
  const avs = (await state()).avs, locked = grid.filter(g => g.lock).map(g => g.av);
  const expected = grid.filter(g => /^[RLH]/.test(g.av) && !avs.includes(g.av)).map(g => g.av);
  ok(avs.includes('R07') && locked.length >= 11 + 4 && locked.join() === expected.join(), `rares et légendaires non obtenus verrouillés : ${locked.length} (déjà obtenus : ${avs.join(', ')})`);
  await shot(page, 'b10_choix_avatar');
  await page.click('#sheetBox [data-av="R03"]');
  ok((await page.textContent('#toast')).includes('route de saison'), 'avatar rare verrouillé : explique comment l’obtenir');
  await page.click('#sheetBox [data-av="A12"]');
  await sleep(300);
  ok((await state()).av === 'A12', 'avatar classique Boule disco choisi');

  ok(!errors.length, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failures ? `${failures} échec(s)` : 'Tout est bon');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
