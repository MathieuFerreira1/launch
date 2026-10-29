# LAUNCH — Carte des 23 écrans de conception et correspondance technique

Le prototype UX contient 23 écrans dont les 13 premiers relèvent du cœur de V1 (certaines routes reçoivent des sous-écrans complémentaires pour rendre les parcours réels). Les 10 autres illustrent la vision future et ne doivent pas être publiés comme fonctionnalités effectives dans le MVP. **Pour leur APPARENCE, utiliser les concepts `design/concepts/` et la matrice `design/REFERENCES_VISUELLES_PRIORITAIRES.md`, et non les écrans du prototype HTML.**

| # | Écran de la maquette | Route / contexte proposé | V1 ? | Action/état à prévoir |
|---|---|---|---|---|
| 01 | Bienvenue | `/` | Oui | Présenter, CTA inscription, connexion |
| 02 | Inscription | `/auth` | Oui | Supabase Auth, erreurs, CGU/mentions |
| 03 | Import massif | `/onboarding` puis `/import` | Oui | Sélection ZIP/FIT/GPX/TCX multiple, passer |
| 04 | Analyse des activités | `/import/:batchId/analyze` | Oui | Progression réelle, annuler, warnings |
| 05 | Reveal initial | `/reveal/:sessionId` | Oui | Résumé groupé, skip, accès collection |
| 06 | Accueil | `/app` | Oui | Dernière carte, résumé 4 sports, ajout activité |
| 07 | Collections | `/collections` | Oui | 4 catégories visibles, même vides |
| 08 | Collection Running | `/collections/running` (route générique `:slug`) | Oui | Grille possédées/verrouillées, progression |
| 09 | Détail carte | `/cards/:cardId` | Oui | Critères, rareté, origine si autorisée |
| 10 | Activités | `/activities` | Oui | Historique filtrable, sources, sports inconnus |
| 11 | Détail activité | `/activities/:id` | Oui | Résumé, preuve, correction sport et validation |
| 12 | Ajouter activité | `/activities/new` et `/activities/import` | Oui | Fichier ou saisie déclarative, vérification |
| 13 | Reveal quotidien | `/reveal/:sessionId` | Oui | Nouvelles cartes seulement, reprise possible |
| 14 | Avatar | futur `/avatar` | Non | Personnage, niveau, XP, items équipés |
| 15 | Vestiaire | futur `/avatar/wardrobe` | Non | Catégories de vêtements et coloris |
| 16 | Mon vélo | futur `/avatar/bike` | Non | Éléments interchangeables, couleurs |
| 17 | Goodies / boutique | futur `/items` | Non | Distinguer mérités, cosmétiques, commerciaux |
| 18 | Détail objet premium | futur `/items/:id` | Non | Source du droit, prix éventuel, vérifications |
| 19 | Défis | futur `/challenges` | Non | Challenges configurés et règle de preuve |
| 20 | Amis | futur `/friends` | Non | Consentement, permissions, privacy |
| 21 | Profil d'un ami | futur `/users/:id` | Non | Seulement données explicitement partageables |
| 22 | Mon profil | `/profile` | Oui | Compte, statistiques personnelles, préférences |
| 23 | Paramètres | `/settings` | Oui | Consentement fichiers, données, suppression |

## Navigation MVP

```text
Accueil ─ Collections ─ Activités ─ Profil
  │             │         │          │
  ├ Cartes      ├ Sport   ├ Détail    └ Paramètres
  ├ Reveal      └ Carte   ├ Import / Saisie
  └ + Activité             └ Revue import
```

**Important :** certains visuels de vision affichent une barre 5 onglets avec `Avatar`, `Plus` ou `Importer`. En production V1, la décision de navigation fixée est quatre onglets. Ajouter un CTA d'import/activité flottant ou contextualisé, sans remplacer `Activités` dans le shell V1.

## Comportements de chaque parcours

### Onboarding + import

1. Authentification ou redirection depuis la bienvenue.
2. Onboarding sans sélection de sport ; import facultatif et pouvant être relancé plus tard.
3. Choisir plusieurs fichiers ou ZIP ; contrôle local ; progress réel (pas de fake progress) ; annulation possible.
4. Revue des anomalies et des doublons probables ; correction de sport incertain.
5. Confirmation du stockage privé selon politique explicitée ; transfert par lots reprenables.
6. Après commit et attribution côté serveur, reveal initial groupé ; si 0 carte, afficher fin d'import sans écran de découverte trompeur.

### Import quotidien

Ajout de nouveaux fichiers via un flux identique ; si de nouvelles cartes, reveal quotidien à l'ouverture ou après traitement ; sinon simple succès d'import. Une fermeture pendant le reveal n'annule ni l'activité ni l'attribution. Le clic sur une carte l'ouvre sans démarrer l'animation de nouveau de manière intempestive.

### Saisie manuelle

État `self_reported` explicite ; date, sport, distance, durée et D+ optionnel ; info « activité déclarée, non certifiée ». La logique future de classement et des goodies de marque n'utilise pas aveuglément ces données.

### Futures fonctionnalités (maquettes seulement)

Avatar 3D à proportions fixes, inventaire, équipements par slot ; vélo comme véhicule modulaire, gamification XP non définie. Boutique ne vend jamais les cartes d'exploit ; séparer `achievement_reward` et `cosmetic_entitlement`. Amis/défis et partenariats exigent confidentialité, licence, anti-fraude et preuve d'activité avant développement.

## États attendus / recette

Pour les pages V1 : chargement, vide, erreur serveur, hors-ligne, données partielles, session expirée, longue liste, accessibilité clavier, réduction des animations. Aucun bouton purement décoratif en version produit. Le prototype HTML et ses données sont **simulés**.
