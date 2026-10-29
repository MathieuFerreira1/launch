# AGENTS.md — Contrat d'exécution pour Codex (LAUNCH)

Tu développes **Launch V1**, application mobile-first en français. Commence par lire `README.md`, `docs/01_cahier_des_charges.md`, `docs/07_design_system.md`, `docs/08_navigation_et_ecrans.md`, et les documents techniques avant toute modification.

## Produit : impératifs

1. Aucun choix des sports à l'inscription. Les 4 sports V1 : Running, Trail, Vélo, Natation. Importer aussi les activités des futurs sports.
2. Pas de Strava ni Garmin en V1. Import massif multi-fichiers/ZIP FIT/GPX/TCX ; imports ultérieurs ; saisie manuelle distincte et `self_reported`.
3. Pas de cartes aléatoires, de boosters ni d'achat de performances. Attribution déterministe et idempotente côté serveur ; une carte jalon au maximum par compte.
4. `user_cards` est source de vérité ; les sessions de reveal ne font qu'annoncer des récompenses déjà attribuées. Reveal initial groupé, puis nouveautés seulement.
5. Conserver sport original, champs normalisés et (avec consentement/limites de stockage) fichier brut privé pour reprocessing des sports futurs. Ne pas promettre de réanalyse si données insuffisantes.
6. Sport ambigu = revue ; pas d'inférence Trail par simple dénivelé. Doublons probables = confirmation, pas suppression silencieuse.

## Direction artistique (approuvée)

- **Light mode** d'abord. Fond `#FBFAF7`, surface `#FFFFFF`, texte `#20201F`, secondaire `#85837E`, accent orange corail `#F36B45`, bordure `#EDEAE5`.
- Minimalisme inspiré de principes de produits Marc Lou, **sans copier une marque ou sa mise en page à l'identique**. Gameplay et progression plus expressifs sur les cartes et les reveals, pas sur tous les blocs.
- Pas de glow, de néons, de fonds violet foncé, d'ombres exagérées ni de surcharge d'indicateurs.
- **DIRECTION VISUELLE PRIORITAIRE OBLIGATOIRE :** `design/concepts/` (notamment `design/concepts/ecrans_individuels/`), indexé dans `design/REFERENCES_VISUELLES_PRIORITAIRES.md`. Reconstruire les écrans V1 en s'inspirant d'abord de **CES CONCEPTS**, pas des anciennes planches. Les concept screens font référence pour l'allure, la densité, la typographie, la composition, les cartes et l'avatar stylisé.
- `design/prototype/launch_mobile_prototype.html` sert **uniquement à comprendre les parcours et les interactions** ; son style, sa disposition, son code et ses composants ne doivent **pas** servir de modèle visuel. Les anciennes planches ont été exclues du pack car leur rendu ne convient pas.
- **Ne pas cloner un collage pixel par pixel** : traduire ses intentions en composants propres, cohérents et adaptatifs. Si image et règle métier divergent, `AGENTS.md`, cahier des charges et `docs/08_navigation_et_ecrans.md` prévalent sur le contenu fictif des images.
- V1 navigation basse **4 onglets** Accueil, Collections, Activités, Profil ; CTA `+ Activité` accessible. Le 5e onglet Avatar visible dans certaines images est une **vision future** et ne doit pas être exposé comme fonction active en V1.
- Construire des composants React réutilisables, design tokens, états vides/erreurs/chargement, zones tactiles >= 44px, safe-area iPhone, contrastes, `prefers-reduced-motion`. Vérifier 360/375/390/430px.

## Architecture et sécurité

- Stack : React, TypeScript strict, Vite, Tailwind, shadcn/ui, React Router, TanStack Query, Zod, Supabase Auth/PostgreSQL/Storage privé/Edge Functions, Vitest, Playwright. Préférer open source et offres gratuites.
- Dossiers par fonctionnalités : `src/features/{auth,imports,activities,cards,collections,reveals,profile}` ; `src/components/ui`, `src/lib`, `supabase/migrations`, `supabase/functions`, `tests`.
- Logique métier pure séparée du parsing, accès réseau, composants UI et des adapters de fichiers.
- Unit system SI, timestamps UTC, IDs stables et migrations SQL versionnées.
- RLS et GRANT/REVOKE ; service-role jamais dans frontend ni dans le dépôt. Fichiers sportifs et GPS dans bucket privé, sans URLs publiques ni traces GPS détaillées dans logs.
- Ne jamais écrire en production directement sans revue explicite. En développement, privilégier migrations locales/testées, puis application au projet `launch-dev` avec autorisation. Pas de `db reset` ou d'opération destructrice sur une base distante sans accord.
- Ne jamais créer de vraies boutiques, abonnements, moyens de paiement, marque sponsorisée ou fonctions sociales sans ticket dédié et autorisation.

## Livraison des tickets

1. Un ticket ou une tranche verticale à la fois. Lire sa description et ses critères d'acceptation.
2. Annoncer brièvement plan/fichiers concernés et modifier uniquement le périmètre demandé.
3. Couvrir états vides, erreurs, chargement, mobile et accessibilité.
4. Ajouter tests nécessaires ; lancer `typecheck`, `lint`, `test`, `build` (et E2E si la route est concernée).
5. Rapporter résultats observés, fichiers modifiés, migrations, variables nécessaires et limitations. Ne jamais dire « testé » sans avoir exécuté le test.
6. Ne pas considérer les captures conceptuelles comme des ressources 3D ou des images de carte individuelles prêtes pour production.

## Points à ne pas trancher sans demande

Seuils exacts des cartes, quotas et conservation des sources, calcul XP et niveaux, règles commerciales et preuve requise pour classements futurs. Les valeurs d'exemple dans maquettes et specs sont de la **donnée fictive ou de la configuration proposée**.
