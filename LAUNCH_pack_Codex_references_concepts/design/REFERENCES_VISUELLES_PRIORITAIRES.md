# LAUNCH — Références visuelles PRIORITAIRES pour Codex

> **Décision utilisateur** : les anciennes planches de synthèse ont un rendu insatisfaisant. **Les concepts graphiques sont désormais la source principale d'inspiration pour TOUTES les pages.** Elles ont été supprimées du pack pour éviter que Codex les recopie. Le HTML est uniquement un prototype de parcours.

## Ordre obligatoire de référence

1. **Concepts individuels haute résolution** `design/concepts/ecrans_individuels/` : **Accueil, Collection, Import**. Références de détail pour espacement, cartes, typographie, CTA et composantes.
2. **Concepts panoramiques** `design/concepts/01…05*.png` : composition, navigation et ambiance générale du reste des écrans, notamment **avatar, équipement, révélation, activités et profil**.
3. **Design system** `docs/07_design_system.md` : couleurs, accessibilité, composants, interactions, règles V1.
4. **Prototype HTML** `design/prototype/launch_mobile_prototype.html` : consultation pour **parcours, transitions et affordances seulement**. **Ne pas reprendre son design**.

## Index écran → référence graphique principale

Les chiffres « 1, 2, … » indiquent les écrans numérotés dans chaque planche-concept (pas un ordre de réalisation).

| Page | Statut | Référence visuelle à regarder en premier | Inspiration à conserver |
|---|---|---|---|
| Bienvenue | V1 | `01_onboarding_4_ecrans.png` écran 1, puis `03_avatar_vestiaire_et_collection.png` écran 1 | illustration sportive chaleureuse, titre fort, CTA orange |
| Connexion / inscription | V1 | `01_onboarding_4_ecrans.png` écran 2, ou `05_vues_completes_12_ecrans.png` écran 2 | formulaire très simple, espaces généreux |
| Import massif | V1 | `ecrans_individuels/import_massif_reference_detaillee.png`, puis `01_onboarding_4_ecrans.png` écran 3 | zone de sélection claire, multi-fichiers, orange parcimonieux |
| Analyse / revue | V1 | `01_onboarding_4_ecrans.png` écran 4, puis `05_vues_completes_12_ecrans.png` écran 4 | avancement compréhensible, répartition par sport |
| Reveal initial | V1 | `03_avatar_vestiaire_et_collection.png` écran 4, puis `05_vues_completes_12_ecrans.png` écran 5 | cartes illustrées et mise en scène aérienne |
| Accueil | V1 | `ecrans_individuels/accueil_reference_detaillee.png`, puis `03_avatar_vestiaire_et_collection.png` écran 5 | une carte principale, aperçu de collection, contenu respirant |
| Collections tous sports | V1 | `04_parcours_et_vision_sociale.png` écran 6, puis `03_avatar_vestiaire_et_collection.png` écran 6 | collections et filtres visibles sans surcharge |
| Collection d’un sport | V1 | `ecrans_individuels/collection_reference_detaillee.png`, puis `02_parcours_v1_avatar_details.png` écran 6 | belle grille de cartes, verrouillage, progression |
| Détail de carte | V1 | `02_parcours_v1_avatar_details.png` écran 7, puis `05_vues_completes_12_ecrans.png` écran 8 | illustration dominante, rareté et performance lisibles |
| Liste d’activités | V1 | `05_vues_completes_12_ecrans.png` écran 9 | liste légère, icônes, filtres et informations clés |
| Détail d’activité | V1 | `04_parcours_et_vision_sociale.png` écran 7 (fiche de performance), prototype pour champs | hiérarchie des métriques et éventuel parcours GPS privé |
| Ajouter/importer activité | V1 | `02_parcours_v1_avatar_details.png` écran 11, puis `04_parcours_et_vision_sociale.png` écran 11 | sélecteur Fichier / Manuel simple |
| Reveal quotidien | V1 | `02_parcours_v1_avatar_details.png` écran 13, puis écran 4 | mise en avant d’une carte, skip possible |
| Mon profil | V1 | `03_avatar_vestiaire_et_collection.png` écran 10, puis `05_vues_completes_12_ecrans.png` écran 12 | stats modérées, raccourcis et avatar (portrait 2D temporaire) |
| Paramètres | V1 | `02_parcours_v1_avatar_details.png` écran 15 | menus textuels, confidentialité clairement accessible |
| Avatar / niveau | FUTUR | `03_avatar_vestiaire_et_collection.png` écran 8, puis `05_vues_completes_12_ecrans.png` écran 10 | avatar stylisé, équipement lisible, XP discret |
| Vestiaire / personnalisation | FUTUR | `04_parcours_et_vision_sociale.png` écran 9, puis `03_avatar_vestiaire_et_collection.png` écran 9 | inventaire en grille et états équipé/verrouillé |
| Vélo personnalisable | FUTUR | `design/prototype/launch_mobile_prototype.html` pour **le parcours uniquement** ; pas de concept graphique vélo suffisamment précis dans ce pack | proposer une vue vélo 3D sobre de la même famille visuelle et demander validation avant réalisation |
| Goodies / objets | FUTUR | `04_parcours_et_vision_sociale.png` écran 10, puis `02_parcours_v1_avatar_details.png` écran 9 | inventaire, acquisition au mérite vs cosmétiques |
| Détail objet premium | FUTUR | `02_parcours_v1_avatar_details.png` écran 9 pour les tuiles, design-system pour détail | expliquer provenance, type d’accès, et marque fictive |
| Défis | FUTUR | `design/concepts` pour ambiance, `design/prototype` pour parcours | créer nouvelle proposition cohérente, pas de mécanique gamifiée non validée |
| Amis / communauté | FUTUR | `04_parcours_et_vision_sociale.png` écran 12 | liste claire, avatars, confidentialité |
| Profil d’ami | FUTUR | `04_parcours_et_vision_sociale.png` écran 8 pour profil, 12 pour social | information publique avec consentement |

