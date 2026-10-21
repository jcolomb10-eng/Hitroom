// Cas limites du serveur (wrangler dev en local avec MOCK_MUSIC=1) : node test/e2e-cas-limites.mjs
const BASE = 'ws://127.0.0.1:8787';
const sleep = ms => new Promise(r => setTimeout(r, ms));
function client(path, q) {
  const ws = new WebSocket(`${BASE}${path}?${new URLSearchParams(q)}`);
  const c = { ws, msgs: [], last: null, closed: null };
  ws.onmessage = e => { const m = JSON.parse(e.data); c.msgs.push(m); if (m.t === 'state') c.last = m; };
  ws.onclose = e => { c.closed = e.code; };
  c.send = m => ws.send(JSON.stringify(m));
  return new Promise(res => { ws.onopen = () => res(c); ws.onerror = () => res(c); });
}
const ok = (cond, label) => console.log(cond ? '✅' : '❌', label);

// 1. code inexistant
const ghost = await client('/api/salon/ZZZZ/ws', { uid: 'aaaaaaaa11', name: 'Fantome' });
await sleep(400);
ok(ghost.msgs.some(m => m.t === 'error') && ghost.closed === 4001, 'code inexistant refusé avec un message');

// 2. création + transfert d'hôte
const code = (await (await fetch('http://127.0.0.1:8787/api/salon', { method: 'POST' })).json()).code;
const h = await client(`/api/salon/${code}/ws`, { uid: 'hosthost01', name: 'Hote', create: 1, cat: 'rock' });
const g = await client(`/api/salon/${code}/ws`, { uid: 'guestguest', name: 'Invite' });
await sleep(400);
const hostId = h.last.host;
ok(g.last.players.length === 2 && g.last.cat === 'rock', 'invité voit 2 joueurs et la catégorie Rock');
g.send({ t: 'start' });
await sleep(300);
ok(g.last.phase === 'lobby', "l'invité ne peut pas lancer la partie");
g.send({ t: 'opts', rounds: 20 });
await sleep(200);
ok(g.last.opts.rounds === 10, "l'invité ne peut pas changer les réglages");
h.send({ t: 'leave' });
await sleep(400);
const me = g.msgs.find(m => m.t === 'welcome').you;
ok(g.last.host === me && g.last.host !== hostId, "l'invité devient hôte quand l'hôte part");

// 3. même joueur dans un 2e onglet : l'ancien est remplacé, pas de doublon
const g2 = await client(`/api/salon/${code}/ws`, { uid: 'guestguest', name: 'Invite' });
await sleep(400);
ok(g.closed === 4000 && g2.last.players.length === 1, 'deuxième onglet : remplace le premier sans doublon');

// 4. pseudo grossier et message grossier filtrés
const rude = await client(`/api/salon/${code}/ws`, { uid: 'rudeuser01', name: 'connard' });
await sleep(300);
rude.send({ t: 'chat', text: 'espèce de connard' });
await sleep(300);
const rn = g2.last.players.find(p => p.name !== 'Invite')?.name;
const chat = g2.msgs.filter(m => m.t === 'chat').pop();
ok(rn && !/connard/i.test(rn), `pseudo grossier remplacé (${rn})`);
ok(chat && !/connard/i.test(chat.text), `message masqué (${chat?.text})`);

// 5. public : joueur seul qui se déconnecte en pleine partie → la partie s'arrête après le délai de grâce
const p = await client('/api/public/electro/ws', { uid: 'publicsolo', name: 'Solo' });
await sleep(9000);
ok(p.last.phase === 'play' && p.last.players.filter(x => x.bot).length === 3, `salon public : partie lancée avec 3 bots (phase ${p.last.phase})`);
p.ws.close();
await sleep(17000);
const info = await (await fetch('http://127.0.0.1:8787/api/counts')).json();
ok(!info.electro, 'salon public vide : plus compté parmi les salons actifs');
const back = await client('/api/public/electro/ws', { uid: 'publicsolo', name: 'Solo' });
await sleep(500);
ok(['lobby', 'loading', 'countdown'].includes(back.last.phase) && back.last.players.filter(x => !x.bot).length === 1, `retour après départ : nouvelle partie qui démarre (phase ${back.last.phase})`);
process.exit(0);
