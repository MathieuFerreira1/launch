# LAUNCH — Cahier des charges fonctionnel V1

**Version :** 1.0 — **Date :** 28 octobre 2026  
**Statut :** base de conception à valider avant développement  
**Cible :** application web **mobile-first**, installable en PWA et empaquetable à terme avec Capacitor  
**Développement :** Codex, React / TypeScript / Vite / Supabase, avec outils gratuits et open source autant que possible

> **Décisions actées** : pas de connexion Strava ni Garmin en V1 ; import massif initial puis ajouts de fichiers ou saisies manuelles ; quatre collections au lancement (Running, Trail, Vélo, Natation), accessibles à tous ; les autres sports doivent être conservés pour des récompenses futures ; cartes acquises par exploit, jamais par tirage aléatoire ; grand reveal de collection à l'intégration, petits reveals ensuite.

## 1. Vision et promesse

Launch transforme les exploits sportifs réels en **cartes à collectionner**. À son arrivée, l'utilisateur importe son historique d'activités sportives, reçoit les cartes correspondant à ses performances, puis poursuit sa collection avec ses activités futures. Les cartes les plus difficiles à obtenir possèdent une présentation visuelle plus prestigieuse. À terme, les exploits pourront aussi déverrouiller des cosmétiques pour un avatar 3D, mais cette fonctionnalité n'est pas comprise dans la V1.

**Promesse principale :** « Tes efforts méritent d'être collectionnés. »

**Principes produit**
- Le mérite sportif détermine les cartes ; pas de packs de cartes aléatoires.
- Les quatre sports V1 sont disponibles automatiquement pour chaque compte, sans choix initial.
- L'historique et les nouvelles activités passent par un même moteur de récompenses.
- Une activité non encore prise en charge ne disparaît pas : elle reste disponible pour de nouvelles catégories.
- La collection est privée par défaut. Les classements, les amis et les marques arrivent plus tard.
- Une carte déjà acquise est conservée et n'est pas recréée par réimport, synchronisation ou recalcul.

## 2. Périmètre fonctionnel

| Priorité | Inclus dans la V1 | Exclu / différé |
|---|---|---|
| P0 — indispensable | Authentification, profil, onboarding, import ZIP/multifichiers FIT/GPX/TCX, analyse et aperçu, doublons, import en lots, historique complet, ajout par fichier ou saisie manuelle, correction de sport, 4 collections, moteur de récompenses, reveal initial et ultérieur, confidentialité, suppression de compte et de données | Connexions API Garmin et Strava, amis, classements, achats, abonnement, avatar 3D |
| P1 — après un MVP utilisable | Saisie manuelle d'activité si non terminée dans P0, filtres avancés, nouvelle tentative d'import, export de données, reprise affinée des gros imports, amélioration des animations et de l'accessibilité | Partenariats, événements, trading, applications natives publiées |
| Conception uniquement | Modèle extensible de sports/cartes, source des activités, qualité de preuve, futurs objets/équipements | Génération effective des objets 3D et paiement |

**Choix de réalisation :** la **saisie manuelle** et le **dépôt de nouveaux fichiers** font tous deux partie de la V1. Une saisie faite par l’utilisateur ne doit jamais être qualifiée de « vérifiée ».

## 3. Profils utilisateurs et accès

**Utilisateur non connecté :** peut voir une page de présentation et créer un compte. Aucune activité, carte personnelle ni fichier source ne doit lui être accessible.

**Utilisateur connecté :** peut gérer ses propres imports, activités, révélations et collections ; modifier ses données de profil ; demander la suppression de ses fichiers et de son compte. Il ne peut ni s'attribuer des cartes ni modifier leurs critères depuis son navigateur.

**Administrateur technique (hors interface V1) :** gère le catalogue des sports et cartes au moyen de migrations / fichiers de configuration versionnés, et accède à des journaux techniques expurgés de données sensibles.

## 4. Parcours utilisateur et écrans

