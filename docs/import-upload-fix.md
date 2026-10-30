# Correction de l’upload des sources — 30 octobre 2026

## Cause reproduite

Le premier `GET /storage/v1/object/info/sport-sources/...` répond HTTP 400 avec un corps `404`, `NoSuchKey`, « Object not found ». C’est attendu pour un objet qui n’a pas encore été envoyé. Le client continuait déjà après cette réponse.

La requête réellement bloquante était le **POST de création de l’objet** : HTTP 400, corps `statusCode: 403`, `Unauthorized`, refus RLS. Avec un `Blob`, le SDK `storage-js` fabrique un formulaire multipart contenant le fichier et ses champs. La taille HTTP utilisée par le précontrôle Storage inclut cette enveloppe, alors que `activity_files.bytes` réserve la taille du fichier seul. La politique de taille exacte refusait donc ce POST.

L’ancien code refaisait ensuite un `info()` pour tout échec d’upload. Ce second « objet absent » devenait la dernière erreur visible dans Network, et le code remplaçait l’erreur primaire par `UPLOAD_FAILED`, puis par un message de connexion générique.

Une reproduction HTTP contrôlée avec une réservation et un formulaire multipart synthétiques a confirmé ce refus. Les précédents tests HTTP serveur envoyaient déjà des octets bruts ; le parcours navigateur simulé ne conservait pas les sources. Ils n’exerçaient donc pas cette branche multipart du SDK.

## Correction

- Jusqu’à 6 Mio : envoyer l’`ArrayBuffer` original au SDK, avec `application/octet-stream` et `upsert: false`. Le SDK transmet les octets directement ; la longueur correspond à la réservation. Aucun assouplissement RLS.
- Au-delà : conserver l’upload TUS en blocs de 6 Mio et sa reprise. Les erreurs TUS sont aussi traduites sans conserver les corps ou URLs privés.
- Un « objet absent » reconnu permet le premier upload. Un échec d’authentification, une erreur réseau ou un bucket absent ne sont plus assimilés à ce cas.
- Un objet déjà présent est réutilisé, avec vérification de sa taille. Il n’est jamais remplacé. Un conflit concurrent ou une réponse d’upload perdue sont rapprochés d’un éventuel objet terminé.
- Les échecs de RPC, réservation, lecture des reçus, vérification, upload et finalisation indiquent leur étape, un code sûr et le statut HTTP disponible. Les contraintes SQL exposent uniquement leur SQLSTATE. Aucun message serveur brut, chemin, token ou contenu sportif n’est copié dans les erreurs affichées ou les logs.
- Les reçus d’import continuent d’empêcher les doubles écritures après perte d’une réponse de commit.

## État de launch-dev vérifié

Projet confirmé : **Launch dev**, `kephzbvcbmjzqqvqgtav`. Migrations `20261029000100` à `20261029000500` présentes, dont `20261029000300_storage_upload_preflight.sql`.

Bucket `sport-sources` privé, taille maximale 32 Mio, MIME `application/octet-stream`. RLS active sur les objets et tables d’import. Les politiques exigent une réservation du propriétaire, son consentement de conservation et la taille correspondante. Pas d’UPDATE permettant d’écraser un original.

**Aucune nouvelle migration ni modification des politiques/bindings. Aucune donnée personnelle supprimée.** Les seules écritures distantes ont concerné des comptes et fichiers synthétiques créés pour les tests ; ils ont été nettoyés.

## Tests de régression

`src/features/imports/import-api.test.ts` utilise le véritable SDK Supabase avec un transport HTTP contrôlé :

1. Premier upload après le corps 404/NoSuchKey encapsulé dans HTTP 400 ; corps brut exact, sans multipart ni upsert.
2. Source déjà présente, non remplacée ; incohérence de taille signalée.
3. Vérification refusée et bucket absent, sans tentative d’upload.
4. POST refusé par RLS, avec identification de l’étape et sans fuite du message brut.
5. Upload réussi dont la réponse réseau est perdue.
6. Commit échoué puis repris sans réenvoyer la source ; reçu déjà enregistré ignoré au replay.
7. Contrainte de réservation avec étape, statut et SQLSTATE sûrs.
8. Quota et session expirée avec indications adaptées.

## Parcours navigateur réel

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
  python3 scripts/test-live-import-browser.py
```

Le script est strictement limité à launch-dev. Il crée un compte synthétique sans email envoyé, l’authentifie et transmet au navigateur sa session ordinaire. La clé administrative reste dans le processus serveur et n’est jamais envoyée au frontend. Aucun dump de session, trace, vidéo ou capture automatique n’est activé. La configuration live est distincte de la CI simulée et ne s’exécute pas avec `npm run test:e2e`.

Chromium exécute le Worker et le SDK réels. Les requêtes sont transmises sans modification au backend via le proxy et la confiance TLS de l’environnement. Une seule réponse de commit, après sa réussite effective en base, est remplacée par HTTP 503 pour provoquer une reprise contrôlée.

Résultats observés : analyse d’un ZIP avec sous-dossiers, réservation, upload privé, erreur située sur le commit, rechargement/reprise via reçus serveur, consultation dans l’historique, réimport du même ZIP avec **une activité et un upload**, puis upload TUS navigateur réel d’une source synthétique de **7 Mio**, avec une seconde activité visible. Nettoyage des seules sources et du compte créés par le script.

Les assertions SQL RLS/idempotence ont également réussi sur launch-dev, avec annulation de toutes leurs fixtures. Aucun fichier d’un utilisateur réel n’a servi de fixture.

Validation locale finale : **39 tests Vitest**, **45 tests Playwright simulés**, **1 parcours navigateur contre launch-dev** (dont upload TUS 7 Mio), TypeScript strict et ESLint réussis. Le contrôle distant a confirmé zéro compte synthétique résiduel. Build et dry-run Cloudflare font partie de la validation de livraison.
