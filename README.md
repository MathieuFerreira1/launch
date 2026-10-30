# Launch · Application V1

Application React mobile-first en français. Supabase Auth, profils privés, import massif, historique, collections personnelles et reveals réels pour les comptes connectés ; la démo sans compte garde ses données fictives. Le pack de conception original reste intact dans [`LAUNCH_pack_Codex_references_concepts/`](LAUNCH_pack_Codex_references_concepts/README.md).

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

Playwright construit puis sert le bundle de production via Vite Preview, sans rechargement HMR pendant les imports. Les projets couvrent 360/375/390/430 px et le bureau à 1280 px. Les captures à 390 px sont générées dans `test-results/` (ignoré par Git). Les tests vérifient navigation, filtres, fichier inconnu, suppression de sélection, carte verrouillée, rechargement, sortie de démo, routes inconnues, hors-ligne et absence de requêtes réelles depuis la démo. Les parcours Auth/profil et import/historique utilisent le SDK réel et des réponses Supabase simulées. Les tests de sécurité distants restent séparés.

## Structure

- `src/app` : providers TanStack Query, routes, session de démo et shell responsive.
- `src/features/{auth,home,collections,cards,activities,imports,profile,reveals}` : composants et types par domaine.
- `src/components/ui` : primitive Button au format shadcn/ui (Radix Slot + CVA), états chargement/vide/erreur et en-têtes. `components.json` configure les futures additions shadcn.
- `src/lib` : fixtures de démo explicites, formatage SI/UTC, utilitaires et client Supabase.
- `src/index.css` : Tailwind CSS 4, tokens et composants mobile-first ; safe areas, focus visible et mouvement réduit.
- `public/art` : illustrations SVG originales, remplaçables, avec manifeste de provenance.
- `supabase` : migrations versionnées profils/sports/imports, bucket privé et tests SQL d’isolation.
- `tests` : setup Vitest et parcours Playwright. Tests de composants près du code.

## Parcours livrés

Bienvenue `/`, connexion `/auth` et inscription `/auth/signup`, accueil `/app`, collections `/collections` et `/collections/:sportSlug`, carte `/cards/:cardId`, activités `/activities` et `/activities/:id`, import `/import` (alias `/activities/import`), profil `/profile`, saisie manuelle `/activities/new` et sources privées `/activities/sources`.

Quatre onglets : Accueil, Collections, Activités, Profil. Les quatre sports sont disponibles sans sélection à l’inscription. Le catalogue V1 compte 24 jalons et 4 cartes de complétion ; `/reveal/:sessionId` présente uniquement des cartes déjà attribuées côté serveur, avec reprise et skip.

## Supabase Auth et profils

Voir [la documentation Mission 02](docs/auth-and-profiles.md) pour la migration appliquée, les droits, les tests et la configuration email.

Copier `.env.example` vers `.env.local` et renseigner uniquement l’URL du projet et sa clé publique/publishable. Le projet de développement est `Launch dev`, ref `kephzbvcbmjzqqvqgtav`. Les jetons de gestion, clés secrètes et service-role sont interdits dans les variables frontend.

Les pages `/auth`, `/auth/signup`, `/auth/forgot-password`, `/auth/callback` et `/auth/update-password` gèrent les parcours email/mot de passe et les sessions PKCE. `/profile` lit et modifie le profil de l’utilisateur connecté sous RLS. Aucun choix des sports à l’inscription : les quatre sports sont présents dans le catalogue.

La démo sans compte reste disponible avec ses fixtures. Les comptes connectés disposent d’un import FIT/GPX/TCX/ZIP en Worker, d’un historique réel, de sources privées facultatives et d’une saisie manuelle. Le moteur backend calcule les cartes personnelles depuis l’historique, sans nouvel import, puis prépare les reveals initiaux et quotidiens. Voir [Mission 03 — import massif](docs/bulk-imports.md) et [Mission 04 — cartes et reveals](docs/cards-and-reveals.md) pour l’architecture, les tests, migrations et limites. Les récompenses restent non certifiées ; aucun moteur compétitif, avatar 3D, boutique, social ou connecteur Garmin/Strava.

```sh
# Tests PostgreSQL RLS isolés inclus dans Vitest :
npm test
# Tests sur launch-dev, fixtures intégralement annulées :
python3 scripts/supabase-dev.py test
```

## Déploiement futur

`npm run build` produit `dist/`. Configurer l’hébergeur pour renvoyer `index.html` sur les routes applicatives (React Router). Aucun déploiement n’est effectué ici. Voir [la note de revue](docs/implementation-review.md) pour les arbitrages visuels et les limites de cette tranche.

La finition mobile et ses captures avant/après sont documentées dans [Mission 05](docs/mobile-ux-polish.md).