### 4.1 Première visite
1. **Bienvenue (`/`)** : concept, exemples de cartes, bouton « Commencer ».
2. **Connexion / inscription (`/auth`)** : e-mail et mot de passe ou méthode d'authentification disponible ; politique de confidentialité et conditions accessibles.
3. **Onboarding (`/onboarding`)** : explication de l'import initial ; aucun choix de sports ; possibilité de passer l'import (compte avec collection vide).
4. **Importer (`/import`)** : glisser-déposer sur ordinateur, sélecteur de fichiers compatible téléphone, ZIP ou sélection multiple ; progression d'extraction et d'analyse.
5. **Vérifier (`/import/:batchId/review`)** : nombre de fichiers, activités valides, doublons, problèmes, sports reconnus/inconnus ; correction éventuelle ; confirmation explicite.
6. **Traitement (`/import/:batchId/progress`)** : progression réelle des lots enregistrés ; erreur récupérable ; indicateur de fin.
7. **Reveal initial (`/reveal/:sessionId`)** : introduction, cartes rares mises en avant, carrousel des nouveautés, résumé et bouton « Voir ma collection ».
8. **Accueil (`/app`)** : dernière récompense, total des cartes, quatre collections et action « Ajouter une activité ».

### 4.2 Utilisation après inscription
- Ajouter un ou plusieurs fichiers depuis l'accueil ou `/activities/import` ; prévisualisation, déduplication, puis reveal **standard** des seules nouvelles cartes.
- Ajouter une activité via formulaire (`/activities/new`) : sport (ou « Autre »), date, distance, durée, dénivelé facultatif, note ; étiquette explicite « déclarée manuellement ».
- Parcourir ses activités (`/activities`), filtrer par sport/date/source, consulter détail/état et corriger un sport ambigu.
- Voir les collections (`/collections`), avec compteurs et emplacements verrouillés ; entrer dans une catégorie (`/collections/:sportSlug`).
- Ouvrir une carte (`/cards/:cardId`) : titre, rareté, illustration, règle à satisfaire, date de déblocage et activité justificative lorsqu'elle existe.
- Gérer le profil et la confidentialité (`/profile`, `/settings`) : pseudo, données, suppression des fichiers et fermeture du compte.

### 4.3 Navigation mobile
Navigation basse : **Accueil · Collections · Activités · Profil**. Bouton d'action visible « + Activité ». Aucun onglet « Amis », « Boutique » ou « Avatar » avant leur développement réel. Sur bureau, navigation adaptée sans changer le parcours mobile.

### 4.4 États d'interface indispensables
Écrans vides ; chargement ; absence de réseau ; session expirée ; ZIP invalide ; activité sans date ; doublons ; sport inconnu ; import partiel ; absence de carte débloquée ; reveal interrompu ; erreur de stockage ; reprise après rechargement. Tous les boutons doivent effectuer une véritable action ou être explicitement désactivés.

## 5. Quatre sports au lancement — tous activés

| Identifiant | Affichage | Exemples de types sources | Principe de classement |
|---|---|---|---|
| `running` | Running | running, road running | Course explicitement identifiée comme course non-trail |
| `trail` | Trail | trail running | Type trail explicite, ou correction manuelle |
| `cycling` | Vélo | cycling, road cycling, mountain bike | Famille vélo ; sous-types d'origine conservés |
| `swimming` | Natation | swimming, pool swim, open water | Famille natation ; sous-types conservés |

Les quatre collections apparaissent chez tous les utilisateurs. **Ne pas inférer automatiquement « Trail » du seul dénivelé** ; une activité sans sport explicite reste `unknown` et peut être reclassée manuellement. Les activités d'autres disciplines sont importées comme `unsupported`, avec le libellé original et toutes les métriques disponibles.

## 6. Formats, import massif et conservation de l'historique

### 6.1 Entrées acceptées
- Plusieurs fichiers `.fit`, `.gpx` et `.tcx` sélectionnés d'un coup ; dossier contenant des fichiers ; archive `.zip` contenant des dossiers et fichiers compatibles.
- Un fichier de parcours seul (GPX sans horodatage) est reconnu, mais **ne doit pas compter comme activité accomplie** sans contrôle et validation additionnels.
- Tout format non géré est répertorié dans les éléments ignorés ; ne pas promettre que toutes les archives exportées par un fournisseur seront prises en charge.
- Archives ZIP imbriquées et autres formats (`.fit.gz`, JSON propres aux plateformes) : compatibilité à ajouter explicitement après tests sur échantillons.

