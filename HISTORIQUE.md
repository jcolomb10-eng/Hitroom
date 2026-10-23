# Zikroom — toute l'histoire du projet

Blind test musical **multijoueur en direct** (dans l'esprit de QuiChante.com), appli web installable.
Propriétaire : jcolomb10-eng. Hébergement : Cloudflare Workers (gratuit), publication automatique depuis `main`.
Adresse : https://hitroom.jcolomb10.workers.dev

> Ce fichier raconte tout le projet, version par version, en français simple.
> Pour le détail technique complet : `CLAUDE.md`. Pour le court résumé du moment : `NOTES.md`.

---

## Les débuts

- **Prototype V0** : jeu solo contre des robots (remplacé ensuite).
- **Maquette de référence** : 10 écrans (accueil, catégories, salon, partie, fin, profil, classements, défis, boutique, paramètres), fond noir avec bordures néon or et rose.
- **Vrai jeu multijoueur** : un salon en direct (un « Durable Object » Cloudflare par salon), 12 joueurs maximum, bots ajoutés quand il manque du monde (toujours marqués « BOT » 🤖).
- **Déroulé d'une partie** : chargement → compte à rebours 4 s → manche de 15/20/30 s → révélation 6 s → … → fin avec podium.
- **Points** : titre 15, artiste 10, rapidité 0 à 5, série +1 par manche de suite (max +5).
- **Réponses strictes** : titre ou artiste en entier, accents/majuscules ignorés, petites fautes tolérées seulement avec la touche Entrée.
- **Extraits musicaux** : iTunes d'abord, Deezer en secours (en pratique tout vient de Deezer).

## 1.5 — Rangs et saisons
- 9 rangs : Bronze, Argent, Or, Platine, Diamant, Rubis, Émeraude, Maître, Grand Maître (points de rang « PR »).
- Seules les parties classées comptent ; les salons entre amis sont amicaux.
- Chacun joue avec son rang, un rang en dessous ou au-dessus (salons par « fenêtre » de 2 rangs).
- Saisons mensuelles : à chaque nouveau mois, moitié des points gardés + récompense de la saison précédente.

## 1.6 — Boutique et récompenses
- 8 médailles à 4 niveaux (Bronze, Argent, Or, Légendaire), titres sous le pseudo, vitrine de 3 médailles.
- Cadres de rang, route de saison gratuite (30 paliers par mois), boutique (cadres, thèmes, objets, prestige).
- Bouclier de rang (annule une perte par jour), code de sauvegarde pour changer de téléphone.

## 1.7 — Avatars
- 42 avatars en image (classiques gratuits, rares via la route de saison, légendaires en boutique).

## 1.8 — Connexion, accueil premium et 4 modes (22/10/2026)
- Page de connexion, accueil avec carte du joueur, bandeau de saison, barre d'onglets en bas.
- **Modes** : Classé, Non classé, Entre amis (code de 4 caractères), Solo contre 3 bots.

## 1.9 — Écrans des onglets
- Profil (anneau d'XP), Classement (podium animé), Défis (anneaux de progression), Boutique (offres du jour −20 à −40 %, raretés).

## 1.10 — Réactions rapides
- 👏 🔥 😂 😮 🎉 dans le salon, en partie et en fin de partie.

## 1.11 — Extraits plus justes
- Choix de la meilleure version d'un morceau (jamais un karaoké ou un remix si possible).

## 1.12 — Gros pack
- **Catalogue** : 13 catégories, 1 217 morceaux (354 avant) ; mélange français / autres langues.
- **Mes découvertes** : bouton « Écouter sur Deezer » et cœur ❤️ à chaque réponse.
- **Bloquer et signaler** un joueur ; 3 signalements en 24 h = chat suspendu 24 h.
- **Confort** : taille du texte, thème clair, mode daltonien.
- **Hors connexion** et chargement rapide (service worker).
- **Statistiques de fréquentation** : page `/stats.html` (sans cookie).

## 1.13 — Notifications
- Rappel des défis du jour (18 h), nouvelle saison, invitations dans un salon.

## 1.14 — Catalogue vérifié
- Morceaux introuvables en France remplacés, tout le catalogue recherché à nouveau.

## 1.15 — Social (22/10/2026)
- **Hit du jour** : 5 mêmes extraits pour tout le monde, un seul essai, résultat à partager façon Wordle.
- **Amis** : code ami, demandes, présence en ligne, rejoindre un ami dans son salon.
- **Duel 1 contre 1** avec bilan et revanche.
- **Clubs** : équipes de 30, points de club, classement des clubs.

## 1.16
- Connexion à chaque ouverture, bande défilante sur l'accueil, vitrine de médailles animée, mentions légales.

## 1.17 — Médailles en image
- 32 badges (8 médailles × 4 niveaux) qui brillent.

## 1.18 — Saison enrichie
- Récompenses de fin de saison, coffre de club, guerre de clubs, événement du week-end (pièces ×2), tournoi du samedi soir, mode Survie, mode Intro 1 s, pari en duel.

## 1.19 — Halloween
- Catégorie secrète **Frissons**, « Nuit des Frissons » (30/10 midi → 1/11 midi), cadre Citrouille, 2 avatars exclusifs, décor spécial.

## 1.20 (23/10/2026) — Ouverture néon
- Écran d'ouverture avec le vrai logo qui s'allume.

## 2.0 (23/10/2026) — Vrais comptes et anti-triche
- **Comptes e-mail + mot de passe** reliés au profil d'invité (rien n'est perdu), connexion sur un autre téléphone, suppression du compte.
- **Anti-triche serveur** : réponses sous 0,5 s refusées, joueurs « trop rapides » signalés, registre des gains calculé par le serveur, vérification des sauvegardes, liste des suspects (`/api/suspects`).
- **Portefeuille borné** : les pièces gonflées sont ramenées à ce que le serveur a vu.
- **Connexion Google** : code prêt, désactivée tant que `GOOGLE_CLIENT_ID` n'existe pas dans Cloudflare.

## 2.0.1 (23/10/2026)
- Cases e-mail / mot de passe enfin lisibles (texte blanc sur fond blanc), bouton 👁 pour voir le mot de passe.

## 2.1 (23/10/2026) — Amis et affiliation
- **Notification « tes amis jouent »** : un ami hors de l'appli est prévenu quand tu lances une partie (1 fois toutes les 3 h au plus, réglable).
- **Liens affiliés** prêts (Deezer / Apple) : désactivés tant que l'identifiant d'affiliation n'est pas renseigné.
- Les récompenses de fin de saison pour les meilleurs clubs existaient déjà depuis la 1.18.

## 2.2 (23/10/2026) — Nouveau nom : Zikroom
- Hitroom est déjà utilisé par d'autres acteurs de la musique : l'appli devient **Zikroom** (« zik » = musique). Nouveau logo (mot refait dans le même style), textes, notifications, mentions légales, vidéos de pub.
- Les identifiants techniques (sauvegardes, adresse Cloudflare) restent en « hitroom » pour ne rien perdre.

## Pub vidéo (23/10/2026)
- Vidéo de pub verticale dans `assets-src/pub/` : version finale de l'utilisateur + versions faites en code (avec et sans son).

---

## Ce qui reste à faire
- Créer **`GOOGLE_CLIENT_ID`** (activer Google) et **`ADMIN_KEY`** (stats, signalements, suspects) dans Cloudflare.
- **Page Confidentialité (RGPD)**.
- Après le 30/10 midi : contrôler `/api/introuvables` (morceaux Frissons) ; remplacer les morceaux sans extrait en France.
- Vrai portefeuille 100 % serveur (médailles, défis, route encore calculés sur l'appareil).
- Jeton de session pour les routes, « mot de passe oublié ».
- Affiliation : s'inscrire (Apple Services Performance Partners, et une plateforme pour Deezer), puis renseigner `AFFILIATE`.
- Droits des extraits : Deezer/Apple = usage non commercial ; accord écrit à demander avant un lancement public ou du premium.
- Nom de domaine, Play Store (TWA).
