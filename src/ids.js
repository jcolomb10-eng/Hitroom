// identifiant public d'un joueur, le même dans tous les salons (bloquer, inviter) ; l'uid, lui, reste secret
export function publicKey(uid) {
  let a = 2166136261, b = 5381;
  for (const c of 'hitroom-pk:' + uid) { a = Math.imul(a ^ c.charCodeAt(0), 16777619); b = Math.imul(b, 33) ^ c.charCodeAt(0); }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0').slice(0, 4);
}
