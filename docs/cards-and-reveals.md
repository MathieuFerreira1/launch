# Mission 04 — Cartes, collections et reveals

## Livraison et catalogue

Branche `feat/cards-collections-reveals`, créée depuis `main` au commit `9a4a50e`, après vérification de la fusion de la Mission 03. Backend exclusivement **Launch dev**, `kephzbvcbmjzqqvqgtav`.

Le catalogue contient 24 jalons et 4 cartes spéciales de complétion. Les seuils demandés dans la Mission 04 prévalent sur les propositions historiques du pack de conception.

| Sport    | Commune | Rares             | Épiques            | Légendaire |
| -------- | ------- | ----------------- | ------------------ | ---------- |
| Running  | 5 km    | 10 km, 15 km      | 21,1 km, 30 km     | 42,195 km  |
| Trail    | 5 km    | 10 km, 500 m D+   | 20 km, 1 500 m D+  | 3 000 m D+ |
| Vélo     | 20 km   | 50 km, 1 000 m D+ | 100 km, 2 000 m D+ | 200 km     |
| Natation | 500 m   | 1 km, 1,5 km      | 2 km, 3 km         | 5 km       |

Les cartes de complétion sont **Maître du bitume**, **Maître des sentiers**, **Maître de la route**, **Maître des eaux**. Leur type est `completion`, leur rareté initiale `legendary`, et elles ont une illustration de trophée distincte. Rareté, noms, illustration, critères et appartenance au noyau de collection sont administrables en base.

`card_definitions`, `card_unlock_rules`, `collection_sets` et `collection_set_cards` forment le catalogue. Les seuils sont en SI et comparés de manière inclusive, sans arrondir les mesures pour attribuer une carte. Les règles d’une carte se combinent par AND sur **la même activité**. Aucune somme des sorties. Les primitives actuelles sont distance, D+, durée et vitesses ; seules distance et D+ sont utilisées par les seeds V1.

Une édition de catalogue incrémente automatiquement `reward_catalogue_state.revision`. Publier les changements par migration administrative versionnée et renseigner `ruleset_version`. Le prochain passage relit tout l’historique, sans nouvel import. L’ajout d’un sport peut mapper explicitement ses `source_sport_labels` aux activités `unsupported` conservées. Un test active Ski à partir des données originales, sans modifier le parseur.

Ne pas supprimer les définitions publiées. Le noyau permanent d’une collection doit rester stable ; utiliser une nouvelle version/set pour le faire évoluer. Une modification des règles ne retire pas une carte déjà acquise. Les versions et conditions d’origine sont conservées avec l’attribution.

## Moteur serveur et données

- `process_reward_batch` : RPC authentifiée, identité tirée de `auth.uid()`, aucun utilisateur cible ni carte à attribuer fournis par React. Une transaction traite au plus 250 activités (200 depuis l’UI).
- `reward_processing_state` : révision des activités et dernière révision traitée. Les triggers d’ingestion/correction/suppression marquent le travail à effectuer, sans calcul massif dans le trigger.
- `reward_jobs` : curseur UUID, limite supérieure, progression et snapshot immuable du catalogue. Un seul job actif par utilisateur. Le traitement suit l’ordre UUID stable, et la première activité admissible dans cet ordre justifie une carte.
- `user_cards` : source de vérité, unicité `(user_id, card_id)`, date initiale, provenance, règle et métriques justificatives, activité associée. Une activité peut accorder plusieurs jalons.
- `achievement_events` : audit initial, unique par carte acquise. Il reste inchangé lors d’une réconciliation de preuve.
- `reward_proof_history` : conserve les anciennes et nouvelles justifications lorsqu’une autre activité valide remplace une source reclassée/supprimée. Les règles d’origine restent utilisées pour ce souvenir ; ni nouvelle carte ni nouveau reveal.
- `reveal_sessions` / `reveal_items` : présentation des possessions existantes. Une carte ne peut être ajoutée qu’une fois aux reveals ; l’ordre dans la session est unique et vérifié à la fin de transaction.