## Ce qui est approuvé (style), ce qui ne l’est pas (données)

- **Approuvé** : light mode ivoire/blanc, orange corail, noir doux, espaces généreux, lignes fines, cartes sportives illustrées, avatar 3D stylisé plus tard, reveal ponctuellement ludique, objets cosmétiques lisibles et sobres.
- **Non approuvé / fictif** : montants, scores, XP, niveaux, badges exacts, nombre de cartes, temps de course, nom de marques et logos, intitulés de cartes erronés, règles de déblocage, intégration Garmin représentée dans des images, navigation à 5 onglets, promesses de type « import illimité ».
- **Décision produit V1** : 4 onglets **Accueil, Collections, Activités, Profil** ; pas de Garmin/Strava ; import massif puis import manuel de fichiers ; tous les sports capturés, 4 catégories récompensées ; pas d'avatar fonctionnel ni de boutique. Ne pas remplacer ces décisions par ce qui apparaît dans un concept.

## Méthode de travail demandée à Codex

1. Avant de coder un écran, identifier le concept correspondant à partir du tableau.
2. Reproduire **l’intention graphique**, pas chaque pixel : ajuster textes, composants, états responsives et accessibilité.
3. Construire des composants React natifs et des illustrations/assets distincts **avec droits adéquats** : une capture de concept n'est **pas** une image utilisable telle quelle dans l'app.
4. Capturer l’écran React à 390 px et le comparer au concept. Revoir espaces, densité, hiérarchie et touche gaming.
5. Documenter les écarts voulus et les arbitrages. Ne pas affirmer que l'écran est validé sans comparaison ni approbation si nouvelle direction artistique.
6. Concevoir les écrans FUTURS uniquement sur demande explicite ; ils constituent une référence de vision pour ne pas bloquer l’architecture V1.
