// Mini playlist pour Facebook : tire un morceau du catalogue, prend l'extrait de 30 s sur Deezer et fabrique
//   1. quiz.mp4      : vidéo de 30 s (4:5, format fil d'actualité) avec compte à rebours « Quel est ce titre ? Réponds en commentaire »
//   2. reponse.png   : image de la réponse à publier plus tard (jaquette, titre, artiste)
//   3. texte.txt     : texte de la publication + texte de la réponse
// Utilisation (depuis la racine du dépôt) :
//   NODE_PATH=$(npm root -g) node tools/miniplaylist.mjs                       (morceau français des années 80 au hasard)
//   NODE_PATH=$(npm root -g) node tools/miniplaylist.mjs --cat 90 --fr         (autre catégorie, chanté en français)
//   NODE_PATH=$(npm root -g) node tools/miniplaylist.mjs --titre "Voyage, voyage" --sortie playlist-1
// Options : --cat <id catalogue, 80 par défaut> --fr / --tout (français seulement par défaut en 80) --titre "<titre>" --format feed|carre --sortie <dossier>
// Droits : l'extrait vient de l'API Deezer (usage non commercial). Facebook peut couper le son d'une vidéo contenant de la musique
// protégée : c'est à l'éditeur de la page de décider de publier (voir NOTES.md).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = n => { const i = process.argv.indexOf('--' + n); return i < 0 ? null : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const CAT = arg('cat') || '80', FORMAT = arg('format') || 'feed', ONLY_FR = !arg('tout');
const W = 1080, H = FORMAT === 'carre' ? 1080 : 1350, FPS = 30, DUR = 30;
const OUT = path.resolve(arg('sortie') || `playlist-${new Date().toISOString().slice(0, 10)}`);
fs.mkdirSync(OUT, { recursive: true });
const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// ---------- 1. le morceau ----------
const src = fs.readFileSync(path.join(ROOT, 'src/catalog.js'), 'utf8');
const block = new RegExp("^  '?" + CAT + "'?: `\\n([\\s\\S]*?)`", 'm').exec(src);
if (!block) throw new Error('catégorie inconnue : ' + CAT);
const catName = (new RegExp("id: '" + CAT + "', name: '([^']+)'").exec(src) || [])[1] || CAT;
let songs = block[1].split('\n').filter(Boolean).map(l => { const p = l.split('|').map(x => x.trim()); return { t: p[0].split('~')[0].trim(), tv: p[0].split('~').map(x => x.trim()), a: p[1].split('~')[0].trim(), fr: p[2] === 'fr' }; });
if (ONLY_FR) songs = songs.filter(s => s.fr);
const want = arg('titre');
const pickOne = want && want !== true ? songs.find(s => norm(s.t) === norm(want)) || { t: want, tv: [want], a: '', fr: true } : songs[Math.floor(Math.random() * songs.length)];
if (!pickOne) throw new Error('aucun morceau');