Un verrou transactionnel par compte et les contraintes d’unicité empêchent les doubles attributions entre traitements concurrents. Curseur, possessions et audit sont écrits dans la même transaction. Une réponse perdue peut être rejouée sans créer de doublon. Si une activité ou le catalogue change pendant un job, un nouveau passage est demandé avant de considérer le calcul à jour.

La validation serveur exige une séance datée dans le passé, un statut `valid`, aucune alerte restante, distance positive, durée positive et cohérence des vitesses selon les contrôles techniques existants. Une métrique de règle absente ne qualifie jamais la carte. Un D+ absent permet les cartes de distance, mais aucune carte de D+. Le sport `unknown` reste exclu.

Les fichiers modifiables et les déclarations manuelles contribuent uniquement aux **collections personnelles**. Provenance conservée ; `scope='personal'` et `competitive_eligible=false` sont imposés en base. Aucun fournisseur n’est présenté comme certificateur.

Une reclassification ne supprime pas un souvenir. Si une autre activité peut le justifier, le job la référence et journalise le remplacement. Sinon, la carte reste possédée avec `proof_status='needs_review'`, visible dans son détail. Une nouvelle carte de complétion exige toutes les justifications disponibles. Il n’existe pas de moteur compétitif, commercial, XP ou de classement.

## Reveal et interface

Les comptes connectés utilisent `/app`, `/collections`, `/collections/:sportSlug`, `/cards/:cardId` et `/reveal/:sessionId` avec leurs données privées. La démo conserve ses fixtures et n’appelle pas ce moteur. Le profil et les bandeaux ne présentent plus les données personnelles comme fictives.

Le calcul commence/reprend à l’ouverture et après import, saisie manuelle ou correction. Le frontend pilote des RPC bornées ; aucune écriture directe dans les possessions ou critères. Collections et sessions sont lues après le calcul, pour éviter une première vue vide ou une session encore en cours de regroupement. Les erreurs permettent de reprendre ; une fermeture ne détruit aucun job ni aucune carte.

Le premier reveal non vide est unique. Les nouveautés peuvent rejoindre cette session tant qu’elle est `pending` ; dès le début de la découverte (`viewing`), elle est figée et les cartes suivantes vont dans un nouvel événement. Un historique sans récompense ne crée aucun reveal.

Les cartes sont ordonnées par rareté puis par identifiant/ordre du catalogue. L’introduction indique le nombre, présente les plus rares en éventail, puis propose une découverte carte par carte ou « Passer les animations ». « Continuer » sauvegarde le curseur monotone. Fermer avant cette confirmation peut représenter la seule carte courante ; les cartes précédentes confirmées ne sont pas rejouées. Une session `seen` affiche seulement son récapitulatif, y compris via un lien direct.

Le reveal masque la navigation principale pendant la découverte ; les quatre onglets restent présents ailleurs. Flip, échelle et particules varient selon la rareté. `prefers-reduced-motion` désactive les effets ; aucune animation obligatoire. Le trophée SVG et les autres illustrations sont des assets originaux statiques dans `public/art`, sans requête IA à l’attribution, achat d’asset ou génération payante.

## Migrations et sécurité

Après validation PostgreSQL locale et validation distante dans des transactions annulées, deux migrations ont été appliquées sur **launch-dev uniquement** :

1. `20261030000100_cards_collections_rewards.sql` : catalogue V1, jobs, possessions, audit initial, reveals, fonctions, RLS et droits SQL.
2. `20261030000200_reward_proof_reconciliation.sql` : historique de justification et réconciliation contrôlée, sans modifier la possession ni l’audit initial. Invalidation technique des états de traitement pour le prochain passage.

Aucune suppression de données existantes. RLS sur toutes les nouvelles tables. Le catalogue est lisible après connexion, non modifiable côté client ; états, jobs, cartes, événements et preuves sont visibles uniquement par propriétaire. Les écritures sont limitées aux fonctions serveur avec `search_path` fixe et privilèges explicites. `advance_reveal` ne permet que la progression de sa propre session, jamais une attribution.

