# PROMPT 03 — Brancher Supabase en développement (après validation des fondations)

Lis `AGENTS.md`, `docs/02_architecture.md` et `docs/03_modele_donnees.md`. Exécute LAU-004 à LAU-006 par étapes séparées, sans modifier une base de production.

1. Préparer `.env.example` et config client avec seulement l'URL Supabase et la clé publique appropriée ; aucun secret réel dans Git.
2. Implémenter Supabase Auth, gestion session/erreurs, protections de routes.
3. Écrire les **migrations SQL versionnées** et seeds des 4 sports ; tests RLS/GRANT pour deux comptes.
4. Configurer Storage privé avec ownership et consentement de conservation.
5. Tester localement ou sur le projet Supabase de développement explicitement autorisé ; ne lancer aucune migration distante destructive sans demander la validation.

Compte rendu : schéma final, commandes/tests exécutés, sécurité vérifiée, secrets/config à mettre en place, limites et prochaine étape.
