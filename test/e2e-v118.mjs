// Version 1.18, côté serveur : événement du week-end, tournoi, coffre et guerre de clubs, rivalité, honneurs, survie.
// Il faut `npx wrangler dev --port 8787` avec .dev.vars (MOCK_MUSIC=1). Horloge simulée par /__mock/horloge.
import assert from 'node:assert/strict';
import { eventOfWeek } from '../src/extras.js';
const B = 'http://localhost:8787';
const get = async p => (await fetch(B + p)).json();
const post = async (p, b) => (await fetch(B + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json();
const clock = t => get('/__mock/horloge?t=' + encodeURIComponent(t));
const R = Math.random().toString(36).slice(2, 7);
const u = n => `v118${R}${n}`.padEnd(12, 'x');
const me = (uid, name) => get(`/api/me?${new URLSearchParams({ uid, name, av: 'A02', fr: 'def', lvl: 3 })}`);
const ok = (c, m) => { assert.ok(c, m); console.log('  ✓', m); };

const ev = eventOfWeek('2026-10-19');
console.log('Événement du week-end du 24-25 octobre :', ev.name, ev.cat);
const [u1, u2, u3, u4, u5, u6] = [1, 2, 3, 4, 5, 6].map(u);
for (const [i, uid] of [u1, u2, u3, u4, u5, u6].entries()) await me(uid, 'Joueur' + (i + 1));

// jeudi : à venir
await clock('2026-10-22T10:00:00Z');
let e = await get(`/api/event?uid=${u1}`);
ok(e.state === 'soon' && e.id === ev.id && e.cat === ev.cat, 'jeudi : événement à venir');
ok((await get(`/api/event?uid=${u1}`)).tour.state === 'soon', 'tournoi à venir');
ok((await me(u1, 'Joueur1')).ev.state === 'soon', '/api/me donne l’événement');

// clubs
const names = ['Alpha' + R, 'Bravo' + R];
const ca = await post('/api/club', { uid: u1, act: 'create', name: names[0], e: '🎸', c: 1 });
const cb = await post('/api/club', { uid: u3, act: 'create', name: names[1], e: '🎤', c: 2 });
ok(ca.ok && cb.ok, 'deux clubs créés');
ok((await post('/api/club', { uid: u2, act: 'join', id: ca.id })).ok, 'u2 rejoint Alpha');
ok((await post('/api/club', { uid: u4, act: 'join', id: cb.id })).ok, 'u4 rejoint Bravo');
let info = await get(`/api/club/${ca.id}?uid=${u1}`);
ok(info.war.state === 'soon' && info.chest.pts === 0 && info.rivals.above === null, 'jeudi : guerre à venir, coffre vide');
ok((await post('/api/club', { uid: u1, act: 'chest' })).why === 'played', 'coffre : il faut avoir joué');

// samedi 20 h 30 (Paris) : événement et tournoi en cours
await clock('2026-10-24T18:30:00Z');
e = await get(`/api/event?uid=${u1}`);
ok(e.state === 'live' && e.tour.state === 'live', 'samedi 20 h 30 : événement et tournoi en direct');
await get(`/__mock/points?uid=${u1}&pts=900&cat=${ev.cat}`);
await get(`/__mock/points?uid=${u2}&pts=800&cat=${ev.cat}`);
await get(`/__mock/points?uid=${u3}&pts=400&cat=mix`);          // mauvaise catégorie : pas pour l’événement, oui pour le tournoi
await get(`/__mock/points?uid=${u4}&pts=350&cat=${ev.cat}`);
await get(`/__mock/points?uid=${u5}&pts=320&cat=${ev.cat}`);     // sans club, au-delà de 300 points : participation
await get(`/__mock/points?uid=${u6}&pts=100&cat=${ev.cat}`);     // moins de 300 points : rien
e = await get(`/api/event?uid=${u1}`);
ok(e.top[0].name === 'Joueur1' && e.top[0].pts === 900 && e.top[1].pts === 800 && !e.top.some(x => x.name === 'Joueur3'), 'classement de l’événement (bonne catégorie seulement)');
ok(e.tour.top.length === 5 && e.tour.top[0].pts === 900 && e.tour.me.place === 1, 'classement du tournoi (toutes catégories)');
ok(!e.top.some(x => x.pk === undefined), 'pas d’identifiant secret dans le classement');

// coffre : Alpha a 1700 points cette semaine → palier 1 (1500)
info = await get(`/api/club/${ca.id}?uid=${u1}`);
ok(info.chest.pts === 1700 && info.chest.tiers[0].done && !info.chest.tiers[1].done, 'coffre : palier 1 atteint (1700 pts)');
let c1 = await post('/api/club', { uid: u1, act: 'chest' });
ok(c1.ok && c1.coins === 100, 'coffre récupéré : 100 pièces');
ok(!(await post('/api/club', { uid: u1, act: 'chest' })).ok, 'coffre : pas deux fois');
ok((await post('/api/club', { uid: u2, act: 'chest' })).coins === 100, 'coffre : chaque membre qui a joué a le sien');

// guerre : Alpha (1700) contre Bravo, points du week-end
info = await get(`/api/club/${ca.id}?uid=${u1}`);
ok(info.war.state === 'live' && info.war.opp && info.war.opp.name === names[1] && info.war.pts === 1700, 'guerre en cours contre Bravo');
const infoB = await get(`/api/club/${cb.id}?uid=${u3}`);
ok(infoB.war.opp.name === names[0] && infoB.war.pts === 750, 'Bravo voit Alpha (750 pts)');
ok((await get(`/api/club/${ca.id}`)).war === undefined, 'la guerre n’est visible que par les membres');
info = await get(`/api/club/${ca.id}?uid=${u1}`);
ok(info.rivals.below || info.rivals.above, 'rivalité affichée');

// lundi : tout est terminé
await clock('2026-10-26T09:00:00Z');
info = await get(`/api/club/${ca.id}?uid=${u1}`);
ok(info.war.state === 'done' && info.war.result === 'win' && !info.war.claimed, 'lundi : Alpha a gagné la guerre');
const w1 = await post('/api/club', { uid: u1, act: 'war' });
ok(w1.ok && w1.coins === 300, 'récompense de victoire : 300 pièces');
ok(!(await post('/api/club', { uid: u1, act: 'war' })).ok, 'guerre : récompense une seule fois');
const wl = await post('/api/club', { uid: u3, act: 'war' });
ok(wl.ok && wl.coins === 75, 'récompense de défaite : 75 pièces');

// honneurs : événement et tournoi du week-end passé
const h1 = (await me(u1, 'Joueur1')).honors;
ok(h1.some(h => h.kind === 'event' && h.v === 1 && h.coins === 600 && h.title === `h-ev-${ev.id}-261019`), 'u1 : 1er de l’événement (600 pièces + titre)');
ok(h1.some(h => h.kind === 'tour' && h.v === 1 && h.coins === 500 && h.title === 'h-tour-261019'), 'u1 : vainqueur du tournoi (500 pièces + titre)');
ok((await me(u1, 'Joueur1')).honors.length === 0, 'honneurs donnés une seule fois');
const h2 = (await me(u2, 'Joueur2')).honors;
ok(h2.some(h => h.kind === 'event' && h.v === 2 && h.coins === 400) && h2.some(h => h.kind === 'tour' && h.v === 2), 'u2 : 2es places');
const h4 = (await me(u4, 'Joueur4')).honors;
ok(h4.some(h => h.kind === 'event' && h.v === 3 && h.coins === 250), 'u4 : 3e (250 pièces)');
ok((await me(u5, 'Joueur5')).honors.some(h => h.kind === 'event' && h.v === 0 && h.coins === 100), 'u5 : participation (≥ 300 points)');
ok(!(await me(u6, 'Joueur6')).honors.some(h => h.kind === 'event'), 'u6 : moins de 300 points, rien');
ok((await get(`/api/event?uid=${u1}`)).state === 'done', 'lundi : événement terminé, résultats visibles');

// fin de saison : clubs et meilleurs joueurs
await get(`/__mock/saison?uid=${u1}&sc=2026-10&rp=500`);
await get(`/__mock/cloture?sc=2026-10`);
const hs = (await me(u1, 'Joueur1')).honors;
ok(hs.some(h => h.kind === 'club' && h.v === 1 && h.coins === 1000 && h.title === 'h-club-2610'), 'fin de saison : club champion (1000 pièces + titre)');
ok(hs.some(h => h.kind === 'top' && h.title.startsWith('h-top') && h.title.endsWith('-2610')), 'fin de saison : top des joueurs');
const t1 = await get(`/api/club/${ca.id}?uid=${u1}`);
ok(t1.trophies.some(t => t.sc === '2026-10' && t.place === 1), 'trophée sur la page du club');
ok(/^[a-z0-9-]{1,24}$/.test(hs.find(h => h.title).title), 'identifiants de titres acceptés par le salon');

// survie
const sv = await get(`/api/survie?cat=rock&uid=${u1}`);
ok(Array.isArray(sv.top) && sv.me === 0, 'classement de survie vide');
await get('/__mock/horloge?t=');
console.log('\nTout est bon.');
