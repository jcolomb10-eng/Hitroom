# Hitroom

Blind test musical **multijoueur en direct**, dans l'esprit de QuiChante : tout le monde entend le même extrait au même moment, le premier qui tape l'artiste ou le titre marque le plus de points.

- **Jouer maintenant** : salons publics par style (Mix, Années 80 à 2020, Variété FR, Rap FR, Rap US, Rock, Électro, K-Pop, Ciné & séries), ouverts 24h/24. Des bots (marqués « BOT ») complètent quand il y a peu de monde.
- **Créer un salon** : salon privé avec un code de 4 caractères (et un lien à partager). L'hôte choisit la catégorie, le nombre de manches, la durée des extraits et les bots.
- **Rejoindre un salon** : avec le code.
- Classement en direct, chat, séries, bonus de rapidité, classement mensuel, défis du jour et de saison, niveaux, pièces, boutique de cadres et de thèmes.

## Comment ça marche

Tout tourne sur **Cloudflare Workers** (gratuit) :

| Fichier | Rôle |
|---|---|
| `public/index.html` | L'appli (HTML, CSS et JavaScript en un seul fichier) |
| `src/worker.js` | Point d'entrée : sert le site et les routes `/api/` |
| `src/room.js` | Un salon = un mini-serveur (Durable Object) : extraits, chrono, réponses, points, bots, chat |
| `src/hub.js` | Recherche des extraits sur iTunes (mémoire 30 jours), compteurs des salons publics, classement |
| `src/match.js` | Reconnaissance des réponses (fautes, accents, saisie partielle, artiste + titre d'un coup) |
| `src/itunes.js` | Choix de la bonne version sur iTunes (pas de live, remix ni karaoké) |
| `src/catalog.js` | Les 354 morceaux, par catégorie |
| `src/filter.js` | Grossièretés masquées (chat et pseudos) |
| `wrangler.jsonc` | Configuration Cloudflare |

Les extraits de 30 secondes et les pochettes viennent des API publiques de Deezer et d'iTunes (lien « Écouter sur Deezer / Apple Music » affiché à chaque réponse). Depuis Cloudflare, iTunes refuse souvent (erreur 429) : Deezer prend le relais. Les réponses ne sont jamais envoyées aux joueurs avant la fin de la manche : c'est le serveur qui les vérifie.

## Mise en ligne (une seule fois)

1. Créer un compte gratuit sur <https://dash.cloudflare.com/sign-up>.
2. Menu **Workers & Pages** → **Créer** → **Importer un dépôt** → connecter GitHub → choisir ce dépôt.
3. Laisser les réglages proposés (commande de déploiement `npx wrangler deploy`) → **Déployer**.
4. Le site est en ligne sur `https://hitroom.<ton-sous-domaine>.workers.dev`. Ensuite, chaque modification envoyée sur `main` est publiée automatiquement.

Au premier lancement, le catalogue se remplit petit à petit (une quarantaine de minutes pour tout vérifier). L'état est visible sur `/api/status` et les morceaux introuvables sur `/api/introuvables`.

## Tester en local

```bash
npm install
echo 'MOCK_MUSIC=1' > .dev.vars      # extraits simulés (pas besoin d'iTunes)
npx wrangler dev --port 8787
npm test                              # tests de la reconnaissance des réponses et du catalogue
NODE_PATH=$(npm root -g) node test/e2e-multijoueur.cjs   # partie complète à 3 joueurs (Playwright)
node test/e2e-cas-limites.mjs        # hôte qui part, code inconnu, double onglet, grossièretés…
```