## Validation exécutée

- TypeScript strict, ESLint et build de production réussis. **43 tests Vitest/PostgreSQL et 55 tests Playwright** réussis, sur 360/375/390/430 px et desktop. Le déploiement Cloudflare est également vérifié en `--dry-run`.
- Tests SQL : seuils inclusifs et distance juste sous le marathon, plusieurs paliers, métriques absentes/incohérentes/futures, sports inconnus/futurs, répétition, complétion, contrôle des privilèges, A/B/anon, reprise monotone, absence de faux reveals, justification alternative sans réattribution.
- Historique synthétique de **10 000 activités en 40 lots de 250**, sans récompense injustifiée : **4 789 ms** pour le moteur lors du dernier passage en PostgreSQL embarqué. La suite complète correspondante s’exécute en environ 8–10 s dans cet environnement, création des fixtures et autres assertions comprises ; ce n’est pas une mesure iPhone.
- Intégration HTTP réelle : deux comptes synthétiques, deux appels simultanés partageant le même curseur, recalculs concurrents sans doublon, 21 puis 28 cartes, reveal initial et quotidien, écritures arbitraires et accès croisés refusés. Réconciliation de six justifications vers une activité alternative, sans nouveau reveal. Comptes nettoyés.
- Navigateur réel contre launch-dev : ZIP/Worker, réservation/upload privé, commit avec réponse perdue, reprise, historique, réimport du même fichier, TUS 7 Mio, carte réellement acquise, reveal repris après rechargement, skip persistant et absence de répétition. Compte et sources synthétiques nettoyés.
- Régression import : ordre canonique des doublons locaux stabilisé par date, format et clé, indépendamment de l’ordre IndexedDB après rechargement. Les fichiers explicitement ignorés ne deviennent pas les cibles des autres activités.

Commandes :

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run check:cloudflare
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
python3 scripts/supabase-dev.py test --mission rewards
python3 scripts/supabase-dev.py test --mission reward_proofs
python3 scripts/test-live-rewards.py
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium python3 scripts/test-live-import-browser.py
```

Les scripts live gardent la clé administrative dans le processus serveur, uniquement pour créer/supprimer leurs comptes synthétiques sans email envoyé. Les opérations testées utilisent des JWT utilisateur ordinaires. Aucun token ni fichier privé journalisé ; aucune fixture personnelle.

Captures avec données synthétiques à 390 px : [accueil](screenshots/mission04-home.png), [collection Running](screenshots/mission04-running.png), [reveal initial](screenshots/mission04-reveal.png).

## Limites et actions manuelles

Le traitement avance lorsque l’application est ouverte ; aucun cron hébergé permanent n’est déployé. Un import poursuivi pendant un calcul peut nécessiter un autre passage. Les requêtes sont bornées et la progression persiste.

Les contrôles de plausibilité ne certifient pas la réalité d’un effort. Les fichiers restent modifiables et les déclarations personnelles possibles ; les futures récompenses compétitives devront avoir un moteur de preuve séparé. Les données insuffisantes ne sont pas inventées.

Les listes de reveals en attente sont chargées par groupes de 20 ; après consultation, les suivantes deviennent accessibles. Le catalogue V1 contient 28 cartes ; une extension de plusieurs milliers de définitions nécessiterait de paginer également le manifeste de collection. L’interface se concentre sur les sets actifs ; une future gestion de saisons archivées demandera son parcours dédié.

Les variables publiques Supabase restent celles de la Mission 03. Pour les liens email en preview, autoriser son URL de callback si nécessaire. Aucune clé à ajouter au dépôt ou au navigateur. Le nouveau frontend nécessite le déploiement de cette branche ; pas de fusion automatique. Les tests Chromium couvrent les quatre largeurs mobiles, sans validation sur iPhone physique. L’avertissement Vite de chunk principal >500 Ko reste visible.
