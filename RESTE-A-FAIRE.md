# Zikroom — ce qui reste à faire (23/10/2026)

Lien du jeu : https://zikroom.jcolomb10.workers.dev · Version en ligne : 2.4
Légende : ☐ à faire · ✅ fait

## 1. À faire par toi (Cloudflare, comptes, vérifications)
☐ **Marque** : vérifier « Zikroom » sur l'INPI (data.inpi.fr), l'OMPI (branddb.wipo.int) et l'EUIPO, surtout les classes 9, 41 et 42. Chercher aussi « zik* ».
☐ **Domaines** : réserver zikroom.app (et si possible .fr et .com), puis le brancher sur le Worker `zikroom` (Domains & Routes → Add → Custom domain).
☐ **Reprise de ta progression** : ouvrir l'ancien lien (hitroom.jcolomb10.workers.dev) dans Chrome, accepter « Reprendre ta progression », puis recréer ton compte e-mail (Paramètres → Mon compte).
☐ **Essai à deux téléphones avec ta femme** : code ami, lien d'ami (Snap), salon, duel, notification (fenêtre « Reçois les défis de tes amis »).
☐ **Google** : créer un identifiant OAuth (console.cloud.google.com, type « Application Web », origine https://zikroom.jcolomb10.workers.dev), puis le mettre dans Cloudflare → Worker zikroom → Settings → Runtime variables and secrets → `GOOGLE_CLIENT_ID`.
✅ `ADMIN_KEY` créée (statistiques : /stats.html).
☐ **Frissons / Halloween** : après le vendredi 30/10 à midi, ouvrir /api/introuvables et me donner la liste des morceaux sans extrait (je les remplace). La « Nuit des Frissons » dure jusqu'au dimanche 1er/11 à midi.
☐ **Catalogue du nouveau serveur** : il se remplit tout seul (≈ 1 h 30). Vérifier /api/status (« checked » doit approcher 1 240).
☐ **Mentions légales** : les faire relire ; renseigner une adresse de contact (`LEGAL_CONTACT` dans index.html) si tu veux la publier.
☐ **Droits des extraits** : Deezer = usage non commercial, Apple = aperçus pour promouvoir le catalogue. Avant un lancement public, du premium ou de la pub payante : demander l'accord écrit de Deezer ou passer à des extraits sous licence.
☐ **Ancien Worker `hitroom`** : le laisser pour l'instant (il redirige les anciens liens vers Zikroom). Ne pas le supprimer tant que des joueurs utilisent l'ancienne adresse.
☐ **Vercel** : débrancher ou supprimer l'ancien projet relié au dépôt (il ne gère pas les salons en direct).
☐ **Vidéo pub** : ta version « finale » porte l'ancien logo Hitroom ; la refaire avec le nouveau logo (je peux écrire le prompt).
☐ **Affiliation** (si tu veux gagner de l'argent) : s'inscrire à Apple Services Performance Partners et à une plateforme pour Deezer, puis me donner les identifiants (champ `AFFILIATE`).

## 2. À faire par moi (code)
☐ **Page Confidentialité (RGPD)** + suppression de compte détaillée.
☐ **Connexion Google** : activer et tester quand `GOOGLE_CLIENT_ID` existe.
☐ **Mot de passe oublié** (code par e-mail : demande un service d'envoi d'e-mails, ex. Resend, clé à créer par toi).
☐ **Jeton de session** pour les routes de l'API (aujourd'hui l'identifiant du joueur sert de secret).
☐ **Portefeuille 100 % serveur** : médailles, défis et route de saison encore calculés sur le téléphone (la triche est seulement bornée).
☐ **Bot Discord blind test** (extrait en fichier audio, bouton « Répondre », classement) : à lancer quand tu as créé l'application sur discord.com/developers.
☐ Catégories **classées par rotation** : prête mais désactivée (je l'active seulement sur ta demande).
☐ Dans les catégories surtout anglaises, passer à moitié-moitié français/anglais si tu le demandes (`langMins`).
☐ Écran du **pari de duel** à tester dans le navigateur ; **tournoi du samedi soir** simplifié (pas de tableau ni de spectateurs).
☐ Test `e2e-modes` (solo) : plante sur la lecture audio simulée (ancien problème, pas lié au jeu).

## 3. Idées pour plus tard
- Play Store (TWA via PWABuilder, 25 $, vérification d'identité, test fermé de 14 jours avec 12 testeurs) : supprimerait aussi l'avertissement Play Protect.
- Récompenses spéciales de fin de saison pour d'autres classements, événements saisonniers (Noël…).
- Classement et récompenses des mini playlists Facebook / TikTok (outil `tools/miniplaylist.mjs`).
- Cloudflare Web Analytics (jeton à créer par toi) en plus de /stats.html.

## 4. Fait aujourd'hui
✅ Comptes e-mail · anti-triche serveur · portefeuille borné · connexion Google (code prêt)
✅ Notification « tes amis jouent » · défis presque instantanés · invitation à activer les notifications
✅ Renommage **Hitroom → Zikroom** (logo, textes, notifications) · nouveau Worker + redirection de l'ancien + reprise de la progression
✅ Vidéos de pub (avec/sans son), logo PNG, photo de profil Discord
✅ Outil mini playlist Facebook/TikTok (`tools/miniplaylist.mjs`)
✅ Liens d'administration dans `LIENS.md`
