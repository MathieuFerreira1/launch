# Mission 03 — Import massif et historique sportif

## État et architecture

Branche `feat/bulk-activity-import` créée depuis `main` (`57267e1`), qui contient la Mission 02 et la configuration Cloudflare. Supabase **Launch dev**, ref `kephzbvcbmjzqqvqgtav`, est le seul projet utilisé.

Les comptes connectés utilisent désormais les activités réelles ; la démo sans compte garde ses fixtures. Les cartes restent fictives, sans moteur de récompenses. Leurs liens vers les activités fictives sont séparés de l’historique privé (`/demo/activities/:id`). L’authentification existante est conservée ; seule la purge des brouillons de fichiers lors d’une déconnexion volontaire y est ajoutée.

- `src/features/imports/parsers` : normalisation FIT/GPX/TCX, unités SI et horodatages UTC.
- `analyze.ts` et `import.worker.ts` : lecture séquentielle ZIP/multifichiers, décompression bornée, hash SHA-256, analyse lourde en Worker. Un accusé de réception IndexedDB impose une contre-pression entre fichiers ; l’archive entière n’est jamais décompressée en mémoire.
- `local-store.ts` : brouillons par propriétaire, métadonnées et sources séparées, reprises sur le même navigateur. Aucun token n’est stocké dans les brouillons.
- `import-api.ts` : revue des doublons et enregistrement par RPC, au plus 25 éléments par transaction ; sources >6 Mio envoyées via TUS reprenable.
- `activities/activity-api.ts` : historique paginé, détail, classification, saisie manuelle et interfaces de relecture pour la prochaine mission.

Aucun parseur ni nouveau service permanent côté Cloudflare. Le SDK FIT officiel sert uniquement à lire des fichiers ; aucune connexion Garmin. Licence complète distribuée dans `public/licenses/fit-sdk.txt`. ZIP.js et fast-xml-parser conservent leurs licences de dépendances.

## Parcours utilisateur

1. Se connecter, ouvrir **+ Activité** / `/import`.
2. Accepter explicitement une copie temporaire locale pour la reprise, puis choisir plusieurs fichiers ou un ZIP. Le glisser-déposer est disponible sur ordinateur ; le sélecteur multiple fonctionne sur téléphone.
3. Suivre l’analyse et examiner les activités, anomalies et doublons. Le sport original reste conservé. Corriger une classification ambiguë par activité ; aucun Trail inféré du dénivelé.
4. Pour un doublon probable, choisir **activité distincte**, **ignorer** ou **rattacher à l’activité existante**. Les autres formats peuvent ainsi devenir des sources supplémentaires sans dupliquer l’activité. Les rapprochements entre éléments de la sélection respectent l’ordre de dépendance lors du commit.
5. Choisir si les originaux doivent être conservés en privé, puis confirmer. Les erreurs sont enregistrées séparément ; les activités incomplètes restent `needs_review`.
6. En cas de coupure, recharger puis **Reprendre l’enregistrement**. Les reçus serveur évitent tout doublon après perte d’une réponse. Un lot déjà confirmé est figé ; créer un nouvel import pour ajouter d’autres fichiers.
7. Retrouver les sorties dans `/activities`, avec filtres, pagination, détails et correction du sport. `/activities/new` propose une saisie **self_reported**, toujours non certifiée, avec confirmation explicite en cas de doublon probable.
8. Télécharger ou supprimer une source depuis le détail d’activité. `/activities/sources` permet aussi de supprimer les sources réservées ou orphelines d’un import abandonné.

Les imports de fichiers modifiables ne sont pas des activités certifiées par un fournisseur. Aucun reveal de fausse récompense n’est lancé après l’import.

## Déduplication, reprise et données futures

