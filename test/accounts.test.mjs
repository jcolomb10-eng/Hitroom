import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyGoogle, validEmail, validPassword, maskEmail, hashPassword } from '../src/accounts.js';

const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
async function token(claims, kid = 'k1') {
  const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid };
  const body = enc({ alg: 'RS256', kid }) + '.' + enc(claims);
  const sig = Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(body))).toString('base64url');
  return { tk: body + '.' + sig, keys: [jwk] };
}
const NOW = 1_800_000_000_000, good = { aud: 'cid', iss: 'https://accounts.google.com', exp: NOW / 1000 + 600, email: 'Lea@Gmail.com', email_verified: true };

test('jeton Google valide', async () => { const { tk, keys } = await token(good); assert.equal(await verifyGoogle(tk, 'cid', NOW, keys), 'lea@gmail.com'); });
test('jeton Google refusé : mauvais client, expiré, e-mail non vérifié, mauvaise clé, falsifié', async () => {
  const { tk, keys } = await token(good);
  assert.equal(await verifyGoogle(tk, 'autre', NOW, keys), null);
  assert.equal(await verifyGoogle(tk, '', NOW, keys), null);
  assert.equal(await verifyGoogle((await token({ ...good, exp: NOW / 1000 - 5 })).tk, 'cid', NOW, keys), null);
  const bad = await token({ ...good, email_verified: false }); assert.equal(await verifyGoogle(bad.tk, 'cid', NOW, bad.keys), null);
  const other = await token(good); assert.equal(await verifyGoogle(tk, 'cid', NOW, other.keys), null);
  const [h, p, s] = tk.split('.'); assert.equal(await verifyGoogle(`${h}.${enc({ ...good, email: 'x@y.fr' })}.${s}`, 'cid', NOW, keys), null);
});
test('e-mail, mot de passe, masque, empreinte', async () => {
  assert.ok(validEmail('a@b.fr')); assert.ok(!validEmail('a@b')); assert.ok(!validPassword('1234567')); assert.ok(validPassword('12345678'));
  assert.equal(maskEmail('lea@ex.fr'), 'le***@ex.fr');
  const a = await hashPassword('x', 'ab12'), b = await hashPassword('x', 'ab12'); assert.equal(a, b); assert.notEqual(a, await hashPassword('y', 'ab12'));
});
