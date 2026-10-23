# Zikroom

Blind test musical **multijoueur en direct**, dans l'esprit de QuiChante : tout le monde entend le même extrait au même moment, le premier qui tape l'artiste ou le titre marque le plus de points.

- **Jouer maintenant** : parties **classées** dans des salons publics par style (Mix, Années 80 à 2020, Variété FR, Rap FR, Rap US, Rock, Électro, K-Pop, Ciné & séries), ouverts 24h/24, contre des joueurs de son niveau. Des bots (marqués « BOT ») du même niveau complètent quand il y a peu de monde.
- **Rangs** de Bronze à Grand Maître (Bronze, Argent, Or, Platine, Diamant, Rubis, Émeraude, Maître, Grand Maître) avec **saison chaque mois** et récompenses.
- **Créer un salon** : partie amicale (sans points de rang) avec un code de 4 caractères et un lien à partager. L'hôte choisit la catégorie, le nombre de manches, la durée des extraits, le nombre et le niveau des bots.
- Réponses : le titre ou l'artiste **en entier** ; petites fautes acceptées en appuyant sur Entrée.
- **Rejoindre un salon** : avec le code.
- **Hit du jour** : chaque jour, les 5 mêmes extraits pour tout le monde, un seul essai, et un résultat à partager façon Wordle (« Zikroom #42 🎵🎤🎵⬛🎵 »), avec classement du jour et série de jours.
- **Amis** : code ami, demandes, qui est en ligne et où il joue, rejoindre son salon, **duel en 1 contre 1** avec bilan des victoires.
- **Clubs** : rejoindre ou créer une équipe (30 membres) ; les points des membres en parties publiques et au Hit du jour s'additionnent pour le classement des clubs de la saison.
- Classement en direct, chat, séries, bonus de rapidité, classement mensuel, défis du jour et de saison, niveaux, pièces, boutique de cadres et de thèmes.
- Récompenses : médailles à 4 niveaux, titres sous le pseudo, carte de joueur avec vitrine, cadres de rang réalistes et animés (un par rang), route de saison gratuite (30 paliers par mois) et code de sauvegarde pour changer de téléphone.

## Comment ça marche

Tout tourne sur **Cloudflare Workers** (gratuit) :

| Fichier | Rôle |
|---|---|
| `public/index.html` | L'appli (HTML, CSS et JavaScript en un seul fichier) |
| `public/art.js` | Dessins vectoriels : emblèmes de rang et médailles |
| `public/frames/` | Cadres de rang (images, de Bronze à Grand Maître) ; sources dans `assets-src/cadres/`, conversion par `tools/cadres.py` |
| `src/worker.js` | Point d'entrée : sert le site et les routes `/api/` |
| `src/room.js` | Un salon = un mini-serveur (Durable Object) : extraits, chrono, réponses, points, bots, chat |
| `src/hub.js` | Recherche des extraits (iTunes, Deezer en secours), compteurs des salons publics, rangs, saisons, classements |
| `src/sources.js` | Appels aux API iTunes et Deezer |
| `src/match.js` | Reconnaissance des réponses (réponse entière, petites fautes avec Entrée, artiste + titre d'un coup) |
| `src/ranks.js` | Rangs, points de rang, niveaux des salons, saisons et récompenses |
| `src/itunes.js` | Choix de la bonne version sur iTunes (pas de live, remix ni karaoké) |
| `src/catalog.js` | Les 1 217 morceaux, par catégorie |
| `src/filter.js` | Grossièretés masquées (chat et pseudos) |
| `src/social.js` | Hit du jour (jour à l'heure de Paris, numéro, tirage, séries), code ami, clubs |
| `wrangler.jsonc` | Configuration Cloudflare |

Les extraits de 30 secondes et les pochettes viennent des API publiques de Deezer et d'iTunes (lien « Écouter sur Deezer / Apple Music » affiché à chaque réponse). Depuis Cloudflare, iTunes refuse souvent (erreur 429) : Deezer prend le relais. Les réponses ne sont jamais envoyées aux joueurs avant la fin de la manche : c'est le serveur qui les vérifie.

## Mise en ligne (une seule fois)

1. Créer un compte gratuit sur <https://dash.cloudflare.com/sign-up>.
2. Menu **Workers & Pages** → **Créer** → **Importer un dépôt** → connecter GitHub → choisir ce dépôt.
3. Laisser les réglages proposés (commande de déploiement `npx wrangler deploy`) → **Déployer**.
4. Le site est en ligne sur `https://zikroom.<ton-sous-domaine>.workers.dev`. Ensuite, chaque modification envoyée sur `main` est publiée automatiquement.

Au premier lancement, le catalogue se remplit petit à petit (environ 1 h 30 pour tout vérifier, 15 morceaux par minute). L'état est visible sur `/api/status` et les morceaux introuvables sur `/api/introuvables`.

## Tester en local

```bash
npm install
echo 'MOCK_MUSIC=1' > .dev.vars      # extraits simulés (pas besoin d'iTunes)
npx wrangler dev --port 8787
npm test                              # tests de la reconnaissance des réponses et du catalogue
NODE_PATH=$(npm root -g) node test/e2e-multijoueur.cjs   # partie complète à 3 joueurs (Playwright)
node test/e2e-cas-limites.mjs        # hôte qui part, code inconnu, double onglet, grossièretés…
NODE_PATH=$(npm root -g) node test/e2e-classe.cjs        # partie classée, rangs, changement de saison
NODE_PATH=$(npm root -g) node test/e2e-recompenses.cjs   # médailles, titres, route de saison, cadres, code de sauvegarde
NODE_PATH=$(npm root -g) node test/e2e-hitdujour.cjs     # Hit du jour : grille, partage, un seul essai, série
NODE_PATH=$(npm root -g) node test/e2e-amis.cjs          # amis, présence, duels
NODE_PATH=$(npm root -g) node test/e2e-clubs.cjs         # clubs, points, classement des clubs
```
