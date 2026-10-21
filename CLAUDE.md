# Hitroom — mémoire du projet

Blind test musical **multijoueur en direct** (l'esprit de QuiChante.com), en appli web installable.
Propriétaire : jcolomb10-eng (jcolomb10@gmail.com), qui a aussi Prixy. Utilisateur francophone, non développeur : répondre en français, simplement, avec des étapes claires.

- Maquette de référence : 10 écrans (accueil, catégories, salon, partie, fin, profil, classements, défis, boutique, paramètres), noir avec bordures néon or et rose. L'utilisateur autorise à l'améliorer.
- Version : **1.1** (constante `VERSION` dans `public/index.html`, à incrémenter à chaque publication).
- Hébergement : **Cloudflare Workers** (gratuit, Durable Objects en SQLite) relié au dépôt GitHub (Workers Builds), publication automatique depuis `main`. Worker nommé **`hitroom`** : https://hitroom.jcolomb10.workers.dev. Le `name` de `wrangler.jsonc` doit rester identique au nom du Worker, sinon la publication échoue. Résultat des publications visible sur GitHub (check « Workers Builds: hitroom » sur chaque commit de `main`).
- Projet Cloudflare **Pages** « hitroom » (hitroom.pages.dev) créé par erreur : il publie seulement l'affichage, sans serveur ; à supprimer.
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
- **Points** : titre 15, artiste 10, rapidité 0 à 5 par trouvaille, série +1 par manche consécutive (max +5). Réponse tapée dans le chat = comptée et non diffusée.
- **Réponses strictes** (demande de l'utilisateur, `judge` dans `src/match.js`) : titre ou artiste **en entier** ; pendant la frappe seule la réponse exacte est validée (accents, majuscules, ponctuation, articles ignorés) ; avec **Entrée**, fautes tolérées selon la longueur (0 jusqu'à 4 lettres, 1 jusqu'à 8, 2 jusqu'à 14, 3 au-delà). Pas de début de mot (« tchi » ≠ Tchikita), pas de nom de famille seul ; raccourcis retirés du catalogue.
- **Rangs** (`src/ranks.js`) : Bronze 0, Argent 100, Or 200, Platine 300, Diamant 400, Rubis 500, Émeraude 600, Maître 700, Grand Maître 850 points de rang (PR). Seules les parties publiques (« Jouer maintenant ») sont classées ; salons privés = parties amicales. PR selon la place, bots compris (`rpDelta` : 1er +35 en Bronze … +18 en Grand Maître ; dernier −5 … −22 ; +5 si partie parfaite ; proportionnel à la part jouée, rien sous 50 %).
- **Niveaux séparés** : salons publics `pub:<catégorie>:<niveau>` (0 Bronze-Argent, 1 Or-Platine, 2 Diamant-Rubis, 3 Émeraude-Grand Maître) ; le rang vient du serveur (le Worker le cherche dans le Hub et le passe au salon), jamais de l'appli. Bots à la difficulté du niveau (`BOT_SKILL`) ; en privé, l'hôte choisit (Facile, Moyen, Difficile, Expert).
- **Saisons mensuelles** : tables `ranks` (uid, saison, rp, meilleur) et `rewards` dans le Hub. 1re visite d'une nouvelle saison : rang ramené à la moitié arrondie au palier (`softReset`) et récompense de la saison précédente (pièces selon le meilleur rang, 50 à 1 500, + badge de saison) donnée une fois par `/api/me`. Nouveau rang atteint dans la saison : 50 × numéro du rang en pièces. Classement « Saison actuelle » = PR, « Tous les temps » = points cumulés.
- **Déconnexion** : 15 s de grâce (on garde les points), même `uid` = même joueur, un 2e onglet remplace le 1er.
- **Extraits** (`src/hub.js`, `src/sources.js`) : iTunes d'abord puis **Deezer en secours**. En ligne, iTunes répond **429** à Cloudflare (adresse partagée par tous les Workers, constaté le 21/10/2026) : en pratique tout vient de Deezer. Meilleure version choisie par `src/itunes.js` (`pickBest`, aussi pour Deezer), mémorisée 30 jours en SQLite (colonnes `src`, `ext` = id Deezer) ; les liens Deezer expirent, donc lien frais (`/track/<id>`) à chaque partie. Catalogue préchargé par alarme (8 morceaux par minute). Diagnostic : `/api/status` (erreurs par source), `/api/status?test=1` (test en direct des deux sources), `/api/introuvables`. Source qui limite → pause de 5 min.
- **Catalogue** (`src/catalog.js`) : 13 catégories, 354 morceaux, format `Titre ~ variante | Artiste ~ variante`.
- **Côté joueur** (`public/index.html`, sauvegarde `localStorage` `hitroom.v1`) : pseudo, avatar emoji, XP (100 × niveau pour passer au suivant), pièces, cadres, thèmes (`data-theme` : or, neon, cyan), défis du jour et de saison, badges. Classement mensuel et « tous les temps » sur le serveur (`/api/board`).
- **API** : `/api/public/<cat>/ws`, `POST /api/salon` (nouveau code), `/api/salon/<CODE>` (infos), `/api/salon/<CODE>/ws`, `/api/counts?b=<niveau>`, `/api/board?sc=season|all&uid=`, `/api/me?uid=` (rang, place, récompense de saison).

## Tests

- `npm test` : reconnaissance des réponses, choix iTunes, catalogue.
- Local : `.dev.vars` avec `MOCK_MUSIC=1` (extraits simulés `/__mock/…`, parties publiques courtes, `/__mock/saison`), `npx wrangler dev --port 8787`.
- `NODE_PATH=$(npm root -g) node test/e2e-multijoueur.cjs` : 3 joueurs (création, lien, code, réglages, 5 manches, chat, coupure réseau, relance) + 1 joueur en salon public, captures dans `/tmp/hitroom-shots`.
- `node test/e2e-cas-limites.mjs` : code inconnu, droits de l'hôte, transfert d'hôte, double onglet, grossièretés, salon public abandonné.
- `NODE_PATH=$(npm root -g) node test/e2e-classe.cjs` : partie classée complète (réponses strictes, PR gagnés, classement, partie amicale, niveau des bots, changement de saison via `/__mock/saison`). En local (MOCK_MUSIC), les parties publiques durent 5 manches de 15 s.
- iTunes n'est pas joignable depuis l'environnement Claude : la vraie recherche ne se vérifie qu'une fois en ligne.

## Prochaines étapes

1. Mise en ligne sur Cloudflare (compte de l'utilisateur), puis vérifier `/api/status` et `/api/introuvables` et corriger le catalogue.
2. Comptes (pour garder sa progression d'un appareil à l'autre) ; aujourd'hui tout est sur l'appareil.
3. Mode hors connexion / service worker, notifications « tes amis jouent ».
4. Nom de domaine, vérification des conditions d'Apple pour les extraits avant un lancement public, Play Store (TWA).
