# Launch dev — Auth et profils

Projet : `kephzbvcbmjzqqvqgtav` (Launch dev). Migration additive `20261029000100_profiles_and_sports.sql` appliquée après validation locale et distante annulée.

Voir [`docs/auth-and-profiles.md`](../docs/auth-and-profiles.md) pour les droits, redirections Auth, commandes et limites de validation. Les tests SQL dans `tests/auth_profiles.sql` annulent systématiquement leurs fixtures. Aucun reset ni opération de production dans cette mission.

Mission 03 : migrations `20261029000200` à `20261029000500` appliquées uniquement sur launch-dev (imports, contrôle préalable Storage, cycle de suppression et garde-fous de classification). Documentation : [`docs/bulk-imports.md`](../docs/bulk-imports.md).

Mission 04 : migrations `20261030000100` et `20261030000200` appliquées après validation locale et distante annulée (catalogue, jobs, possessions, reveals, RLS et réconciliation auditable des justifications). Voir [`docs/cards-and-reveals.md`](../docs/cards-and-reveals.md). Tests SQL : `python3 scripts/supabase-dev.py test --mission rewards` et `--mission reward_proofs`. Aucun reset ni suppression de données existantes.
