# PROMPT 01 — Commencer LAUNCH avec Codex

Tu es responsable de la mise en place initiale de Launch V1 dans ce dépôt.

**Avant toute action** : lis `AGENTS.md`, `README.md`, puis `docs/01_cahier_des_charges.md`, `docs/02_architecture.md`, `docs/03_modele_donnees.md`, `docs/07_design_system.md`, `docs/08_navigation_et_ecrans.md`, `docs/09_plan_execution_codex.md`. **Lis impérativement `design/REFERENCES_VISUELLES_PRIORITAIRES.md` puis regarde les images de `design/concepts/` et `design/concepts/ecrans_individuels/` : ce sont les références visuelles principales.** Consulte `design/prototype/launch_mobile_prototype.html` seulement pour comprendre les enchaînements et interactions ; n'en copie ni la structure, ni les couleurs, ni la densité. Ne prends pas ses données fictives pour des données métier.

**Exécute LAU-001 + LAU-002 uniquement.**

- Initialise React + Vite + TypeScript strict, Tailwind CSS et shadcn/ui ; React Router, TanStack Query, Zod, Vitest, Playwright, ESLint, Prettier.
- Crée une architecture modulaire, les routes publiques/privées en mode démo et un shell responsive à **4 onglets V1 : Accueil, Collections, Activités, Profil**, avec CTA « + Activité ».
- Applique dès le début les tokens de `docs/07_design_system.md` : ivoire `#FBFAF7`, blanc, anthracite, orange corail `#F36B45`, bordures discrètes ; pas de néons ni de glow. Pour la **composition des écrans**, prends les concepts de `design/concepts` (et surtout les 3 vues individuelles) comme référence visuelle, **jamais les anciennes planches**.
- Crée une première version navigable **fictive**, clairement identifiée comme démo, des écrans bienvenue, inscription, accueil, collections, activités et profil. Les liens des écrans doivent fonctionner, même s'ils montrent un placeholder explicite.
- Pas de vraie Auth, pas d'import ZIP effectif, pas de schéma DB, pas d'avatar 3D, pas de boutique ni Garmin/Strava à ce stade.
- Crée les scripts `typecheck`, `lint`, `test`, `build` et une smoke E2E de navigation ; documente le lancement local et les variables d'environnement à prévoir (sans secrets).
- Vérifie les rendus 360 et 390 px, le focus clavier, l'absence de débordement et les états vides.

Rends un compte rendu des fichiers modifiés, des commandes réellement exécutées, de leurs résultats, et de ce qui reste à faire pour le ticket LAU-003. Ne commence pas d'autres tickets de ton propre chef.
