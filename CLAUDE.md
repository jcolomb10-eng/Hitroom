# Hitroom — mémoire du projet

Blind test musical **multijoueur en direct** (l'esprit de QuiChante.com), en appli web installable.
Propriétaire : jcolomb10-eng (jcolomb10@gmail.com), qui a aussi Prixy. Utilisateur francophone, non développeur : répondre en français, simplement, avec des étapes claires.

- Maquette de référence : 10 écrans (accueil, catégories, salon, partie, fin, profil, classements, défis, boutique, paramètres), noir avec bordures néon or et rose. L'utilisateur autorise à l'améliorer.
- Version : **1.0** (constante `VERSION` dans `public/index.html`, à incrémenter à chaque publication).
- Hébergement prévu : **Cloudflare Workers** (gratuit, Durable Objects en SQLite) relié au dépôt GitHub, publication automatique depuis `main`. **Pas encore en ligne** : l'utilisateur doit créer le compte Cloudflare (étapes dans `README.md`).
- **Vercel** : le dépôt y est encore relié (ancien prototype). `vercel.json` y coupe toute publication automatique ; le projet Vercel est à débrancher ou supprimer par l'utilisateur (Vercel ne gère pas les WebSockets des salons).
- Ancien prototype V0 (solo contre bots) remplacé ; `logo.jpg` à la racine = logo d'origine (source de `public/logo.webp` et des icônes).

## Règles

1. Travailler sur une branche, fusionner dans `main` seulement quand l'utilisateur est d'accord (`main` = production dès que Cloudflare est branché).
2. Toujours lancer `npm test` et les tests bout en bout avant d'envoyer.
3. Commits : auteur `jcolomb10-eng <jcolomb10@gmail.com>`.
4. Les bots doivent rester signalés (« BOT », 🤖) : ne jamais les faire passer pour de vrais joueurs.

## Fonctionnement

- **Salons** (`src/room.js`, un Durable Object par salon) : publics `pub:<catégorie>` (bots si moins de 4 humains, partie suivante 15 s après la fin) ou privés `priv:<CODE>` (code de 4 caractères sans I/O/0/1, hôte = créateur, transmis si l'hôte part). 12 humains max. État en mémoire (WebSocket classiques, pas d'hibernation).
- **Déroulé** : `loading` → `countdown` (4 s) → `play` (15/20/30 s, top départ commun `start`) → `reveal` (6 s) → … → `end`. Fin de manche anticipée si tous les humains ont tout trouvé.
- **Points** : titre 15, artiste 10, rapidité 0 à 5 par trouvaille, série +1 par manche consécutive (max +5). Réponses vérifiées côté serveur (`judge` dans `src/match.js`, seuil 0,8). Réponse tapée dans le chat = comptée et non diffusée.
- **Déconnexion** : 15 s de grâce (on garde les points), même `uid` = même joueur, un 2e onglet remplace le 1er.
- **Extraits** (`src/hub.js`) : recherche iTunes (`country=FR`), meilleure version choisie par `src/itunes.js`, mémorisée 30 jours en SQLite, catalogue préchargé par alarme (8 morceaux par minute). Morceaux introuvables : `/api/introuvables` ; état : `/api/status`. iTunes limité → pause de 5 min.
- **Catalogue** (`src/catalog.js`) : 13 catégories, 354 morceaux, format `Titre ~ variante | Artiste ~ variante`.
- **Côté joueur** (`public/index.html`, sauvegarde `localStorage` `hitroom.v1`) : pseudo, avatar emoji, XP (100 × niveau pour passer au suivant), pièces, cadres, thèmes (`data-theme` : or, neon, cyan), défis du jour et de saison, badges. Classement mensuel et « tous les temps » sur le serveur (`/api/board`).
- **API** : `/api/public/<cat>/ws`, `POST /api/salon` (nouveau code), `/api/salon/<CODE>` (infos), `/api/salon/<CODE>/ws`, `/api/counts`, `/api/board?sc=season|all&uid=`.

## Tests

- `npm test` : reconnaissance des réponses, choix iTunes, catalogue.
- Local : `.dev.vars` avec `MOCK_MUSIC=1` (extraits simulés `/__mock/…`), `npx wrangler dev --port 8787`.
- `NODE_PATH=$(npm root -g) node test/e2e-multijoueur.cjs` : 3 joueurs (création, lien, code, réglages, 5 manches, chat, coupure réseau, relance) + 1 joueur en salon public, captures dans `/tmp/hitroom-shots`.
- `node test/e2e-cas-limites.mjs` : code inconnu, droits de l'hôte, transfert d'hôte, double onglet, grossièretés, salon public abandonné.
- iTunes n'est pas joignable depuis l'environnement Claude : la vraie recherche ne se vérifie qu'une fois en ligne.

## Prochaines étapes

1. Mise en ligne sur Cloudflare (compte de l'utilisateur), puis vérifier `/api/status` et `/api/introuvables` et corriger le catalogue.
2. Comptes (pour garder sa progression d'un appareil à l'autre) ; aujourd'hui tout est sur l'appareil.
3. Mode hors connexion / service worker, notifications « tes amis jouent ».
4. Nom de domaine, vérification des conditions d'Apple pour les extraits avant un lancement public, Play Store (TWA).
