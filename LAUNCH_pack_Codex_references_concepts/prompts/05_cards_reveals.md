# PROMPT 05 — Cartes, collections et reveals (après import fonctionnel)

Exécute LAU-013 à LAU-018 en tickets distincts.

- Moteur de récompenses pur, déterministe, versionné, sans dépendance à la source d'import ; seuils proposés configurables.
- Une carte jalon unique par utilisateur, attribution transactionnelle serveur et journal d'origine.
- Quatre collections visibles, y compris vides ; cartes verrouillées, raretés, détails et récompense de complétion.
- Reveal initial groupé après premier batch (top rares + récap), reveal quotidien uniquement pour nouvelles cartes ; skip, reduced-motion, reprise après fermeture, 0 carte sans écran de reveal.
- Animations discrètes sur interface normale ; animation plus ludique uniquement durant la révélation.
- Reprocessing futur sans réimport possible tant que l'activité et les données nécessaires ont été conservées.
- Tests anti-doublons, 1/30 cartes, interruptions de reveal, accessibilité et mobile 360/390 px.

Rapporte les modifications et les tests réellement exécutés. Ne modifie pas les seuils sans ticket de game design.
