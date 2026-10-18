# Hitroom

Blind test musical en salons live. Devine le titre et l'artiste d'un extrait de 30 secondes, avec d'autres joueurs, dans des salons par style de musique.

## Jouer

Site en ligne : *à venir* (déployé sur Vercel).

Un seul fichier HTML autonome (`index.html`), rien à installer.

## Prototype V0

Mode solo contre bots simulés avec classement « live » et chat. 5 catégories de musique :

- Variété française
- Années 80 / 90 internationales
- Pop actuelle
- Rap français
- Films cultes

Chaque catégorie contient une quinzaine de titres. Les extraits de 30 secondes sont récupérés en direct via l'**API iTunes officielle** (gratuite, extraits légaux, aucun paiement de droits).

## Architecture

- `index.html` : toute l'appli en un fichier (HTML + CSS + JS)
- `vercel.json` : règle de redirection `/api/itunes/*` → `https://itunes.apple.com/*` (contourne les restrictions CORS du navigateur)

## Roadmap

- **V1** : défier un ami par lien (asynchrone)
- **V2** : vrais salons live avec backend temps réel (Supabase Realtime), chat réel, classement partagé
- **V3** : publication sur Play Store (via TWA)
