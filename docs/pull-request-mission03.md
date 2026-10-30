## Importer un véritable historique sportif dans Launch

Les comptes connectés peuvent analyser des FIT/GPX/TCX, plusieurs fichiers ou des ZIP avec sous-dossiers, vérifier les sports et doublons, puis enregistrer les activités dans leur compte Supabase. L’historique privé remplace les activités fictives pour ces comptes. Les cartes restent en démonstration, sans attribution de récompenses.

- Parsing en Web Worker, progression, protections ZIP/XML et CRC, revue paginée. Conservation des sports futurs et des données incomplètes, sans déduire arbitrairement le sport.
- Brouillons IndexedDB privés par compte, reprise locale 48 h, commits idempotents de 25 éléments. Les doublons probables demandent une décision explicite ; deux formats peuvent être rattachés à une activité.
- Originaux privés facultatifs, consentement et suppression explicites, upload TUS reprenable au-delà de 6 Mio. Limites techniques : sélection 256 Mio, source 32 Mio, décompressé 512 Mio, 5 000 entrées, sources réservées 1 Gio/compte.
- Historique/détails réels, correction sportive et saisie `self_reported`. Interfaces de relecture de toutes les activités pour la prochaine mission, sans moteur de cartes.
- Design mobile existant conservé ; captures synthétiques et guide dans `docs/bulk-imports.md`.

## Base de développement

Projet confirmé : **Launch dev**, `kephzbvcbmjzqqvqgtav`. Aucune production utilisée.

Migrations versionnées, validées localement et en transaction distante annulée avant application, puis **appliquées sur launch-dev** :

1. `20261029000200_activity_imports.sql` : tables, idempotence, RPC bornées, RLS et bucket privé `sport-sources`.
2. `20261029000300_storage_upload_preflight.sql` : policy compatible avec le contrôle préalable officiel Storage.
3. `20261029000400_import_deletion_lifecycle.sql` : cascades des reçus et liens ; aucune donnée supprimée par la migration.
4. `20261029000500_classification_review_guards.sql` : une correction sportive préserve la revue des données incomplètes ou incohérentes.

Aucune écriture directe accordée au client sur les tables métier. Les RPC utilisent l’identité Auth et un `search_path` fixe. Aucun secret dans le navigateur. Les fichiers modifiables ne sont pas présentés comme certifiés par un fournisseur.

## Validation exécutée

- TypeScript strict, ESLint, build Vite et dry-run Wrangler.
- **26 tests Vitest** : FIT/GPX/TCX synthétiques, ZIP mixtes/sous-dossiers, archive répétée, doublons interformats, fichiers corrompus/incomplets, sports futurs, protections d’archives et PostgreSQL/RLS.
- **45 tests Playwright réussis, sans retry**, aux quatre largeurs mobiles et sur bureau : Auth/démo préservées, Worker réel, coupure réseau puis rechargement/reprise, historique et saisie manuelle. Le bundle de production est testé pour éviter les interruptions HMR du serveur de développement.
- SQL sur launch-dev, fixtures annulées : isolation A/B/anon, droits, RPC, objets privés, idempotence et classification.
- Intégration HTTP réelle sur launch-dev avec deux comptes synthétiques : Auth, upload privé standard + TUS **7 Mio**, download, refus intercomptes, reprise et rattachement de sources. Sources/comptes nettoyés ; zéro compte de test résiduel contrôlé.
- Benchmark **200 fichiers × 500 points** : analyse Node 2,2 s ; Worker + IndexedDB + revue 4,5–6,1 s, fil principal actif. Aucune donnée personnelle utilisée.

## À vérifier lors du déploiement

Les variables publiques Supabase et les redirections Auth existantes restent nécessaires ; ajouter l’URL de callback de preview si besoin. Les migrations sont déjà appliquées, le nouveau frontend nécessite le déploiement de cette branche. Tester d’abord une petite sélection avant un véritable historique.

Pas de mesure sur iPhone physique ni de validation de tous les producteurs de fichiers. ZIP imbriqués/chiffrés et `.fit.gz` exclus. Reprise sur le même navigateur ; après perte du brouillon, re-sélectionner les fichiers reste idempotent. Réanalyse complète future conditionnée à la conservation des originaux. Avertissement Vite sur la taille du chunk principal encore présent. Le plafond de sources est technique, pas une offre commerciale.

Ne pas fusionner automatiquement.
