// Bouclier de rang (wrangler dev en local avec MOCK_MUSIC=1) : node test/e2e-bouclier.mjs   (≈ 4 min)
// Un joueur avec un bouclier qui ne trouve rien : la 1re perte du jour est annulée par le serveur, pas la suivante.
import { rpDelta } from '../src/ranks.js';
const HTTP = 'http://127.0.0.1:8787', BASE = 'ws://127.0.0.1:8787';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log(cond ? '✅' : '❌', label); if (!cond) failures++; };
const until = async (fn, ms, step = 250) => { for (let t = 0; t < ms; t += step) { if (fn()) return true; await sleep(step); } return !!fn(); };
const season = new Date().toISOString().slice(0, 7);
const uid = 'bouclier' + Date.now().toString(36);
await fetch(`${HTTP}/__mock/saison?uid=${uid}&sc=${season}&rp=50`);

const msgs = [];
let last = null;
const ws = new WebSocket(`${BASE}/api/public/kpop/ws?${new URLSearchParams({ uid, name: 'Prudent', sh: 1 })}`);
ws.onmessage = e => { const m = JSON.parse(e.data); msgs.push(m); if (m.t === 'state') last = m; };
await new Promise(r => { ws.onopen = r; });

// jusqu'à 3 parties : il faut 2 parties perdues (perte sans bouclier attendue selon la place)
let used = false, games = 0;
while (games < 3) {
  const n0 = msgs.filter(m => m.t === 'rank').length;
  if (!(await until(() => msgs.filter(m => m.t === 'rank').length > n0, 200000))) { ok(false, 'partie classée terminée'); break; }
  games++;
  const rk = msgs.filter(m => m.t === 'rank').pop();
  const me = last.results.find(r => r.name === 'Prudent');
  const base = rpDelta(0, me.rank, last.results.length);
  console.log(`partie ${games} : ${me.rank}e sur ${last.results.length} (perte prévue ${base}) → ${rk.delta} PR, bouclier ${rk.saved || 0}, total ${rk.rp}`);
  if (base >= 0) continue;
  if (!used) {
    ok(rk.saved === -base && rk.delta === 0 && rk.rp === 50, `1re perte du jour annulée par le bouclier (${-base} PR sauvés)`);
    used = true;
  } else {
    ok(!rk.saved && rk.delta === base && rk.rp === 50 + base, `perte suivante : bouclier déjà utilisé aujourd’hui (${rk.delta} PR)`);
    break;
  }
}
ok(used, 'au moins une perte testée');
ws.close();
await sleep(300);
console.log(failures ? `${failures} échec(s)` : 'Tout est bon');
process.exit(failures ? 1 : 0);
