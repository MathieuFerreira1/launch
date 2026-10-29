# LAUNCH — Plan d'exécution Codex et critères de revue

## Déroulé

**Lot 1 — Base UI** : LAU-001/002/003, shell 4 onglets, design tokens + écrans simulés, états vides. **Les écrans doivent suivre les concepts visuels `design/concepts/`, pas le style du HTML de démo.** Le but n'est PAS de cloner le HTML ; composants React réutilisables et navigation correcte.

**Lot 2 — Supabase** : LAU-004/005/006, comptes, migrations, politiques RLS, Storage privé, tests isolant les comptes. Développement local ou environnement de test uniquement pour les premières migrations.

**Lot 3 — Import** : LAU-007 à LAU-012 + LAU-020 (v1), ZIP/multifichiers, Worker FIT/GPX/TCX, normalisation, déduplication, revue, ingestion, reprise, historique, saisie manuelle.

**Lot 4 — Récompenses** : LAU-013 à LAU-015, règles versionnées, attributions transactionnelles, collections et cartes ; contenu du catalogue révisable.

**Lot 5 — Reveals et durcissement** : LAU-016 à LAU-019, reveal initial/quotidien, prévention du replay, suppression des données, recettage iPhone, accessibilité et limites Supabase gratuit.

**Lot 6 — Vision future, SANS coder en V1** : expliciter architecture d'extension pour avatar/3D, vélo, cosmétiques, défis, amis, marques, paiements, Garmin. Ne pas demander à Codex de fabriquer 3D, paiements et social pendant le Lot 1.

## Revue systématique par ticket

- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` (scripts créés au Lot 1).
- E2E Playwright lorsque l'interface est opérationnelle. Tests à 360, 375, 390 et 430 px + capture de référence ; pas de scroll horizontal.
- Sur imports : fixtures de 200 fichiers, GPX sans horodatage, FIT multi-sports, archive corrompue, ZIP bombée, lots interrompus, doublons inter-imports, sport futur.
- Sur backend : l'utilisateur A ne voit pas l'utilisateur B ; aucune carte décernée depuis client ; suppression des données et fichiers ; secrets absents du bundle.
- Sur reveals : 0 carte, 1 carte, 30+ cartes, animations réduites, fermeture au milieu, retour sans nouvelle récompense.
- Sur design : **comparaison de captures avec les concepts prioritaires par écran**, correspondance aux tokens, minimalisme light, CTA orange seul, touche gaming sur collection/révélation plutôt que glow partout.

## Documents contradictoires ?

Pour le produit : `AGENTS.md` + décisions V1 dans `README.md` > cahier des charges > règles de navigation/architecture > données fictives des illustrations. Pour le **visuel** : `docs/07_design_system.md` + `design/REFERENCES_VISUELLES_PRIORITAIRES.md` + `design/concepts/` > prototype HTML (interactions uniquement). Si contradictions mineures, appliquer cette hiérarchie et signaler la résolution dans le compte rendu. Ne pas choisir seul des règles de récompenses qui nécessitent une décision métier.

## Connexions et droits

Le dépôt GitHub doit contenir migrations et code ; Supabase doit être configuré via fichiers `.env` hors dépôt / secrets d'environnement. **Jamais de clé service-role dans un client ni dans un prompt.** Codex peut préparer les migrations tout seul ; leur exécution sur base distante ne doit avoir lieu qu'une fois le projet de développement explicitement connecté et les risques contrôlés. Pour Cloud, vérifier quels services et secrets sont disponibles dans son environnement ; ne pas supposer que la connexion ChatGPT à une app donne automatiquement accès au terminal distant de Codex.
