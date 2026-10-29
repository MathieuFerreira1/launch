# PROMPT 04 — Développer l'import massif (après auth, schema et RLS)

Exécute LAU-007 à LAU-012 et LAU-020 (saisie manuelle) en tickets distincts. Priorité au pipeline réel avant les animations.

- ZIP, FIT, GPX, TCX et fichiers multiples ; analyse locale dans Worker ; mesure/limites contre archive hostile.
- Normaliser date UTC, sport original, sport reconnu, distance m, durée s, dénivelé m, niveau de preuve, source et métadonnées utiles.
- Conserver les activités des sports futurs, et sources brutes avec consentement et quotas ; UI de correction pour sport ambigu.
- Doublons stricts automatiques, doublons probables présentés à l'utilisateur ; réimports idempotents.
- Confirmation avant commit, upload Storage privé, ingestion serveur par lots reprenables ; progrès réels.
- Saisie manuelle distincte `self_reported`, sans prétendre qu'elle est certifiée.
- Fixtures >200 activités et cas pathologiques ; tests de robustesse, RLS, reprises après coupure réseau.

Ne développe pas de Garmin, Strava, paiements ou avatar 3D.