### 6.2 Pipeline
1. Sélection locale des fichiers, contrôle MIME/signature, volume et quotas.
2. Extraction ZIP **locale** dans un Web Worker, en flux/par lots si nécessaire ; pas de décompression complète en mémoire.
3. Détection du format par contenu, parsing avec des parseurs éprouvés et validation du schéma.
4. Extraction des données normalisées : date UTC, sport d'origine, catégorie, distance (mètres), durée (secondes), D+ (mètres), source, identifiants, traces éventuellement disponibles.
5. Contrôles de plausibilité, signalement des valeurs manquantes et calcul des empreintes.
6. Détection des doublons **stricts** et des doublons **probables**, affichés avant validation.
7. Confirmation de l'utilisateur ; dépôt des fichiers originaux dans un bucket privé et transmission par **petits lots** des métadonnées à un point d'entrée sécurisé.
8. Validation/recalcul côté serveur, insertion atomique des activités et attributions ; état d'import enregistré pour reprise.
9. Préparation d'une session de reveal seulement pour les nouvelles cartes.

### 6.3 Exigences techniques et anti-doublons
- **Strict :** même fichier (SHA-256) pour un utilisateur, ou identifiant d'activité source lorsque présent.
- **Probable :** sport + début horodaté proche + durées et distances proches ; demander une décision avant d'écarter des fichiers distincts. Ne jamais fusionner silencieusement deux sorties plausibles.
- L'API de validation et d'attribution est **idempotente** : même lot soumis deux fois = aucun doublon d'activité ni de carte.
- La déduplication fonctionne entre import initial, imports futurs et saisies manuelles, même si ces dernières nécessitent une confirmation humaine.
- Les limites techniques (taille par fichier, décompression totale, nombre de fichiers) sont **configurables et mesurées** lors des tests, pas des promesses arbitraires d'import illimité.
- Les ZIP « bombes », chemins traversants, XML malveillant, extensions trompeuses et fichiers corrompus sont rejetés de façon sûre.

### 6.4 Tous les sports, y compris futurs
Toute activité techniquement exploitable est conservée, même si Launch ne sait pas encore lui attribuer une carte. Pour cela, garder **le sport original, les champs normalisés et, après consentement, le fichier source brut privé**. L'ajout d'un sport doit permettre de retraiter les activités historiques sans demander une nouvelle importation. Prévoir une politique de stockage/quota et un mode dégradé explicite si l'archive brute ne peut pas être conservée : ne jamais prétendre qu'une réanalyse intégrale est garantie sans les données requises.

### 6.5 Saisie manuelle
Champs : sport, date/heure, distance, durée, D+ facultatif, commentaire facultatif. Le statut de preuve est `self_reported`. Les activités manuelles peuvent débloquer des **cartes personnelles** en V1, mais restent marquées comme déclaratives. Les futures fonctionnalités sociales, compétitives et partenaires devront exiger un niveau de preuve approprié. Un écran doit expliquer ce choix.

## 7. Système de cartes et de raretés

### 7.1 Modèle métier
- Une `card_definition` est un modèle global stable (titre, sport, rareté, illustration, conditions, version, appartenance à une collection).
- Une `user_card` indique que l'utilisateur **possède** une carte. Une carte « jalon » est unique par utilisateur (pas de copies). La possession ne dépend pas du nombre de fois où le seuil est atteint.
- Un `achievement_event` trace **pourquoi** la carte a été obtenue, sans le confondre avec l'animation.
- Une `reveal_item` indique une carte acquise et **pas encore présentée**. Le reveal n'est jamais la source de vérité de la possession.
- Les raretés initiales sont `common`, `rare`, `epic`, `legendary` ; elles sont des propriétés du catalogue, pas des probabilités.

### 7.2 Règles d'attribution V1
- Règle primaire : une **activité unique** doit atteindre un seuil de distance (mesurée en mètres). Comparaison inclusive (`distance_m >= threshold_m`).
- Un fichier sans date exploitable, sans preuve de séance, ou avec métriques non plausibles doit rester `needs_review` et **ne pas accorder automatiquement** de cartes.
- Un exploit peut débloquer **plusieurs jalons de difficulté inférieure** dans le même sport. Exemple : une course de 22 km donne 5 km, 10 km et 21,1 km si les trois cartes manquent.
- Une même performance ne débloque pas une carte de plusieurs sports. Le classement corrigé déclenche un recalcul **contrôlé** et un examen des récompenses liées, sans suppression irréversible silencieuse.
- Les distances/temps sont stockés en unités SI ; valeurs d'affichage arrondies, comparaison sur les valeurs non arrondies.
- En V1, ne pas ajouter de règle cumulative, de record personnel ou de dénivelé tant que les critères ne sont pas validés pour chaque format. Le modèle de règles doit toutefois permettre `single_activity`, `cumulative` et `elevation_gain` plus tard.
- La collection d'un sport est « complète » lorsque **toutes les cartes du noyau permanent versionné** sont acquises. Les cartes événementielles futures n'entrent pas rétroactivement dans cette condition. La carte bonus de complétion est attribuée une seule fois.

