# Launch · Application V1

Application React mobile-first en français. Le frontend dispose de Supabase Auth et de profils privés réels ; les cartes et activités restent des **données fictives**. Le pack de conception original reste intact dans [`LAUNCH_pack_Codex_references_concepts/`](LAUNCH_pack_Codex_references_concepts/README.md).

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

Playwright démarre Vite lui-même. Les projets couvrent 360/375/390/430 px et le bureau à 1280 px. Les captures des six écrans à 390 px sont générées dans `test-results/` (ignoré par Git). Les tests vérifient navigation, filtres, fichier inconnu, suppression de sélection, carte verrouillée, rechargement, sortie de démo, routes inconnues, hors-ligne et absence de requêtes réelles depuis la démo. Les parcours Auth/profil utilisent le SDK réel et des réponses Supabase simulées.

## Structure

- `src/app` : providers TanStack Query, routes, session de démo et shell responsive.
- `src/features/{auth,home,collections,cards,activities,imports,profile,reveals}` : composants et types par domaine.
- `src/components/ui` : primitive Button au format shadcn/ui (Radix Slot + CVA), états chargement/vide/erreur et en-têtes. `components.json` configure les futures additions shadcn.
- `src/lib` : fixtures explicites, formatage SI/UTC, utilitaires et client Supabase à activation explicite.
- `src/index.css` : Tailwind CSS 4, tokens et composants mobile-first ; safe areas, focus visible et mouvement réduit.
- `public/art` : illustrations SVG originales, remplaçables, avec manifeste de provenance.
- `supabase` : migration versionnée des profils/sports et tests SQL d’isolation.
- `tests` : setup Vitest et parcours Playwright. Tests de composants près du code.

## Parcours livrés

Bienvenue `/`, connexion `/auth` et inscription `/auth/signup`, accueil `/app`, collections `/collections` et `/collections/:sportSlug`, carte `/cards/:cardId`, activités `/activities` et `/activities/:id`, import `/import` (alias `/activities/import`), profil `/profile`.

Quatre onglets : Accueil, Collections, Activités, Profil. Les quatre sports sont disponibles sans sélection à l’inscription. Le reveal est un composant préparatoire testé, sans route publique ni attribution de récompense.

## Supabase Auth et profils

Voir [la documentation Mission 02](docs/auth-and-profiles.md) pour la migration appliquée, les droits, les tests et la configuration email.

Copier `.env.example` vers `.env.local` et renseigner uniquement l’URL du projet et sa clé publique/publishable. Le projet de développement est `Launch dev`, ref `kephzbvcbmjzqqvqgtav`. Les jetons de gestion, clés secrètes et service-role sont interdits dans les variables frontend.

Les pages `/auth`, `/auth/signup`, `/auth/forgot-password`, `/auth/callback` et `/auth/update-password` gèrent les parcours email/mot de passe et les sessions PKCE. `/profile` lit et modifie le profil de l’utilisateur connecté sous RLS. Aucun choix des sports à l’inscription : les quatre sports sont présents dans le catalogue.

La démo sans compte reste disponible. Les cartes/activités sont fictives même pour un utilisateur connecté ; aucun moteur de récompenses client. L’import reste un inventaire local de fichiers, sans analyse ni téléversement. Aucun avatar 3D, boutique, social ou connecteur Garmin/Strava.

```sh
# Tests PostgreSQL RLS isolés inclus dans Vitest :
npm test
# Tests sur launch-dev, fixtures intégralement annulées :
python3 scripts/supabase-dev.py test
```

## Déploiement futur

`npm run build` produit `dist/`. Configurer l’hébergeur pour renvoyer `index.html` sur les routes applicatives (React Router). Aucun déploiement n’est effectué ici. Voir [la note de revue](docs/implementation-review.md) pour les arbitrages visuels et les limites de cette tranche.
