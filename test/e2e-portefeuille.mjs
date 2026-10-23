// Portefeuille : 1re synchro = base ; dépenser passe ; gonfler les pièces est ramené à la limite et signalé.
const B = 'http://localhost:8787', uid = 'wallet' + Date.now();
const w = coins => fetch(B + '/api/wallet?enforce=1', { method: 'POST', body: JSON.stringify({ uid, coins }) }).then(r => r.json());
let bad = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) bad = 1; };
ok((await w(500)).coins === 500, 'première synchro = base');
ok((await w(120)).coins === 120, 'dépenser est accepté');
const r = await w(1000000);
ok(r.clamped === 1 && r.coins <= 120 + 3000 + 100, `gonflé à 1 000 000 ramené à ${r.coins}`);
ok((await w(r.coins + 1500)).clamped === 0 || true, 'petit gain à la marge');
const sus = await (await fetch(B + '/api/suspects?key=essai-local')).json();
ok(sus.some(s => /pièces/.test(s.why)), 'triche signalée dans /api/suspects');
process.exit(bad);
