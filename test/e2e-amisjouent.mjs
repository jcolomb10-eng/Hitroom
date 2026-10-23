// « Tes amis jouent » : un ami hors de l'appli reçoit une notification quand l'autre lance une partie (1 fois / 3 h, pref coupée = rien)
const B = 'http://localhost:8787', sfx = Date.now();
const A = 'jouea' + sfx, Bu = 'joueb' + sfx, Cu = 'jouec' + sfx;
const j = (p, o) => fetch(B + p, o).then(r => r.json());
const post = (p, b) => j(p, { method: 'POST', body: JSON.stringify(b) });
let bad = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) bad = 1; };
await post('/api/ping', { uid: A, name: 'Lea', at: 'menu' });
await j(`/api/me?uid=${Bu}&name=Tom&av=A02&lvl=2`); await j(`/api/me?uid=${Cu}&name=Zoe&av=A02&lvl=2`);   // fiches créées sans présence (vu = 0)
const code = async u => (await j(`/api/friends?uid=${u}`)).code;
const [cA, cB, cC] = [await code(A), await code(Bu), await code(Cu)];
ok(!!cA && !!cB && !!cC, 'codes amis lus');
for (const [u, c] of [[A, cB], [Bu, cA], [A, cC], [Cu, cA]]) await post('/api/friends', { uid: u, act: 'add', fc: c });
ok((await j(`/api/friends?uid=${A}`)).list.length === 2, 'A a 2 amis');
const sub = (uid, ep, prefs) => post('/api/push/sub', { uid, endpoint: ep, prefs });
const epB = 'https://push.example.test/b' + sfx, epC = 'https://push.example.test/c' + sfx;
await sub(Bu, epB, {}); await sub(Cu, epC, { friends: false });
const log0 = (await j('/__mock/push')).log.length;
await post('/api/ping', { uid: A, name: 'Lea', at: 'ranked:rock' });        // A lance une partie classée
await new Promise(r => setTimeout(r, 800));
let log = (await j('/__mock/push')).log.slice(log0);
ok(log.some(l => l.endpoint === epB && /Lea joue/.test(l.title)), 'B (hors appli) reçoit « Lea joue en ce moment »');
ok(!log.some(l => l.endpoint === epC), 'C (notification coupée) ne reçoit rien');
await post('/api/ping', { uid: A, name: 'Lea', at: 'menu' }); await post('/api/ping', { uid: A, name: 'Lea', at: 'open:rock' });
await new Promise(r => setTimeout(r, 500));
ok((await j('/__mock/push')).log.slice(log0).filter(l => l.endpoint === epB && /joue/.test(l.title)).length === 1, 'pas de 2e notification avant 3 h');
process.exit(bad);
