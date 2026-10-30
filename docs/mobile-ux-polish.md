# Mission 05 — Finition mobile

Branche `feat/mobile-ux-polish`, issue de `main` au commit `ac68a65` (fusion Mission 04). Aucun changement SQL, aucune migration ni opération sur les données distantes. Auth, règles de cartes, seuils et protections RLS sont conservés.

## Direction et améliorations

Les concepts individuels Collection et Import du pack restent les références : grille à deux colonnes, objectifs lisibles, fond ivoire, orange ponctuel, espaces généreux. Les illustrations restent originales et vectorielles, sans reprendre les photos des concepts. Cette proposition graphique demande une revue artistique ; elle n’est pas présentée comme déjà approuvée.

- Quatre paysages/silhouettes distincts : route Running, relief Trail, cycliste et eau libre. SVG statiques réutilisés par clé existante, sans service externe ni génération à l’attribution. Suppression du filtre de turbulence coûteux ; dimensions d’image réservées, décodage asynchrone et chargement différé en grille.
- Cartes : badge avec symbole, finitions et bordures par rareté, pied de carte acquis/objectif, contraste des cartes verrouillées, état de complétion conservé. Détail et carte en reveal deviennent des articles : plus de lien vers soi-même ni de navigation accidentelle pendant le flip.
- Reveal : transition courte entre cartes, progression persistée existante, récapitulatif par sport, skip et mouvement réduit. La sauvegarde serveur précède le passage à la carte suivante ; interruption et sessions déjà vues conservent leur comportement Mission 04.
- Mobile : filtres horizontaux défilants, navigation avec sélection en fond orange pâle et cibles de 56 px, champs de 16 px pour éviter le zoom automatique Safari, safe areas et hauteur `svh`. Confirmation d’import en fin de revue, lien direct vers les activités à vérifier et étapes explicites. La revue reste paginée et le Worker inchangé.
- Erreurs : message générique utilisable avec les données réelles, au lieu de « Impossible de charger la démo » ; confirmation d’import mieux séparée et lien tactile vers l’historique.
- Réseau : suppression de l’invalidation du manifeste à chaque lecture/avancement du reveal ; actualisation à la fin et après traitement conservée. Cache de reveal de 30 secondes et focus des collections confié au traitement des récompenses. Le contrôle à la reconnexion/ouverture reste actif pour détecter les nouvelles activités.

## Captures à 390 px

Données exclusivement synthétiques. Les captures avant proviennent du bundle de `main` exécuté avant modification ; les captures après utilisent le même parcours Playwright.

| Écran | Avant | Après |
|---|---|---|
| Accueil | [Avant](screenshots/mission05/home-before.png) | [Après](screenshots/mission05/home-after.png) |
| Collection Running | [Avant](screenshots/mission05/collection-before.png) | [Après](screenshots/mission05/collection-after.png) |
| Reveal initial | [Avant](screenshots/mission05/reveal-before.png) | [Après](screenshots/mission05/reveal-after.png) |

Autres vues : [Trail](screenshots/mission05/trail-after.png), [Vélo](screenshots/mission05/cycling-after.png), [Natation](screenshots/mission05/swimming-after.png), [détail verrouillé](screenshots/mission05/detail-after.png), [revue import](screenshots/mission05/import-after.png).

Les captures de page entière montrent la navigation fixe à sa position dans la fenêtre ; cela ne représente pas une barre intercalée dans le document.

## Vérification

`npm run typecheck`, `npm run lint`, `npm test` : 43 tests Vitest/PostgreSQL réussis. `npm run test:e2e` : 60 tests Chromium réussis (360/375/390/430 px et desktop), dont cinq nouveaux parcours de tous les sports, cartes verrouillées, image chargée, cibles tactiles, débordement et mouvement réduit. L’assertion de reveal vérifie l’absence de nouvelle requête au manifeste entre deux cartes.

Les parcours existants couvrent rechargement, sessions, hors-ligne, erreurs, réimport et reprise. Le ZIP de 200 fichiers × 500 points reste analysé progressivement avec pagination et une interface qui continue de répondre (mesure Chromium 390 px : environ 5,6 s pour analyse/revue, 217 ticks du thread principal dans ce passage ; mesure indicative, sans valeur de benchmark iPhone).

```sh
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
# WebKit, après installation des bibliothèques système :
npx playwright install --with-deps webkit
LAUNCH_WEBKIT=1 npx playwright test --project=webkit-mobile-390
```

GitHub Actions exécute aussi les 12 parcours à 390 px avec WebKit ; les résultats Chromium et WebKit ont leurs artefacts distincts. L’installation système WebKit locale exige un accès administrateur indisponible ; la validation est donc déportée en CI.

## Limites et recette sur appareil

Pas de certification Safari iOS physique : WebKit Linux ne simule ni l’encoche, ni le clavier réel, ni le cycle de vie d’un onglet suspendu par iOS. Sur iPhone, vérifier le clavier des formulaires, le sélecteur Fichiers multi-sélection, le retour depuis l’arrière-plan pendant un import, les safe areas en portrait/paysage et le réglage Réduire les animations. Les attributions restent côté serveur et les brouillons IndexedDB soumis aux limites de stockage du navigateur.

Le chunk JavaScript principal reste supérieur à 500 Ko ; ce travail ne prétend pas résoudre le découpage complet du frontend. Aucune nouvelle dépendance de production. Pas de modification des secrets, de la base ou de la production ; PR dédiée sans fusion automatique.
