# LAUNCH — Vision avatar, objets et monétisation (hors MVP)

## Objectif

Le sport améliore une identité virtuelle : les **cartes d'exploit** témoignent d'une performance réelle ; les **objets d'avatar et de vélo** offrent une représentation personnalisée et peuvent être gratuits, gagnés ou cosmétiques payants. Ne jamais vendre une carte attestant un exploit comme si elle avait été gagnée.

## Éléments prévus

- Avatar 3D stylisé, proportions fixes pour commencer, sélection de teintes et quelques tenues.
- Slots potentiels : haut, bas, chaussures, lunettes, casque, montre, sac ; items pouvant être verrouillés, possédés et équipés.
- Vélo : cadre/roues/coloris/accessoires, version modulaire à périmètre restreint initialement.
- Récompenses par exploits ou par collections ; XP et niveaux = **proposition future**, formules non validées.
- Goodies cosmétiques, contenus de saison, items des marques **seulement avec contrat/licence**.
- Défis, amis et affichage public uniquement selon consentement et droits de la source d'activité.

## Technologie envisagée (non figée)

`three` + `@react-three/fiber` + `@react-three/drei` pour le rendu, fichiers `glb/glTF`, modèles générés/assemblés via Blender scripts, éventuellement base de personnage sous licence commerciale claire. Codex peut automatiser des scripts/modèles simples ; il ne garantit pas la production artistique finale de vêtements parfaitement riggés sans revue humaine. Favoriser 1 personnage initial et variantes d'objets avant la personnalisation morphologique.

## Modèle conceptuel futur

`avatar_templates`, `cosmetic_items`, `item_assets`, `user_inventory`, `avatar_loadouts`, `bike_parts`, `user_bike_loadouts`, `brand_collections`, `entitlements`, `purchase_events` (futur). Garder ces entités conceptuelles **hors migrations V1** sauf nécessité technique démontrée.

## Contraintes futures

- Items `earned` et `paid_cosmetic` ont des règles d'attribution distinctes.
- Les microtransactions doivent être directes/transparentes, sans boosters aléatoires par défaut.
- Les marques ne reçoivent pas des données de performance individuelles pour du ciblage non autorisé ; licences pour logos et produits.
- Si version iOS native, examiner règles de paiement numérique, confidentialité et validation App Store avant d'implémenter.
- Optimisation 3D mobile : petit nombre de polygones, assets compressés, rendu différé, fallback statique, `reduced-motion`.
