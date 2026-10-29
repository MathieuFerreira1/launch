# Initialiser Launch V1 : frontend mobile et écrans de démonstration

Le dépôt ne contenait que le pack de conception. Cette PR ajoute une application React/TypeScript/Vite navigable, structurée par fonctionnalités, avec six écrans de démonstration inspirés des concepts prioritaires : accueil, collections, carte, activités, import et profil.

La navigation comporte quatre onglets et un CTA d’ajout. Tailwind/shadcn, Query, Router, SDK Supabase, états d’interface, illustrations vectorielles originales et composants préparatoires de reveal sont en place. Aucun appel ni changement Supabase ; aucune migration. L’import est limité à une sélection locale explicitement identifiée comme telle et l’authentification reste une session de démo.

Validation : typecheck, lint, 4 tests Vitest et build réussis. 10 tests Playwright réussis sur 360/375/390/430 px et bureau ; détails et captures dans `docs/implementation-review.md`. L’authentification réelle, le parsing/ingestion et les récompenses serveur feront l’objet de missions séparées.
