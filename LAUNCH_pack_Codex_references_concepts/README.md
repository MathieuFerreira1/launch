# LAUNCH — Pack complet de conception pour Codex

**Statut :** conception V1, maquettes et vision produit future. **Aucun code applicatif fourni.**  
**Version du pack :** 1.2 — 28 octobre 2026 (concepts visuels prioritaires ; planches supprimées).  
**Langue de l'application :** français. **Plateforme initiale :** web mobile-first, puis Capacitor iOS/Android.

## À lire dans cet ordre

1. `AGENTS.md` — règles permanentes, priorités documentaires, séparation V1 / futur.
2. `docs/01_cahier_des_charges.md` — comportements métier et périmètre validé.
3. `docs/02_architecture.md` et `docs/03_modele_donnees.md` — architecture, imports, sécurité et modèles.
4. `docs/07_design_system.md` — style approuvé, composants, tokens, règles d'accessibilité.
5. `docs/08_navigation_et_ecrans.md` — parcours des 23 écrans, routes, actions et statuts MVP/futur.
6. **`design/REFERENCES_VISUELLES_PRIORITAIRES.md` et `design/concepts/`** — **source principale pour dessiner les pages**, dont 3 captures conceptuelles individuelles en haute résolution.
7. `design/prototype/launch_mobile_prototype.html` — **source d'interactions uniquement**, NE PAS copier sa charte ni ses layouts. Les anciennes planches de synthèse (rendu non retenu) ne sont pas incluses.
8. `docs/04_backlog.md` et `docs/09_plan_execution_codex.md` — tickets et protocole de livraison.
9. `docs/10_vision_avatar_et_economie.md` — vision hors V1, utile pour éviter les impasses.
10. `prompts/01_initialisation.md` — **premier prompt** à donner à Codex ; puis les suivants un à un.

## Décisions produit verrouillées

- Pas de sélection de sports à l'inscription ; collections de **Running, Trail, Vélo, Natation** visibles pour tous.
- **Premier import massif** ZIP/FIT/GPX/TCX + imports ultérieurs ; saisie déclarative d'activité également prévue.
- Conserver les données des **sports non encore supportés** et les sources nécessaires (selon consentement, quotas et politique de stockage), pour reprocessing futur.
- Attribution des cartes selon **règles déterministes** : pas de booster aléatoire.
- **Reveal initial groupé**, puis reveals de nouvelles cartes, sans multiplier les récompenses lors des réimports.
- **Pas d'intégration Strava, Garmin ou d'autres comptes sportifs en V1.** Garmin pourra être étudié plus tard.
- **Thème clair**, ivoire/blanc, noir doux, **orange corail**, gamification mesurée (cartes, XP futur, récompenses, rareté, avatar futur).
- **V1 : 4 onglets** `Accueil · Collections · Activités · Profil` avec CTA `+ Activité`. La maquette de vision peut montrer 5 onglets avec Avatar.
- Avatar 3D, vestiaire, vélo, objets, amis, défis, marque et boutique : **vision future** ; ne pas en déduire une obligation d'implémenter ces fonctionnalités dans le MVP.

## Consigne de design à donner à Codex

> Pour l'interface, base-toi **sur les concepts dans `design/concepts/`**, en particulier les vues individuelles `design/concepts/ecrans_individuels/`, ainsi que sur `design/REFERENCES_VISUELLES_PRIORITAIRES.md`. **N'utilise pas le design du prototype HTML comme référence** ; il est seulement utile pour les parcours. Ne reproduis pas les anciennes planches. Réalise les captures de chaque écran et compare-les aux concepts. Les personnages, objets et cartes visibles sont des idées visuelles, pas des assets prêts à l'emploi.

## Démarrer

1. Créer un dépôt GitHub privé `launch` ; **copier le contenu de ce dossier à la racine** (pas le dossier conteneur lui-même).
2. Ouvrir le dépôt dans Codex (local ou Cloud) ; demander de **lire `AGENTS.md` et le dossier `docs/`**.
3. Envoyer exactement `prompts/01_initialisation.md`.
4. Travailler par tickets (`LAU-001`, puis `LAU-002`, etc.), vérifier tests/build et faire relire les changements.
5. Configurer un projet Supabase **de développement** avant de permettre des migrations distantes ; garder les secrets en variables d'environnement hors Git.

## Qu'est-ce qui fait autorité ?

1. `AGENTS.md` et décisions validées `docs/01_cahier_des_charges.md` pour le comportement.
2. `docs/07_design_system.md` et `docs/08_navigation_et_ecrans.md` pour le visuel et les routes.
3. Autres `docs/*.md` pour l'architecture.
4. `design/REFERENCES_VISUELLES_PRIORITAIRES.md` + `design/concepts/` pour la direction **visuelle prioritaire** de chaque écran.
5. `design/prototype/*.html` **seulement pour le parcours fonctionnel**. **Aucune planche de synthèse dans ce pack.**

**Ne pas choisir le style du prototype HTML plutôt que les concepts : les concepts ont priorité visuelle.**

**Ne pas transposer le HTML de maquette en code de production tel quel.** Il n'a ni authentification, ni vraie base de données, ni traitement des fichiers. Les images générées sont conceptuelles, pas des exports de composants ni un catalogue d'assets licenciés.
