# Launch · Application V1

Application React mobile-first en français. Cette première tranche initialise le frontend et les écrans avec des **données fictives**. Le pack de conception original reste intact dans [`LAUNCH_pack_Codex_references_concepts/`](LAUNCH_pack_Codex_references_concepts/README.md).

## Lancer

Node.js ≥ 22.12 (validation effectuée avec Node 24.19), npm 11.

```sh
npm ci
npm run dev
```

Ouvrir l’adresse indiquée par Vite et choisir **Explorer la démo**. La session de démonstration est conservée dans le sessionStorage de l’onglet. Ce mécanisme n’est pas une authentification de production. Aucun compte réel ni secret n’est nécessaire.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

Tests navigateur :

```sh
npx playwright install chromium
npm run test:e2e
# Alternative lorsqu’un Chromium système est disponible :
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Playwright démarre Vite lui-même. Les projets couvrent 360/375/390/430 px et le bureau à 1280 px. Les captures des six écrans à 390 px sont générées dans `test-results/` (ignoré par Git). Les tests vérifient navigation, filtres, fichier inconnu, suppression de sélection, carte verrouillée, rechargement, sortie de démo, routes inconnues, hors-ligne et absence de requêtes Supabase.

## Structure

- `src/app` : providers TanStack Query, routes, session de démo et shell responsive.
- `src/features/{auth,home,collections,cards,activities,imports,profile,reveals}` : composants et types par domaine.
- `src/components/ui` : primitive Button au format shadcn/ui (Radix Slot + CVA), états chargement/vide/erreur et en-têtes. `components.json` configure les futures additions shadcn.
- `src/lib` : fixtures explicites, formatage SI/UTC, utilitaires et client Supabase à activation explicite.
- `src/index.css` : Tailwind CSS 4, tokens et composants mobile-first ; safe areas, focus visible et mouvement réduit.
- `public/art` : illustrations SVG originales, remplaçables, avec manifeste de provenance.
- `supabase` : emplacements réservés ; aucune migration ni fonction ajoutée.
- `tests` : setup Vitest et parcours Playwright. Tests de composants près du code.

## Parcours livrés

Bienvenue `/`, information connexion `/auth`, accueil `/app`, collections `/collections` et `/collections/:sportSlug`, carte `/cards/:cardId`, activités `/activities` et `/activities/:id`, import `/import` (alias `/activities/import`), profil `/profile`.

Quatre onglets : Accueil, Collections, Activités, Profil. Les quatre sports sont disponibles sans sélection à l’inscription. Le reveal est un composant préparatoire testé, sans route publique ni attribution de récompense.

## Supabase et limites

Le SDK est installé et la factory `getSupabaseClient` est préparée, mais **jamais appelée par la démo**. Pour une prochaine mission, copier `.env.example` vers `.env.local` et renseigner uniquement l’URL du projet et sa clé publique/publishable. Ces valeurs frontend ne sont pas des secrets. Ne jamais y placer un jeton de gestion, une clé secrète ou service-role. Les véritables secrets restent dans les paramètres sécurisés Codex Cloud/backend.

Le projet `Launch dev` précédemment vérifié a pour ref `kephzbvcbmjzqqvqgtav`. Cette mission n’a exécuté aucune commande Supabase et n’a modifié ni base, ni utilisateurs, ni Storage, ni Edge Functions.

La sélection de fichiers est un inventaire local des noms/tailles/extensions. Elle ne lit pas le contenu, ne valide pas les signatures, ne décompresse pas, ne détecte pas les doublons et ne téléverse rien. L’analyse et la saisie manuelle sont explicitement désactivées. Les seuils et raretés du catalogue sont fictifs, sans moteur d’attribution côté client.

L’authentification réelle, les policies RLS/GRANT, l’ingestion, les migrations, le stockage privé, les consentements et la suppression/export de données seront livrés séparément. Aucun avatar 3D, boutique, social ou connecteur Garmin/Strava.

## Déploiement futur

`npm run build` produit `dist/`. Configurer l’hébergeur pour renvoyer `index.html` sur les routes applicatives (React Router). Aucun déploiement n’est effectué ici. Voir [la note de revue](docs/implementation-review.md) pour les arbitrages visuels et les limites de cette tranche.
