# Launch — instructions de développement

Lire et respecter intégralement `LAUNCH_pack_Codex_references_concepts/AGENTS.md`, puis son README et les documents de spécification. Les chemins `docs/` et `design/` cités dans le pack sont relatifs à ce pack. Ses concepts visuels ont priorité ; le prototype HTML sert seulement aux interactions.

L’application React est à la racine. Commandes : `npm ci`, `npm run dev`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.

Auth Supabase et profils privés réels ; cartes/activités toujours fictives. Voir `docs/auth-and-profiles.md`. Aucun moteur d’attribution dans le client. Ne jamais introduire de secret dans une variable `VITE_*`. Utiliser le checkout existant, sans worktree sauf demande explicite.
