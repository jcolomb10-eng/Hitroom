// Ancien Worker « hitroom » : l'appli s'appelle maintenant Zikroom et vit sur un autre Worker.
// Tout lien de l'ancienne adresse (partage d'ami, invitation, salon...) est renvoyé vers la nouvelle, chemin et paramètres gardés.
import { DurableObject } from 'cloudflare:workers';

const TARGET = 'https://zikroom.jcolomb10.workers.dev';

// anciennes classes gardées vides (le Worker les possédait : les supprimer demanderait une migration)
export class Hub extends DurableObject {}
export class Room extends DurableObject {}

export default {
  fetch(req) {
    const u = new URL(req.url);
    return Response.redirect(TARGET + u.pathname + u.search, 301);
  },
};