### 7.3 Catalogue initial — proposition de départ à valider
**Ces seuils sont des paramètres de game design proposés, pas des règles définitivement approuvées.** Ils peuvent être changés par le catalogue de données sans modifier le code du moteur ; faire valider les noms, raretés et distances avant la mise en production.

| Sport | Commune | Rare | Épique | Légendaire | Bonus complétion |
|---|---|---|---|---|---|
| Running | 5 km | 10 km | 21,1 km | 42,195 km | Maître du bitume |
| Trail | 5 km | 15 km | 30 km | 60 km | Maître des sentiers |
| Vélo | 20 km | 50 km | 100 km | 200 km | Maître de la route |
| Natation | 500 m | 1 000 m | 2 000 m | 5 000 m | Maître des eaux |

> Les dénivelés, records, défis multi-activités et catégories spéciales viendront dans une version ultérieure après validation des données disponibles dans les fichiers.

### 7.4 Robustesse et évolutivité
- Les cartes ont des identifiants pérennes (`RUN_SINGLE_05000`, etc.), indépendants de leur titre et de leur image.
- Les règles sont conservées avec une `ruleset_version` et une date de publication.
- Lors de l'ajout d'un sport, un **job de recalcul historique** cherche les activités pertinentes déjà conservées, attribue les cartes manquantes et crée un **reveal de nouvelle collection**.
- Ajouter une carte à une collection ne doit pas retirer une ancienne carte de complétion ; fixer une politique explicite des saisons / sets avant l'extension.

## 8. Révélations de cartes

### 8.1 Reveal initial
Sur un premier import terminé, une session `initial_collection` regroupe **uniquement les cartes nouvellement obtenues**. Animation d'introduction, nombre total de cartes, sélection des plus rares, possibilité de découvrir les cartes par groupes puis écran de synthèse. Prévoir « Tout afficher » pour 10 à 100 cartes, sans imposer 100 animations individuelles.

### 8.2 Reveal ultérieur
À chaque ajout d'activité validé, une session `new_achievements` regroupe les nouvelles cartes. À la prochaine ouverture, une indication discrète invite à les découvrir ; la révélation est visible, mais **passable**. Aucune animation si aucune carte nouvelle. Lors de l'ajout futur d'un sport, session `new_sport_collection`.

### 8.3 Comportement fiable
- Session créée **sur le serveur** après la transaction d'attribution.
- États : `pending` → `viewing` → `seen` ; relancer `pending/viewing` après fermeture de l'application.
- Possibilité de revoir la carte depuis la collection, sans recréer de récompense.
- Durées courtes, prise en charge `prefers-reduced-motion`, performance sur téléphone moyen de gamme.
- Les cartes communes, rares, épiques et légendaires ont des transitions visuelles distinctes ; pas besoin de 3D en V1.

## 9. Données, confidentialité et conformité

- Toutes les activités et tous les fichiers sont **privés par défaut** ; pas de profils publics ni de données de GPS partagées en V1.
- Les fichiers originaux sont stockés dans un bucket privé, rattachés à l'utilisateur et protégés par des politiques Storage/RLS appropriées ; aucun lien permanent public.
- Obtenir un consentement clair avant d'archiver les sources, exposer la consommation de stockage et permettre leur suppression.
- Minimiser les données : ne pas enregistrer systématiquement la trace GPS détaillée en base relationnelle ; extraire uniquement les métriques nécessaires, stocker le fichier source privé quand autorisé.
- Informations de confidentialité, export des données, suppression complète du compte (base + storage) et politique de rétention documentés avant publication.
- Certaines données (GPS, habitudes sportives, historique) sont sensibles ; envisager une analyse juridique RGPD et vérifier les droits de réutilisation propres aux exports de fournisseurs.
- RLS sur toutes les tables exposées, privilèges SQL minimaux, secrets seulement côté serveur. Les mutations d'attributions ne sont jamais autorisées depuis le client.
- Journaliser les erreurs sans révéler les coordonnées, parcours détaillés ou fichiers bruts.