// ---------- 2. l'extrait Deezer (30 s) ----------
const getJson = async u => (await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Zikroom miniplaylist)' } })).json();
async function findTrack(s) {
  const q = encodeURIComponent(`${s.a} ${s.t}`.trim());
  const d = await getJson(`https://api.deezer.com/search?q=${q}&limit=25`);
  const bad = /live|remix|karaok|instrumental|piano|version 20|reprise|acoustic|cover|tribute|medley/i;
  const cands = (d.data || []).filter(x => x.preview && (!s.a || norm(x.artist.name).includes(norm(s.a)) || norm(s.a).includes(norm(x.artist.name))) && s.tv.some(v => norm(x.title).startsWith(norm(v))) && !bad.test(x.title + ' ' + x.album.title));
  cands.sort((x, y) => y.rank - x.rank);
  return cands[0];
}
let song = pickOne, tr = await findTrack(song);
for (let k = 0; !tr && k < 8 && !(want && want !== true); k++) { song = songs[Math.floor(Math.random() * songs.length)]; tr = await findTrack(song); }
if (!tr) throw new Error('extrait introuvable sur Deezer pour ' + song.t);
const info = { titre: tr.title.replace(/\s*[-(].*$/, '').trim() || song.t, artiste: tr.artist.name, album: tr.album.title, cover: tr.album.cover_xl || tr.album.cover_big };
console.log(`Morceau : ${info.titre} — ${info.artiste} (${catName})`);
const mp3 = path.join(OUT, 'extrait.mp3');
fs.writeFileSync(mp3, Buffer.from(await (await fetch(tr.preview)).arrayBuffer()));
const coverFile = path.join(OUT, 'jaquette.jpg');
try { fs.writeFileSync(coverFile, Buffer.from(await (await fetch(info.cover)).arrayBuffer())); } catch { /* sans jaquette */ }

// ---------- 3. le spectre sonore, image par image (barres qui bougent avec la musique) ----------
const pcm = sh('ffmpeg', ['-v', 'error', '-i', mp3, '-t', String(DUR), '-ac', '1', '-ar', '22050', '-f', 's16le', '-']);
const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2)), SR = 22050, N = 1024, NB = 24;
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
}
const bands = [];
for (let f = 0; f < DUR * FPS; f++) {
  const off = Math.floor(f / FPS * SR), re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = (samples[off + i] || 0) / 32768 * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
  fft(re, im);
  const row = [];
  for (let b = 0; b < NB; b++) { const lo = Math.floor(60 * Math.pow(7000 / 60, b / NB) / (SR / N)), hi = Math.max(lo + 1, Math.floor(60 * Math.pow(7000 / 60, (b + 1) / NB) / (SR / N))); let m = 0; for (let k = lo; k < hi; k++) m += Math.hypot(re[k], im[k]); row.push(m / (hi - lo)); }
  bands.push(row);
}
const mx = Math.max(...bands.flat()) || 1;
for (let f = 0; f < bands.length; f++) for (let b = 0; b < NB; b++) { const v = Math.pow(bands[f][b] / mx, 0.6); bands[f][b] = f ? Math.max(v, bands[f - 1][b] * 0.82) : v; }

