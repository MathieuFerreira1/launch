# LAUNCH V1 — Backlog priorisé prêt pour Codex

**Gestion du travail :** tickets verticaux, de petite taille ; un ticket ne passe en « terminé » qu'avec ses tests, son état mobile et sa documentation. Chaque sprint est une tranche de livraison, pas une promesse de durée.

## Priorisation

- **P0** : nécessaire à une première version réelle et sécurisée.
- **P1** : première amélioration après la démonstration P0, sauf si on décide de livrer la saisie manuelle en V1 stricte.
- **P2** : futur, sans implémentation en V1.

## Sprint A — Fondations et design system

### LAU-001 [P0] Initialiser le dépôt
**But :** React / Vite / TypeScript strict / Tailwind / shadcn/ui / React Router / TanStack Query, Vitest, Playwright, ESLint, Prettier.
**Acceptation :** installation et build réussis ; scripts `dev`, `typecheck`, `lint`, `test`, `build` ; README clair ; aucune variable secrète versionnée.

### LAU-002 [P0] Shell mobile-first et routes
**But :** navigation 4 onglets V1 Accueil/Collections/Activités/Profil, CTA + Activité, routes publiques/auth et privées, états vides, mobile 360–430 px.
**Acceptation :** navigation au tactile, clavier, aucun scroll horizontal, gestion session non connectée.

### LAU-003 [P0] Design system et cartes de démonstration
**But :** reproduire les principes de `docs/07_design_system.md` (light mode ivoire/orange), tokens, boutons, cartes, modales, messages et raretés sans glow.
**Acceptation :** écrans V1 cohérents en light mode, revus à 360/390 px ; cartes démontrées avec fixtures ; aucune fonction factice cliquable.

## Sprint B — Auth et données

### LAU-004 [P0] Authentification Supabase
**But :** inscription, connexion, déconnexion, profil, protection de routes.
**Acceptation :** deux comptes indépendants ; états erreur et session expirée ; no-op sur identités invalides.

### LAU-005 [P0] Migrations catalogue et modèle
**But :** schéma `docs/03_modele_donnees.md` ; seeds quatre sports + cartes configurables.
**Acceptation :** migrations rejouables localement ; indexes et contraintes uniques ; 4 collections automatiquement visibles.

### LAU-006 [P0] RLS, Storage privé et tests d'accès
**But :** policies et grants restrictifs sur tables et Storage.
**Acceptation :** A ne voit pas B ; impossible d'insérer directement une carte ; bucket non public ; tests de refus automatisés.

## Sprint C — Import massif

### LAU-007 [P0] Sélection ZIP/multifichiers et Worker
**But :** sélection multiple, drag-and-drop, lecture ZIP progressive, inventaire des fichiers.
**Acceptation :** ZIP de 200 fichiers fixtures analysé sans figer l'UI ; fichiers non compatibles listés ; limites et annulation.

### LAU-008 [P0] Parseurs FIT / GPX / TCX
**But :** extraire sport original, date, distance, durée, D+ si disponible, métadonnées de provenance.
**Acceptation :** fixtures avec données manquantes, sans heure, natation, Trail explicite ; pas de crash ; unités SI vérifiées.

### LAU-009 [P0] Normalisation, classification et revue
**But :** Running/Trail/Vélo/Natation/unknown/unsupported et correction humaine.
**Acceptation :** aucun trail inféré par D+ seul ; aucune activité d'un sport non pris en charge n'est perdue ; écran de revue utilisable mobile.

### LAU-010 [P0] Détection de doublons
**But :** SHA-256, IDs de sources fiables, score de doublon probable + confirmation.
**Acceptation :** doublon strict exclu ; doublon probable affiché, jamais fusionné silencieusement ; tests inter-lots.

### LAU-011 [P0] Upload privé et ingestion atomique par lots
**But :** commit sécurisé, progress states, idempotence, reprise partielle, chemins Storage privés.
**Acceptation :** un réseau interrompu ne double pas les activités ; état récupérable après recharge ; journal des erreurs anonymisé.

### LAU-012 [P0] Historique et détail d'une activité
**But :** liste, filtres, sport/source/validité, état « unsupported » et contrôle des fichiers.
**Acceptation :** une activité non gérée apparaît dans l'historique ; sport ambigu corrigible ; filtre et pagination.

