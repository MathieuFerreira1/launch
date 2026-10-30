## Comportement

Un compte connecté retrouve désormais les cartes de son historique Supabase, avec 24 jalons configurables et 4 cartes de complétion. Une seule activité peut débloquer plusieurs paliers ; réimporter ou recalculer ne réattribue aucune carte. La démo conserve ses données séparées.

Le moteur PostgreSQL traite l’historique par lots reprenables, avec snapshot du catalogue, verrou par utilisateur, contraintes d’unicité et audit. Le reveal initial regroupe les cartes acquises ; les nouveautés suivantes ont leur événement. Découverte progressive, interruption, reprise, passage des animations et récapitulatif sont persistés. Les justifications invalidées sont remplacées par une autre activité admissible lorsqu’elle existe, sans réattribution ni nouveau reveal.

Accueil, collections, détails et reveals utilisent le design clair/orange existant. Illustration de trophée SVG originale, effets par rareté et mouvement réduit ; aucun service IA à l’attribution. Les imports personnels et déclarations manuelles restent explicitement non certifiés et exclus de tout usage compétitif ou commercial.

## Base et sécurité

Deux migrations additives, validées avant application et **déjà appliquées sur `launch-dev` uniquement** (`kephzbvcbmjzqqvqgtav`) :

- `20261030000100_cards_collections_rewards.sql` : catalogue, règles, collections, jobs, possessions, audit, reveals, RPC et RLS.
- `20261030000200_reward_proof_reconciliation.sql` : historique et remplacement contrôlé des justifications.

RLS et droits SQL testés entre deux utilisateurs et en anonyme. Attribution uniquement par RPC authentifiée utilisant `auth.uid()` ; aucun droit d’écriture directe sur les possessions/catalogue. Aucune donnée personnelle supprimée ni clé privée ajoutée au frontend.

## Vérifications

- `npm run typecheck`, `npm run lint`, `npm test` : **43 tests réussis**.
- `npm run build`, `npm run check:cloudflare` : réussis.
- Playwright : **55 tests réussis**, aux largeurs 360/375/390/430 px et desktop.
- Suites SQL sur `launch-dev`, avec fixtures annulées : seuils, métriques absentes/incohérentes, sports ambigu/futur, complétions, idempotence, privilèges, reprise et justification alternative.
- Intégration HTTP réelle : concurrence de deux traitements, 21 puis 28 cartes, isolation RLS, reveal initial/quotidien et six justifications réconciliées, sans doublon.
- Navigateur réel contre `launch-dev` : ZIP/Worker, upload privé et TUS 7 Mio, réponse de commit perdue, reprise, historique, réimport, acquisition d’une carte et reveal repris après rechargement. Comptes et fichiers synthétiques nettoyés.
- Benchmark PostgreSQL embarqué : **10 000 activités / 40 lots de 250 / 4 789 ms** pour le moteur. Aucun résultat présenté comme une mesure sur iPhone physique.

La régression de reprise d’import apparue pendant ce parcours est corrigée : choix du représentant FIT/GPX/TCX stable après rechargement IndexedDB, et fichiers ignorés exclus comme cibles de doublons.

## Revue et limites

Le traitement avance lorsque l’application est ouverte ; aucun cron hébergé n’est déployé. Les collections sont personnelles et les contrôles de plausibilité ne certifient pas les performances. Fermer après un flip mais avant « Continuer » peut représenter cette carte courante ; les cartes confirmées et les sessions terminées ne sont pas rejouées.

Les variables publiques Supabase restent inchangées. Autoriser le callback email de la Preview dans Supabase Auth si nécessaire. Le catalogue V1 comporte 28 cartes ; une extension à plusieurs milliers de définitions ou une interface de saisons archivées demandera une évolution dédiée. L’avertissement Vite du chunk principal supérieur à 500 Ko subsiste.

Architecture, procédures et limites détaillées : [docs/cards-and-reveals.md](cards-and-reveals.md). Captures : [accueil](screenshots/mission04-home.png), [collection](screenshots/mission04-running.png), [reveal](screenshots/mission04-reveal.png).

Branche créée depuis `main` après la fusion de la Mission 03 (`9a4a50e`). Pull Request préparée pour revue, sans fusion automatique.
