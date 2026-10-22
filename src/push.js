// Notifications (Web Push) sans contenu chiffré : le serveur « réveille » le téléphone (push vide, signé VAPID),
// puis le service worker vient chercher le message à afficher (/api/push/inbox). Pas de clé à créer à la main :
// le Hub fabrique sa paire de clés VAPID (P-256) la première fois et la garde dans sa base.

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const txt = s => new TextEncoder().encode(s);

export async function makeVapid() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  return { pub: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)), jwk: await crypto.subtle.exportKey('jwk', kp.privateKey) };
}

// en-tête Authorization d'un push vers ce service (aud = adresse du service, valable 12 h)
export async function vapidAuth(endpoint, vapid, subject) {
  const key = await crypto.subtle.importKey('jwk', vapid.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(txt(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(txt(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, txt(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${vapid.pub}`;
}

// envoie un push vide ; renvoie 'ok', 'gone' (abonnement à effacer) ou 'err'
export async function sendPush(endpoint, vapid, subject) {
  try {
    const r = await fetch(endpoint, { method: 'POST', body: '', headers: { Authorization: await vapidAuth(endpoint, vapid, subject), TTL: '86400', Urgency: 'normal' } });
    return r.ok ? 'ok' : r.status === 404 || r.status === 410 ? 'gone' : 'err';
  } catch { return 'err'; }
}

// identifiant court d'un abonnement (pour la boîte de messages)
export async function epHash(endpoint) {
  return b64u(await crypto.subtle.digest('SHA-256', txt(endpoint))).slice(0, 22);
}
