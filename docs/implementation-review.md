# Revue — fondations Launch V1

## Périmètre

Tranche UI correspondant à LAU-001/002/003 et aux écrans explicitement demandés. React 19, Vite 8, TypeScript strict, Tailwind 4, primitive shadcn/ui Radix/CVA et configuration CLI, React Router, TanStack Query, SDK Supabase, Zod, Vitest, Playwright, ESLint, Prettier et workflow CI.

Le pack documentaire original est conservé sans déplacement ni modification. Le nouveau `AGENTS.md` racine renvoie à son contrat intégral. Le frontend est à la racine afin de disposer d’un seul package et lockfile.

## Comportement livré

- Accueil avec dernière carte, quatre collections, progression et action d’ajout.
- Collections filtrées par sport, grille de cartes obtenues/verrouillées et critères au détail.
- Historique filtrable, détail d’activité, sport futur conservé dans les fixtures et saisie déclarative explicitement étiquetée.
- Import : sélecteur multiple et drag-and-drop, inventaire local, signalement des extensions inconnues/fichiers vides, annulation. Analyse et téléversement désactivés.
- Profil fictif et sortie de démo ; bienvenue et routes protégées par une session de démonstration (pas une sécurité serveur).
- États vides/chargement/erreur réutilisables, signal hors-ligne, routes inconnues et cartes absentes.
- `RevealStage` reçoit des cartes déjà acquises, gère zéro carte, affichage groupé et possibilité de passer. Aucun moteur de récompenses ou persistance de reveal n’est livré.

## Comparaison visuelle effectuée

Les huit images de concepts ont été consultées, notamment les références individuelles Accueil, Collection et Import. Les captures React à 390 px des six écrans ont été inspectées et comparées : titres forts, espaces généreux, fond ivoire, cartes à ratio stable, grille à deux colonnes, zone d’import en pointillés, compteurs et liste d’activités sobres.

Écarts intentionnels :

- Quatre onglets V1 Accueil/Collections/Activités/Profil, malgré les barres à cinq onglets de certains concepts.
- Illustrations vectorielles originales simplifiées, sans extraction de captures, images tierces, marque ou asset 3D. Elles restent à valider avant production et sont remplaçables via `artwork`.
- Texte foncé sur bouton corail pour le contraste du texte courant ; orange foncé pour les petits liens et indicateurs actifs.
- Aucun XP, niveau, record ou récompense cumulative dont les règles ne seraient pas validées.
- Aucun faux compteur de fichiers analysés ni progression inventée dans l’import.
- Sur bureau, disposition à deux colonnes et navigation haute ; mobile avec barre basse et safe areas.

Captures : [accueil](screenshots/accueil.png), [collection](screenshots/collection.png), [carte](screenshots/carte.png), [activités](screenshots/activites.png), [import](screenshots/import.png), [profil](screenshots/profil.png). Les captures plein écran incluent la barre fixe à la position du viewport initial ; le contenu sous cette barre est accessible par défilement.

## Validation

- `npm run typecheck` : réussi.
- `npm run lint` : réussi.
- `npm test` : 3 fichiers, 4 tests réussis (inventaire, sélection/annulation, reveal vide, présentation et absence de mutation des possessions).
- `npm run build` : réussi ; bundle principal environ 112 Ko gzip.
- Playwright : parcours à 360, 375, 390, 430 px et bureau 1280 px ; 10 tests réussis, aucun échec.

Une première exécution Playwright a révélé un sélecteur de test ambigu entre le titre de carte et le H1. Le sélecteur cible désormais le H1 ; aucune assertion n’a été supprimée. Le typecheck a aussi conduit à supprimer `baseUrl`, déprécié par TypeScript 6, au profit de chemins relatifs explicites.

## Sécurité et limites

La démo n’effectue aucun appel Supabase, même si les variables publiques sont définies. Aucun secret, donnée de compte ou fichier utilisateur n’est demandé ou persisté. Aucune opération distante Supabase n’a été exécutée dans cette mission. Le token de gestion de l’environnement n’est jamais utilisé par le frontend.

L’authentification réelle, les migrations, RLS/GRANT, Storage privé, parsing Worker FIT/GPX/TCX/ZIP, doublons, ingestion transactionnelle et reprise de reveal restent des lots dédiés. L’interface de démo ne constitue pas le MVP complet ; les seuils de son catalogue sont des exemples à valider.