// ---------- 4. la page animée (rendue image par image) ----------
const logo = pathToFileURL(path.join(ROOT, 'public/logo.webp')).href;
const cover = fs.existsSync(coverFile) ? pathToFileURL(coverFile).href : '';
const html = ({ reveal }) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#05060f}
#st{position:relative;width:${W}px;height:${H}px;overflow:hidden;font-family:'Inter Display','Inter','Noto Color Emoji',sans-serif;color:#fff;background:radial-gradient(ellipse at 50% 30%,#2a0f45 0%,#12091f 50%,#05060f 100%)}
.g{position:absolute;border-radius:50%;filter:blur(60px)}
#logo{position:absolute;left:50%;top:46px;width:430px;transform:translateX(-50%);filter:drop-shadow(0 0 22px rgba(255,60,172,.5))}
#tag{position:absolute;left:0;right:0;top:${H === 1080 ? 150 : 175}px;text-align:center;font-size:34px;font-weight:800;letter-spacing:6px;color:#ffd85c;text-shadow:0 0 18px rgba(255,216,92,.5)}
#sub{position:absolute;left:0;right:0;top:${H === 1080 ? 198 : 228}px;text-align:center;font-size:30px;font-weight:600;color:#ffb8e6}
#disc{position:absolute;left:50%;top:${H === 1080 ? 270 : 330}px;width:${H === 1080 ? 380 : 470}px;height:${H === 1080 ? 380 : 470}px;margin-left:-${H === 1080 ? 190 : 235}px;border-radius:50%;background:repeating-radial-gradient(circle,#0b0714 0 6px,#1a1030 6px 8px);box-shadow:0 0 70px rgba(255,60,172,.55),0 0 140px rgba(138,92,255,.4);border:4px solid rgba(255,60,172,.8)}
#disc i{position:absolute;left:50%;top:50%;width:36%;height:36%;margin:-18% 0 0 -18%;border-radius:50%;background:conic-gradient(from 0deg,#ff3cac,#8a5cff,#ff3cac);display:grid;place-items:center;font-style:normal;font-size:${H === 1080 ? 70 : 88}px}
#bars{position:absolute;left:60px;right:60px;top:${H === 1080 ? 690 : 850}px;height:110px;display:flex;align-items:flex-end;gap:7px}
#bars b{flex:1;border-radius:6px 6px 2px 2px;background:linear-gradient(0deg,#ff3cac,#8a5cff)}
#q{position:absolute;left:40px;right:40px;top:${H === 1080 ? 830 : 990}px;text-align:center;font-size:${H === 1080 ? 44 : 54}px;font-weight:900;line-height:1.15;text-shadow:0 0 24px rgba(190,80,255,.7)}
#q small{display:block;margin-top:10px;font-size:${H === 1080 ? 32 : 38}px;font-weight:700;color:#ffd85c}
#cd{position:absolute;right:56px;top:${H === 1080 ? 300 : 360}px;width:118px;height:118px}
#cd text{font:900 48px 'Inter Display',sans-serif;fill:#fff}
#snd{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);padding:14px 34px;border-radius:50px;background:linear-gradient(90deg,#ff3cac,#8a5cff);font-size:36px;font-weight:900;letter-spacing:1px;white-space:nowrap;box-shadow:0 0 40px rgba(255,60,172,.7)}
#foot{position:absolute;left:0;right:0;bottom:34px;text-align:center;font-size:28px;font-weight:700;color:#ffb8e6}
#cov{position:absolute;left:50%;top:${H === 1080 ? 250 : 300}px;width:${H === 1080 ? 380 : 480}px;height:${H === 1080 ? 380 : 480}px;margin-left:-${H === 1080 ? 190 : 240}px;border-radius:28px;object-fit:cover;box-shadow:0 0 70px rgba(255,60,172,.6);border:4px solid rgba(255,60,172,.85)}
#ans{position:absolute;left:30px;right:30px;top:${H === 1080 ? 650 : 830}px;text-align:center}
#ans .t{font-size:${H === 1080 ? 58 : 70}px;font-weight:900;line-height:1.1;text-shadow:0 0 26px rgba(255,60,172,.7)}
#ans .a{margin-top:14px;font-size:${H === 1080 ? 44 : 52}px;font-weight:700;color:#ffd85c}
#ans .m{margin-top:14px;font-size:30px;font-weight:600;color:#ffb8e6}
</style></head><body><div id="st">
<div class="g" style="width:700px;height:700px;left:-250px;top:60px;background:radial-gradient(circle,rgba(255,60,172,.5),transparent 65%)"></div>
<div class="g" style="width:760px;height:760px;left:480px;top:${H - 560}px;background:radial-gradient(circle,rgba(138,92,255,.5),transparent 65%)"></div>
<img id="logo" src="${logo}">
<div id="tag">${reveal ? '✅ LA RÉPONSE' : '🎵 MINI PLAYLIST'}</div><div id="sub">${catName} · chanson française</div>
${reveal ? `<img id="cov" src="${cover}"><div id="ans"><div class="t">${info.titre.replace(/</g, '&lt;')}</div><div class="a">${info.artiste.replace(/</g, '&lt;')}</div><div class="m">Tu avais trouvé ? Dis-le en commentaire 👇</div></div>` : `
<div id="disc"><i>🎵</i></div>
<div id="bars">${'<b></b>'.repeat(NB)}</div>
<svg id="cd" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="rgba(5,6,15,.8)" stroke="rgba(255,255,255,.18)" stroke-width="8"/><circle id="ring" cx="60" cy="60" r="52" fill="none" stroke="#ff3cac" stroke-width="8" stroke-linecap="round" transform="rotate(-90 60 60)" stroke-dasharray="326.7" stroke-dashoffset="0"/><text id="num" x="60" y="77" text-anchor="middle">30</text></svg>
<div id="snd">🔊 ACTIVE LE SON</div>
<div id="q">Quel est ce titre ?<br>Quel est l'artiste ?<small>Réponds en commentaire 👇</small></div>`}
<div id="foot">Joue au blind test sur Zikroom · zikroom.jcolomb10.workers.dev</div>
</div>
<script>window.BANDS=${JSON.stringify(bands.map(r => r.map(v => +v.toFixed(3))))};
window.render=t=>{const f=Math.min(${DUR * FPS - 1},Math.floor(t*${FPS})),b=document.querySelectorAll('#bars b');
 if(b.length){b.forEach((e,i)=>{e.style.height=(8+window.BANDS[f][i]*100)+'px'});
  const bass=(window.BANDS[f][0]+window.BANDS[f][1]+window.BANDS[f][2])/3;
  document.getElementById('disc').style.transform='rotate('+(t*90)+'deg) scale('+(1+bass*0.05)+')';
  const left=Math.max(0,${DUR}-t);document.getElementById('num').textContent=Math.ceil(left);
  document.getElementById('ring').setAttribute('stroke-dashoffset',(326.7*(1-left/${DUR})).toFixed(1));
  const sn=document.getElementById('snd');sn.style.opacity=Math.max(0,Math.min(1,11-t));sn.style.transform='translateX(-50%) scale('+(1+Math.abs(Math.sin(t*5))*0.08)+')';
  const q=document.getElementById('q');q.style.transform='scale('+(1+Math.sin(t*3)*0.012)+')';}
 document.getElementById('logo').style.opacity=1};
