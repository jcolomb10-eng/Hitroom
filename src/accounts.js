import { publicKey } from './ids.js';
// Version 2.0 : vrais comptes (e-mail + mot de passe). Un compte est relié à l'uid de l'invité : on ne perd rien en le créant.
// Le mot de passe n'est jamais gardé, seulement son empreinte PBKDF2 (salée). Méthodes du Hub en bas.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;
const ITER = 100000; // maximum accepté par Cloudflare Workers
const MAX_FAILS = 5, LOCK_MS = 10 * 60 * 1000;

export const cleanEmail = s => String(s || '').trim().toLowerCase().slice(0, 120);
export const validEmail = s => EMAIL_RE.test(s);
export const validPassword = s => typeof s === 'string' && s.length >= 8 && s.length <= 100;
export const maskEmail = e => { const [u, d] = e.split('@'); return (u.length > 2 ? u.slice(0, 2) : u.slice(0, 1)) + '***@' + d; };

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const unhex = h => new Uint8Array((h.match(/../g) || []).map(x => parseInt(x, 16)));
export async function hashPassword(pw, saltHex) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: ITER }, key, 256));
}
export const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)));
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

export const accountMethods = {
  acctInit() {
    this.sql.exec(`CREATE TABLE IF NOT EXISTS accounts(email TEXT PRIMARY KEY, uid TEXT UNIQUE, salt TEXT, hash TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS ledger(uid TEXT PRIMARY KEY, xp INTEGER, coins INTEGER, games INTEGER, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS flags(uid TEXT PRIMARY KEY, why TEXT, n INTEGER, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS afails(email TEXT PRIMARY KEY, n INTEGER, ts INTEGER)`);
  },

  isBound(uid) { return this.sql.exec(`SELECT 1 FROM accounts WHERE uid = ?`, uid).toArray().length > 0; },

  acctStatus(uid) {
    const r = this.sql.exec(`SELECT email FROM accounts WHERE uid = ?`, uid).toArray()[0];
    return r ? { ok: 1, email: maskEmail(r.email) } : { ok: 0 };
  },

  async acctRegister(uid, email, pw) {
    email = cleanEmail(email);
    if (uid.length < 8) return { ok: 0, error: 'appareil inconnu' };
    if (!validEmail(email)) return { ok: 0, error: 'Adresse e-mail invalide.' };
    if (!validPassword(pw)) return { ok: 0, error: 'Mot de passe : 8 caractères au moins.' };
    if (this.isBound(uid)) return { ok: 0, error: 'Cet appareil a déjà un compte.' };
    if (this.sql.exec(`SELECT 1 FROM accounts WHERE email = ?`, email).toArray().length) return { ok: 0, error: 'Cette adresse a déjà un compte : connecte-toi.' };
    const salt = newSalt();
    this.sql.exec(`INSERT INTO accounts(email, uid, salt, hash, ts) VALUES(?,?,?,?,?)`, email, uid, salt, await hashPassword(pw, salt), Date.now());
    return { ok: 1, email: maskEmail(email) };
  },

  // connexion sur un autre appareil : rend l'uid du compte et sa dernière sauvegarde
  async acctLogin(email, pw) {
    email = cleanEmail(email);
    const f = this.sql.exec(`SELECT n, ts FROM afails WHERE email = ?`, email).toArray()[0];
    if (f && f.n >= MAX_FAILS && Date.now() - f.ts < LOCK_MS) return { ok: 0, error: 'Trop d’essais. Réessaie dans 10 minutes.' };
    const r = this.sql.exec(`SELECT uid, salt, hash FROM accounts WHERE email = ?`, email).toArray()[0];
    const good = r ? same(await hashPassword(String(pw || ''), r.salt), r.hash) : (await hashPassword('x', newSalt()), false);
    if (!good) {
      const n = f && Date.now() - f.ts < LOCK_MS ? f.n + 1 : 1;
      this.sql.exec(`INSERT OR REPLACE INTO afails(email, n, ts) VALUES(?,?,?)`, email, n, Date.now());
      return { ok: 0, error: 'E-mail ou mot de passe incorrect.' };
    }
    this.sql.exec(`DELETE FROM afails WHERE email = ?`, email);
    const s = this.sql.exec(`SELECT data FROM saves WHERE uid = ? ORDER BY ts DESC LIMIT 1`, r.uid).toArray()[0];
    return { ok: 1, uid: r.uid, data: s ? s.data : '' };
  },

  // suppression du compte (RGPD) : l'appareil redevient un invité, les données de jeu restent liées à l'uid
  async acctDelete(uid, pw) {
    const r = this.sql.exec(`SELECT salt, hash FROM accounts WHERE uid = ?`, uid).toArray()[0];
    if (!r || !same(await hashPassword(String(pw || ''), r.salt), r.hash)) return { ok: 0, error: 'Mot de passe incorrect.' };
    this.sql.exec(`DELETE FROM accounts WHERE uid = ?`, uid);
    return { ok: 1 };
  },

  // registre des gains de partie calculés par le serveur (l'appli ne peut pas y toucher)
  ledger(uid, xp, coins) {
    this.sql.exec(`INSERT INTO ledger(uid, xp, coins, games, ts) VALUES(?,?,?,1,?) ON CONFLICT(uid) DO UPDATE SET xp = xp + ?, coins = coins + ?, games = games + 1, ts = ?`, uid, xp, coins, Date.now(), xp, coins, Date.now());
  },

  flagUid(uid, why) {
    this.sql.exec(`INSERT INTO flags(uid, why, n, ts) VALUES(?,?,1,?) ON CONFLICT(uid) DO UPDATE SET n = n + 1, why = CASE WHEN instr(why, ?) THEN why ELSE why || ', ' || ? END, ts = ?`, uid, why, Date.now(), why, why, Date.now());
  },

  // l'XP ne vient que des parties (et de petites quêtes) : bien au-dessus de ce que le serveur a vu = progression modifiée
  auditSave(uid, data) {
    let o; try { o = JSON.parse(data); } catch { return; }
    const l = this.sql.exec(`SELECT xp, coins, games FROM ledger WHERE uid = ?`, uid).toArray()[0] || { xp: 0, coins: 0, games: 0 };
    const xp = +o.xp || 0, st = o.st || {};
    if (xp > 3 * l.xp + 3000) this.flagUid(uid, `XP ${xp} pour ${l.xp} vus`);
    if ((+st.games || 0) > l.games + 20) this.flagUid(uid, `parties ${st.games} pour ${l.games} vues`);
  },

  suspects() {
    return this.sql.exec(`SELECT uid, why, n, ts FROM flags ORDER BY n DESC, ts DESC LIMIT 100`).toArray().map(r => ({ pk: publicKey(r.uid), why: r.why, n: r.n, ts: r.ts }));
  },
};
