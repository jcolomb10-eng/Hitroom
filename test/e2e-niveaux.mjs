// Niveaux des salons publics (wrangler dev en local avec MOCK_MUSIC=1) : node test/e2e-niveaux.mjs   (≈ 1 min 30)
// - chacun joue avec son rang, un rang en dessous ou un rang au-dessus (jamais un Bronze avec un Or)
// - points de rang selon la place ; qui change de niveau passe dans le salon de son nouveau rang
const HTTP = 'http://127.0.0.1:8787', BASE = 'ws://127.0.0.1:8787';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
function client(path, q) {
  const ws = new WebSocket(`${BASE}${path}?${new URLSearchParams(q)}`);
  const c = { ws, msgs: [], last: null, closed: null, onState: null };
  ws.onmessage = e => { const m = JSON.parse(e.data); c.msgs.push(m); if (m.t === 'state') { c.last = m; c.onState?.(m); } };
  ws.onclose = e => { c.closed = e.code; };
  c.send = m => ws.readyState === 1 && ws.send(JSON.stringify(m));
  return new Promise(res => { ws.onopen = () => res(c); ws.onerror = () => res(c); });
}
const until = async (fn, ms, step = 250) => { for (let t = 0; t < ms; t += step) { if (fn()) return true; await sleep(step); } return !!fn(); };
const season = new Date().toISOString().slice(0, 7);
const setRp = (uid, rp) => fetch(`${HTTP}/__mock/saison?uid=${uid}&sc=${season}&rp=${rp}`);
const spread = c => { const t = c.last.players.map(p => p.tier); return Math.max(...t) - Math.min(...t); };

// 1. Bronze (0 PR), Or (300 PR) puis Argent (150 PR) dans la même catégorie
await setRp('bronzeniv01', 0);
await setRp('orniveau001', 300);
await setRp('argentniv01', 150);
const b = await client('/api/public/cine/ws', { uid: 'bronzeniv01', name: 'Bronzy' });
await sleep(600);
const o = await client('/api/public/cine/ws', { uid: 'orniveau001', name: 'Orly' });
await sleep(600);
const a = await client('/api/public/cine/ws', { uid: 'argentniv01', name: 'Argie' });
await until(() => [b, o, a].every(c => c.last && c.last.players.some(p => p.bot)), 8000);
const names = c => c.last.players.filter(p => !p.bot).map(p => p.name);
console.log('salons :', [b, o, a].map(c => `fenêtre ${c.last.win} : ${c.last.players.map(p => `${p.name}${p.bot ? '🤖' : ''}(${p.tier})`).join(' ')}`).join(' | '));
ok(b.last.win === 0 && o.last.win === 1, `Bronze dans le salon Bronze – Argent, Or dans le salon Argent – Or (${b.last.win}, ${o.last.win})`);
ok(!names(o).includes('Bronzy') && !names(b).includes('Orly'), 'un Or ne joue jamais avec un Bronze');
ok([0, 1].includes(a.last.win) && (names(a).includes('Bronzy') || names(a).includes('Orly')), `l’Argent rejoint un salon déjà occupé (fenêtre ${a.last.win})`);
ok([b, o, a].every(c => spread(c) <= 1), 'dans chaque salon, bots compris : jamais plus d’un rang d’écart');
const cnt = await (await fetch(`${HTTP}/api/counts?t=2`)).json();
ok(cnt.r?.cine === 1, `compteur pour un Or : seulement les salons qu’il peut rejoindre (${cnt.r?.cine})`);
for (const c of [b, o, a]) c.ws.close();

// 2. Argent à 240 PR qui gagne une partie : passe Or (250 PR) et change de salon avant la partie suivante
await setRp('monteeniv01', 240);
const m = await client('/api/public/2020/ws', { uid: 'monteeniv01', name: 'Grimpeur' });
await until(() => m.last, 3000);
ok(m.last.win === 0, `départ : salon Bronze – Argent (fenêtre ${m.last.win})`);
const done = new Set();
m.onState = st => {
  if (st.phase !== 'play' || !st.cur || done.has(st.round)) return;
  done.add(st.round);
  const [artist, title] = decodeURIComponent(st.cur.url.match(/__mock\/a\/(.+)\.wav/)[1]).split('|');
  const wait = Math.max(0, st.cur.start - st.now) + 250;
  setTimeout(() => { m.send({ t: 'guess', text: title, enter: true }); setTimeout(() => m.send({ t: 'guess', text: artist, enter: true }), 150); }, wait);
};
ok(await until(() => m.msgs.some(x => x.t === 'rank'), 150000), 'partie classée terminée');
const rk = m.msgs.find(x => x.t === 'rank');
const res = m.last.results || [];
console.log('résultat :', res.map(r => `${r.rank}. ${r.name}${r.bot ? '🤖' : ''} ${r.score} pts${r.drp != null ? ` (${r.drp >= 0 ? '+' : ''}${r.drp} PR)` : ''}`).join(' | '));
ok(res[0]?.name === 'Grimpeur' && rk.delta === 34, `1er sur ${res.length} en Argent avec une partie parfaite : 29 + 5 = +34 PR (${rk.delta})`);
ok(rk.rp === 274 && rk.tier === 2 && rk.promo === 2, `nouveau rang Or (${rk.rp} PR)`);
ok(await until(() => m.msgs.some(x => x.t === 'move'), 25000) && m.msgs.find(x => x.t === 'move').tier === 2, 'avant la partie suivante : message « nouveau salon »');
await until(() => m.closed != null, 3000);
ok(m.closed === 4001, `ancien salon quitté (code ${m.closed})`);
const m2 = await client('/api/public/2020/ws', { uid: 'monteeniv01', name: 'Grimpeur' });
await until(() => m2.last?.players.some(p => p.bot), 8000);
ok([1, 2].includes(m2.last.win) && spread(m2) <= 1, `nouveau salon de son niveau (fenêtre ${m2.last.win}, rangs ${m2.last.players.map(p => p.tier).join(',')})`);
m2.ws.close();
await sleep(300);
console.log(failures ? `${failures} échec(s)` : 'Tout est bon');
process.exit(failures ? 1 : 0);