### LAU-020 [P0] Saisie manuelle d’activité
**But :** formulaire sport/date/distance/durée/D+ avec statut `self_reported` et déduplication assistée.
**Acceptation :** saisie étiquetée, cartes personnelles selon configuration, pas de fausse certification.

## Sprint D — Moteur de cartes et collections

### LAU-013 [P0] Moteur de règles pur et versionné
**But :** `single_activity_distance` pour quatre sports ; cartes uniques et seuils configurables.
**Acceptation :** Running 22 km donne 3 cartes proposées ; Running ne débloque pas Trail ; seuil inclusif ; tests des limites.

### LAU-014 [P0] Attribution transactionnelle et journal
**But :** écriture côté serveur seulement, `user_cards`, `achievement_events`.
**Acceptation :** aucune nouvelle carte lors d'un même import rejoué ; pas de carte si activité `needs_review` ; reclassification traçable.

### LAU-015 [P0] Collections, détail de carte et bonus
**But :** collection visible, cartes possédées/à découvrir, détail, complétion versionnée.
**Acceptation :** compte exact, états verrouillés, bonus une fois quand toutes les cartes du noyau sont débloquées.

## Sprint E — Reveals et stabilisation

### LAU-016 [P0] Reveal initial de collection
**But :** écran spécial après premier import, effet de découverte groupé, résumé, bouton tout afficher.
**Acceptation :** aucune animation interminable ; skip possible ; 20+ nouvelles cartes affichées efficacement ; état persisté.

### LAU-017 [P0] Reveal des récompenses ultérieures
**But :** session ultérieure après activité nouvelle et reprocessing futur.
**Acceptation :** fermeture de l'app = reveal repris ; ancienne carte non révélée à nouveau ; zéro carte = zéro écran.

### LAU-018 [P0] Recette E2E et optimisation mobile
**But :** tests 375 px, données volumineuses, a11y, loading, erreur, contrôle de la consommation des services.
**Acceptation :** 12 critères globaux `docs/01_cahier_des_charges.md` vérifiés ; tests `typecheck/lint/test/build` verts ; rapport de tests.

### LAU-019 [P0] Suppression de données, confidentialité et stockage
**But :** interface de gestion des fichiers, suppression de compte et jobs de purge.
**Acceptation :** pas de résidu Storage exploitable après suppression ; refus d'accès à l'ancien compte ; conditions de conservation documentées.

## Sprint F — Première amélioration

### LAU-021 [P1] Import volumineux amélioré
**But :** reprise de nombreux fichiers, limites paramétrables, diagnostic des archives communes.
**Acceptation :** reprise après erreur réseau, pas de perte silencieuse, métriques par format.

### LAU-022 [P1] Export utilisateur
**But :** téléchargement des données normalisées et liste des fichiers conservés.
**Acceptation :** export de ses propres données uniquement, données compréhensibles et privées.

## Futur — **Ne pas coder pour l'instant**

- LAU-101 [P2] API Garmin Connect, après approbation et validation du contrat.
- LAU-102 [P2] Ajout d'un cinquième sport + reprocessing complet.
- LAU-103 [P2] Avatar 3D, fichiers GLB, inventaire cosmétique.
- LAU-104 [P2] Amis, collections publiques et vérification des permissions.
- LAU-105 [P2] Abonnements / paiements / partenariats.

## Définition de « terminé » (DoD)

1. Critères d'acceptation du ticket reproduits dans le PR.
2. Tests unitaires / RLS / E2E ajoutés selon périmètre.
3. Typecheck, lint et build passés avec résultat documenté.
4. Erreurs, loading, états vides gérés ; écran mobile revu.
5. Aucun secret ni trace GPS sensible dans les logs ou commits.
6. Aucune dépendance commerciale non validée ajoutée.
7. Les changements de schéma sont migrés et documentés.

## Références de maquettes et vision future

Pour la direction visuelle, suivre **en priorité** `design/REFERENCES_VISUELLES_PRIORITAIRES.md` et les images `design/concepts/`. Le prototype `design/prototype/launch_mobile_prototype.html` ne sert qu'à la navigation et aux interactions. Le prototype contient 23 écrans dont Avatar/Vestiaire/Vélo/Goodies/Défis/Amis sont **hors MVP**.