- Clé stable : `SHA-256 du fichier + index de session`, unique par propriétaire dans les liens de sources. Une nouvelle importation du même ZIP retrouve les mêmes clés, même dans un autre lot.
- Doublon probable : même catégorie, début à ±120 s, distance à ±max(100 m, 2 %), durée à ±max(60 s, 2 %). Pour les sports futurs, le libellé original doit aussi correspondre. Ce signal demande une confirmation et ne supprime jamais silencieusement une sortie.
- La base revérifie ces conditions sous un verrou transactionnel par utilisateur pour prévenir les courses entre imports concurrents.
- Les fichiers multisessions FIT et les multiples activités TCX/traces GPX produisent des entrées distinctes et stables. Les segments GPX déconnectés ne sont pas reliés artificiellement pour calculer la distance.
- Les sports futurs gardent `original_sport`, les métriques et les métadonnées disponibles. Sans source brute conservée, seuls ces champs permettront une réanalyse ; aucune promesse de récupération des champs absents.
- `activityReplayInputsAfter` parcourt **toutes** les activités par curseur, y compris les sports futurs et les données à vérifier. `reward_activity_inputs` est une vue personnelle de présélection V1, jamais une source de propriété des cartes. Les futurs calculs devront tenir compte du statut, de la provenance et de la version du parseur.

## Limites et conservation

Limites techniques provisoires, à mesurer/ajuster avant une ouverture large :

| Contrôle                             | Limite      |
| ------------------------------------ | ----------- |
| Sélection / archive compressée       | 256 Mio     |
| Source individuelle, extraite ou non | 32 Mio      |
| Total décompressé                    | 512 Mio     |
| Entrées ZIP, dossiers compris        | 5 000       |
| Ratio de décompression               | 200         |
| Profondeur des chemins               | 12          |
| Sessions par source                  | 100         |
| Lots de métadonnées                  | 25 éléments |
| Sources privées réservées par compte | 1 Gio       |

Archives imbriquées, chiffrées et `.fit.gz` non pris en charge. Les chemins traversants/absolus, DTD/entités XML, CRC invalides et contenus inconnus sont rejetés ou signalés. Les vérifications TLS, CRC FIT et signatures ZIP restent actives.

Les sources distantes sont facultatives et privées, conservées jusqu’à suppression par l’utilisateur. Le plafond de 1 Gio est une protection technique, pas une offre de stockage ni une politique commerciale approuvée. Le consentement est enregistré au niveau du lot. Aucun GPS brut n’est stocké dans les colonnes d’activité ou les logs ; la source originale peut en contenir, dans le bucket privé uniquement.

La reprise locale est disponible 48 h. Les brouillons expirés sont nettoyés à la prochaine ouverture de l’import ; un navigateur fermé ne peut pas exécuter un nettoyage physique programmé. Succès, abandon local, changement de compte à l’ouverture de l’import et déconnexion volontaire purgent les copies concernées. Après perte de ce stockage local, re-sélectionner les fichiers dans un nouveau lot reste idempotent. Une interruption de l’analyse nécessite de re-sélectionner l’archive pour compléter les entrées non encore analysées.

La suppression d’une source peut affecter plusieurs activités liées et demande confirmation. Les activités normalisées sont conservées. Abandonner un brouillon local ne supprime pas silencieusement les activités déjà enregistrées ; les sources distantes éventuellement réservées restent gérables dans `/activities/sources`.

## Migrations appliquées sur launch-dev

Toutes les migrations ont été vérifiées localement (PostgreSQL embarqué) et/ou dans une transaction distante annulée avant leur application. Aucune suppression de données existantes :

1. `20261029000200_activity_imports.sql` : tables `activities`, `activity_files`, `activity_file_links`, `import_batches`, `import_items`, `import_errors`, contraintes, RLS, RPC et bucket `sport-sources` privé.
2. `20261029000300_storage_upload_preflight.sql` : compatibilité de la policy INSERT avec le contrôle préalable officiel de Storage (`contentLength`) et les métadonnées finales (`size`), en conservant propriétaire, réservation et contrôle de taille.
3. `20261029000400_import_deletion_lifecycle.sql` : correction des cascades des reçus/liens pour ne pas bloquer la suppression d’un compte. Aucune ligne supprimée par cette migration.
4. `20261029000500_classification_review_guards.sql` : une correction de sport ne rend pas éligible une activité incomplète, datée dans le futur ou incohérente ; le sport original reste conservé.

