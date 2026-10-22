# Notes (fait / reste à faire)

**Fait (1.18, en test sur la branche `ccr-34033fc3-flg6oc`, PAS publiée)** : récompenses de fin de saison (3 meilleurs clubs, 100 meilleurs joueurs), coffre de club, guerre de clubs, rivalités, événement du week-end (pièces ×2, classement, récompenses), tournoi du samedi soir (version simplifiée), mode Survie, mode Intro 1 s, pari de pièces en duel, notifications « clubs ». Tous les tests passent (nouveaux : `extras.test.mjs`, `e2e-v118.mjs`, `e2e-v118.cjs`).

**Reste à faire**
- L'utilisateur regarde les captures (`/tmp/hitroom-shots/v118_*.png`) puis dit s'il faut publier (fusion dans `main`).
- Pas testé en navigateur : l'écran du pari de duel (seulement le serveur et `applyBet`) ; à vérifier à la main.
- Halloween : maquette seulement (https://claude.ai/artifact/5ZvtDTgii5ZoibcPnz4fkT) ; il faudrait catégorie « Frissons », cadre Citrouille, avatar Chauve-souris.
- Tournoi : tableau à élimination et spectateurs pas faits. Premium (abonnement), partage social : plus tard.
- Catalogue 1.14 : 9 morceaux introuvables à remplacer ; `ADMIN_KEY` à créer dans Cloudflare.