## 10. Exigences non fonctionnelles

| Domaine | Objectif V1 / critère |
|---|---|
| Ergonomie | Mobile-first dès 360–390 px, zones tactiles ≥ 44 px, encoches et safe areas |
| Accessibilité | Navigation clavier, contrastes lisibles, alternatives aux animations, états annoncés |
| Performance | Pas de blocage du thread principal lors d'un import ; parsing en Web Workers |
| Résilience | Rechargement et perte réseau ne donnent pas de cartes en double ; état d'import récupérable |
| Fiabilité | Attribution transactionnelle et contraintes uniques dans PostgreSQL |
| Observabilité | Journal d'état des imports et erreurs exploitables sans données sensibles |
| Qualité | TypeScript strict, ESLint, tests de règles et d'import, tests RLS, tests E2E mobile |
| Coût | Compatible quotas gratuits au démarrage ; stockage, fonctions et bande passante surveillés |

## 11. Critères de recette / acceptation globale

1. Un nouvel utilisateur voit les quatre collections avant même son premier import.
2. Un ZIP de **200 fichiers de test** hétérogènes (FIT/GPX/TCX, sports connus/inconnus) est analysé sans figer l'interface.
3. L'aperçu montre activité valide, date/sport manquants, fichier non compatible, doublon strict et doublon probable.
4. Confirmer le lot n'attribue aucune carte à un fichier non validé.
5. Une activité de Running de 22 km débloque les jalons 5, 10 et 21,1 km, **une fois chacun**.
6. Une deuxième importation de la même activité, même dans un autre lot, n'ajoute aucune carte ni activité en double.
7. Les activités de Ski (non pris en charge) restent dans l'historique avec leurs fichiers ; un nouveau catalogue Ski peut les retrouver en test, sans nouvel import.
8. Une activité Running ne peut pas devenir Trail sur la simple base du dénivelé ; un sport ambigu peut être corrigé.
9. Un reveal interrompu reste consultable ; une carte acquise apparaît toujours dans la collection.
10. Un utilisateur A ne peut ni lire les fichiers de B ni écrire des cartes dans la collection de B.
11. Une suppression de compte nettoie base et stockage conformément à la procédure documentée.
12. Les écrans d'import, de collection et de reveal sont utilisables sur un appareil de largeur 375 px.

## 12. Hors périmètre et risques

**Hors V1** : Garmin Connect, Strava, enregistrement GPS natif en arrière-plan, défis communautaires, social, boutique, paiement, avatar 3D, cartes sponsorisées. L'architecture conserve la possibilité de connecteurs et de futurs cosmétiques sans les implémenter prématurément.

**Risques prioritaires :** qualité inégale des exports, ZIP volumineux, ambiguïté Running/Trail, faux fichiers, quotas gratuits de stockage, reclassification après attribution et déblocage de cartes anciennes lors de nouvelles règles. Chacun possède un test de recette ou une politique de traitement dans le dossier technique.

## 13. Décisions encore à confirmer (n'empêchent pas le squelette technique)

1. Catalogue exact de 4 × 4 cartes et noms visuels : valeurs proposées en §7.3.
2. Autoriser les activités saisies manuellement à débloquer toutes les cartes personnelles, ou seulement certaines : proposition V1 = toutes, marquées `self_reported`.
3. Niveau de conservation et quotas des sources brutes par utilisateur selon les coûts observés ; la garantie de re-traitement dépend de leur conservation.
4. Esthétique des illustrations, gamme de couleurs, logo, nom commercial et identité de marque.
5. Méthode d'authentification initiale (e-mail / mot de passe recommandé pour MVP ; fournisseurs OAuth plus tard).

## 14. Références techniques officielles (consultées le 28/10/2026)

- Supabase, Row Level Security : https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase, uploads Storage : https://supabase.com/docs/guides/storage/uploads/standard-uploads
- Garmin, FIT SDK : https://developer.garmin.com/fit/get-the-sdk/
- Capacitor : https://capacitorjs.com/docs
- React Three Fiber (évolution long terme) : https://r3f.docs.pmnd.rs/

**Note** : ce document définit le produit ; le schéma de données, les cas d'usage détaillés et les tâches Codex se trouvent dans les autres fichiers de ce dossier.
