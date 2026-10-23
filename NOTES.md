# Notes (fait / reste à faire)

**Fait** : 1.18 en ligne (22/10/2026). 1.19 Halloween (catégorie Frissons, Nuit des Frissons 31/10-1/11, cadre Citrouille + avatars Chauve-souris et Chauve-citrouille en images de l'utilisateur, décor, récompenses) : en ligne ; événement de 48 h (vendredi 30/10 midi → dimanche 1er/11 midi), playlist secrète jusqu'au début, compte à rebours sur l'accueil.

**Reste à faire**
- Après le 30/10 midi : contrôler `/api/introuvables` (38 morceaux Frissons non vérifiés en France) et remplacer les manquants.
- Tests : repartir d'un état vide (`rm -rf .wrangler/state`) avant `e2e-v118.*` et `e2e-halloween.cjs`.
- Pari de duel : écran pas testé dans le navigateur. Tournoi : pas de tableau ni de spectateurs.
- Catalogue 1.14 : 9 morceaux introuvables à remplacer ; `ADMIN_KEY` à créer dans Cloudflare.

**Droits des extraits (vérifié le 23/10/2026)** : Deezer (conditions API) = usage strictement non commercial et privé, ni pub ni abonnement, accord préalable de Deezer pour tout autre usage ; Apple (iTunes Search API) = aperçus seulement pour promouvoir le catalogue, pas pour du divertissement, à côté d'un badge vers le magasin. Donc OK en test gratuit, pas pour un lancement public ni du premium : demander l'accord écrit de Deezer ou passer à des extraits sous licence.

- **1.20** (23/10/2026) : ouverture façon « rendu 3D » de l’utilisateur : fond violet sombre + logo néon (`vrai logo (`logo.jpg` découpé en `public/logo-icon.webp` et `logo-word.webp`), éclair blanc qui balaie la note (`lgReveal`)) qui s’allume, puis textes et boutons qui montent (CSS `neonOn`, `loginUp`) sur la page de connexion, à chaque ouverture. Vidéo de fond de connexion retirée. Reste : `test/e2e-modes.cjs` échoue en solo (lecture `#audio` simulée, ancien problème).

- **2.0 étape 1** (23/10/2026) : comptes e-mail + mot de passe faits et testés. Reste : portefeuille serveur (pièces/XP/achats), jeton de session, Google/code e-mail, page Confidentialité.

- **2.0 étape 2** : anti-triche serveur, portefeuille borné, connexion Google (à activer : créer `GOOGLE_CLIENT_ID`), e2e-multijoueur réparé (état local périmé). Reste : page Confidentialité RGPD, jeton de session, vrai portefeuille 100 % serveur.
