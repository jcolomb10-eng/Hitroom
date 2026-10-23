// Comptes e-mail : créer depuis la connexion, se reconnecter sur un 2e appareil
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), U = 'http://localhost:8787', mail = `t${Date.now()}@ex.fr`;
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
  const p1 = await (await b.newContext()).newPage();
  await p1.goto(U); await p1.click('#loginMail');
  await p1.click('#acSw'); await p1.fill('#acMail', mail); await p1.fill('#acPw', 'motdepasse1'); await p1.click('#acGo');
  await p1.fill('#onbName', 'Lea'); await p1.click('#onbAv button:nth-child(3)'); await p1.click('#onbGo');
  await p1.waitForSelector('#v-home.on, #v-home:not(.hide)');
  ok((await p1.evaluate(() => JSON.parse(localStorage['hitroom.v1']).acct)) === 'mail', 'compte créé');
  await p1.waitForTimeout(6000);
  const p2 = await (await b.newContext()).newPage();
  await p2.goto(U); await p2.click('#loginMail'); await p2.fill('#acMail', mail); await p2.fill('#acPw', 'faux'); await p2.click('#acGo');
  await p2.waitForTimeout(800); ok(await p2.locator('#acGo').count() === 1, 'mauvais mot de passe refusé');
  await p2.fill('#acPw', 'motdepasse1'); await p2.click('#acGo');
  await p2.waitForLoadState('load'); await p2.waitForTimeout(1500);
  ok((await p2.evaluate(() => JSON.parse(localStorage['hitroom.v1']).name)) === 'Lea', 'progression retrouvée sur le 2e appareil');
  await b.close();
})();
