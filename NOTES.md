# Notes (fait / reste à faire)

**Fait** : 1.18 en ligne (22/10/2026). 1.19 Halloween (catégorie Frissons, Nuit des Frissons 31/10-1/11, cadre Citrouille + avatars Chauve-souris et Chauve-citrouille en images de l'utilisateur, décor, récompenses) : prête sur la branche `ccr-34033fc3-flg6oc`, tests OK, PAS publiée.

**Reste à faire**
- L'utilisateur dit « publie » : fusionner la branche dans `main`, puis contrôler `/api/introuvables` (38 morceaux Frissons non vérifiés en France).
- Tests : repartir d'un état vide (`rm -rf .wrangler/state`) avant `e2e-v118.*` et `e2e-halloween.cjs`.
- Pari de duel : écran pas testé dans le navigateur. Tournoi : pas de tableau ni de spectateurs.
- Catalogue 1.14 : 9 morceaux introuvables à remplacer ; `ADMIN_KEY` à créer dans Cloudflare.