window.ready=true;</script></body></html>`;

// ---------- 5. le rendu ----------
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const framesDir = path.join(OUT, '_images'); fs.mkdirSync(framesDir, { recursive: true });
const makePage = async h => { const p = await browser.newPage({ viewport: { width: W, height: H } }); const f = path.join(OUT, '_page.html'); fs.writeFileSync(f, h); await p.goto(pathToFileURL(f).href); await p.waitForFunction(() => window.ready); await p.waitForTimeout(400); return p; };
// image de la réponse
const rp = await makePage(html({ reveal: true })); await rp.evaluate(() => window.render(0)); await rp.screenshot({ path: path.join(OUT, 'reponse.png') }); await rp.close();
// vidéo : 4 pages en parallèle
const total = DUR * FPS, workers = 4, pages = await Promise.all(Array.from({ length: workers }, () => makePage(html({ reveal: false }))));
await Promise.all(pages.map(async (p, w) => { for (let f = w; f < total; f += workers) { await p.evaluate(t => window.render(t), f / FPS); await p.screenshot({ path: path.join(framesDir, `f_${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 }); } }));
await browser.close();
sh('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, 'f_%04d.jpg'), '-i', mp3, '-t', String(DUR), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', path.join(OUT, 'quiz.mp4')]);
fs.rmSync(framesDir, { recursive: true, force: true }); fs.rmSync(path.join(OUT, '_page.html'), { force: true });

// ---------- 6. les textes ----------
fs.writeFileSync(path.join(OUT, 'texte.txt'), `PUBLICATION (avec quiz.mp4)
🎵 MINI PLAYLIST · ${catName} 🇫🇷
Tu connais ce tube ? 30 secondes pour trouver le titre ET l'artiste !
🔊 Active le son, puis 👇 réponds en commentaire : la réponse arrive bientôt.

🎧 Tu aimes les blind tests ? Défie tes amis en direct sur Zikroom : https://zikroom.jcolomb10.workers.dev
(appli gratuite en test, premiers testeurs recherchés 🚧)

#blindtest #quiz #musique #annees80 #chansonfrancaise #zikroom

———
RÉPONSE (avec reponse.png, à publier en commentaire ou plus tard)
✅ C'était « ${info.titre} » de ${info.artiste} !
Bravo à ceux qui ont trouvé 👏
Envie d'autres blind tests ? Joue sur Zikroom : https://zikroom.jcolomb10.workers.dev
`);
fs.writeFileSync(path.join(OUT, 'reponse.txt'), `${info.titre} — ${info.artiste} (${info.album})\n`);
console.log('Fichiers dans', OUT, ': quiz.mp4, reponse.png, texte.txt, reponse.txt, extrait.mp3, jaquette.jpg');