Aucune écriture directe client dans les tables métier : lecture de ses propres lignes uniquement, écritures bornées via RPC authentifiées, fonctions privilégiées avec `search_path` fixe. Les fichiers doivent être réservés par leur propriétaire avant upload. Aucun UPDATE Storage n’est autorisé pour remplacer un original. Les uploads passent la limite du bucket et les politiques de propriétaire ; aucun lien permanent public.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run check:cloudflare
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e

# Tests SQL sur launch-dev : fixtures annulées
python3 scripts/supabase-dev.py test --mission imports

# Intégration réelle : deux comptes synthétiques sans email envoyé,
# upload standard et TUS 7 Mio, nettoyage des seules fixtures créées
python3 scripts/test-live-imports.py
```

Le dernier script utilise une clé administrative uniquement dans son processus serveur pour créer/supprimer ses comptes synthétiques. Elle est obtenue temporairement via le jeton de gestion, jamais imprimée, enregistrée ou transmise au navigateur. Les uploads, lectures et RPC testés utilisent les sessions ordinaires des comptes A/B. Aucun historique personnel n’a servi de fixture.

## Validation exécutée

`typecheck`, ESLint et les **26 tests Vitest** passent. Les **45 parcours Playwright** passent sur le bundle de production à 360/375/390/430 px et 1280 px, sans retry. Ils couvrent aussi les parcours Auth et démo existants. Les tests couvrent les trois formats, les ZIP mixtes et leurs sous-dossiers, les clés stables d’une même archive, les doublons interformats, les sports futurs/ambigus, les données absentes et corrompues, les protections XML/ZIP et les politiques PostgreSQL sous des rôles distincts. Les assertions SQL ont aussi été exécutées sur launch-dev, avec annulation des fixtures.

L’intégration distante a vérifié les sessions de deux comptes synthétiques, la réservation et l’upload privé standard et TUS (7 Mio), les lectures autorisées et interdites, l’isolation des RPC et du Storage, l’idempotence, la reprise après un premier lot, le rattachement de deux formats à une activité et la saisie manuelle. Les sources et comptes synthétiques ont été supprimés et leur nettoyage contrôlé.

Le benchmark synthétique contient 200 fichiers de 500 points chacun, sans coordonnées personnelles. Au dernier passage, l’analyse Node a pris **2,2 s**, et l’analyse Worker avec IndexedDB et revue **4,5 à 6,1 s** (172 à 235 battements du fil principal à intervalle de 25 ms). La pagination à 50 lignes est testée. Il ne s’agit pas d’une mesure sur iPhone physique. La validation initiale sur le serveur de développement a révélé un rechargement Vite pendant le Worker (confirmé dans la trace), interrompant l’analyse. Playwright construit et sert maintenant le bundle de production, et toutes ses captures sont écrites dans les artefacts ignorés. Les rapports Playwright contiennent les mesures de chaque exécution.

Captures de revue à 390 px : [import](screenshots/import-review.png), [historique réel avec fixtures synthétiques](screenshots/imported-history.png).

## Actions manuelles et limites de validation

Les variables frontend publiques et les redirections Auth Cloudflare de la Mission 02 restent nécessaires. Il faut déployer/fusionner cette PR pour utiliser le nouveau frontend sur l’URL principale ; les migrations sont déjà présentes sur launch-dev. Ne pas ajouter de clé secrète au frontend. L’URL de preview peut nécessiter une redirection Auth supplémentaire.

Les tailles ci-dessus et les temps mesurés sur Chromium ne garantissent pas la capacité d’un iPhone physique pour des archives maximales. Commencer avec une petite sélection, puis fractionner les historiques qui dépassent ces plafonds. Les formats XML spécifiques à des producteurs, les sports non explicites, les GPX de parcours sans séance et certains champs manquants resteront à vérifier. Les tests ne couvrent pas tous les appareils ni tous les producteurs de fichiers.

Vite signale encore un chunk principal supérieur à 500 Ko ; cet avertissement n’empêche pas le build. Le SDK FIT est chargé dans le Worker. Une suppression administrative de compte devra purger ses originaux via l’API Storage avant de supprimer l’utilisateur Auth ; les métadonnées relationnelles ont leurs cascades, mais les objets Storage ne doivent pas être abandonnés.
