# Zikroom — liens d'administration

Remplace **TA_CLE** par ton mot de passe `ADMIN_KEY` (celui que tu as créé dans Cloudflare).
Ne partage jamais ces liens une fois la clé écrite dedans.

## Statistiques de fréquentation
- Page (la clé est demandée une fois, puis gardée sur ton téléphone) :
  https://zikroom.jcolomb10.workers.dev/stats.html
- Données brutes :
  https://zikroom.jcolomb10.workers.dev/api/stats?key=TA_CLE

## Anti-triche et signalements
- Joueurs suspects (identifiant public, jamais le vrai) :
  https://zikroom.jcolomb10.workers.dev/api/suspects?key=TA_CLE
- Signalements des joueurs :
  https://zikroom.jcolomb10.workers.dev/api/signalements?key=TA_CLE

## État du jeu (sans clé)
- Appli : https://zikroom.jcolomb10.workers.dev
- Catalogue de morceaux (combien sont prêts) : https://zikroom.jcolomb10.workers.dev/api/status
- Morceaux introuvables à remplacer : https://zikroom.jcolomb10.workers.dev/api/introuvables

## Où est la clé
Cloudflare → Workers & Pages → zikroom → Settings → Runtime variables and secrets → `ADMIN_KEY`.
(Un secret ne se relit pas : si tu l'oublies, remplace-le par un nouveau.)
