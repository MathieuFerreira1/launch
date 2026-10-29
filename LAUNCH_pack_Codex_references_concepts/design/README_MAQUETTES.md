# Launch — Concepts graphiques prioritaires et prototype UX

## Statut
Prototype de conception visuelle, **pas une application fonctionnelle**. Les données, cartes, statistiques, imports, XP et interactions de boutique sont fictifs. Aucun fichier sportif n'est analysé, aucun compte n'est créé, aucun paiement n'est réalisé.

## Direction graphique retenue

Inspirations de principes UX (pas reproduction) : produits sobres et lumineux de Marc Lou, ainsi que la progression des applications HeroFit et Habits Garden.

- Fond : `#FBFAF7` (ivoire clair)
- Cartes : `#FFFFFF`
- Texte principal : `#20201F`
- Secondaire : `#85837E`
- Accent : `#F36B45` (orange corail)
- Accent clair : `#FFF0E8`
- Bordure : `#EDEAE5`
- Rareté : commune neutre ; rare bleu `#4A92BB` ; épique violet `#9872AD` ; légendaire or `#E5AD47`
- Typographie : police système San Francisco / Inter / sans-serif, titres forts mais courts.
- Design : ombres faibles, séparations fines, peu de badges, une action principale par écran, pas de glow permanent.
- Gamification : cartes illustrées et coins arrondis, XP, niveaux, récompenses, inventaire, objets verrouillés, reveal plein écran mais sobre, confettis ponctuels.
- Mobile-first : iPhone ~390 px de large ; barre de navigation inférieure ; zones tactiles >= 44 px en implémentation finale.

## Hiérarchie des références (décision validée)

1. **`design/concepts/ecrans_individuels/` et `design/concepts/` : références visuelles prioritaires.** Respecter leur esprit de composition, leurs illustrations et leur niveau de sobriété.
2. **`design/REFERENCES_VISUELLES_PRIORITAIRES.md` : indique quelle image correspond à quelle page.**
3. **`design/prototype/launch_mobile_prototype.html` : navigation/interactions uniquement**, pas un guide de style.
4. Les anciennes planches de synthèse sont délibérément absentes : elles ne sont **pas** à reproduire.

## Naviguer

Ouvrir `design/prototype/launch_mobile_prototype.html` dans un navigateur. Sur ordinateur, utiliser le sommaire latéral ; sur iPhone, utiliser les boutons et onglets internes. Aucun service n'est nécessaire. Certaines fonctions se contentent d'afficher un message de démonstration.

## Inventaire des 23 écrans

### Parcours de départ — MVP
1. Bienvenue — proposition de valeur et première illustration/avatar.
2. Inscription — Apple, Google, e-mail (interactions simulées).
3. Import massif — ZIP, FIT, GPX, TCX, sélection multiple (ne traite pas les fichiers dans la maquette).
4. Analyse — distribution par sport, doublons et activités à vérifier.
5. Reveal initial — moment de découverte après le premier batch.

### Parcours principal — MVP
6. Accueil — carte récente, progression des 4 sports, avatar.
7. Collections — aperçu des quatre sports.
8. Collection Running — cartes débloquées/verrouillées, progression de catégorie.
9. Détail de carte — seuil, rareté, activité de référence.
10. Activités — liste de toutes les sorties.
11. Détail activité — chiffres et récompenses associées.
12. Ajouter une activité — fichiers et projet de saisie déclarative.
13. Reveal quotidien — carte après import ultérieur.

### Vision future — hors MVP
14. Avatar — niveau, barre d'XP, équipement.
15. Vestiaire — vêtements, chaussures et coloris. Le bouton de couleur modifie l'avatar de démonstration.
16. Mon vélo — vélo et cadre aux couleurs modifiables.
17. Goodies / boutique — accessoires mérités et cosmétiques/partenariats **conceptuels**.
18. Détail d'un objet premium — fiche fictive, aucun achat réel.
19. Défis — objectifs, progression, XP.
20. Amis — classement et liste.
21. Profil d'un ami — cartes publiques et avatar.
22. Mon profil — statistiques et raccourcis.
23. Paramètres — confidentialité, données, préférences.

## Règles produit à respecter pour implémentation Codex

- Aucun sport à choisir à l'inscription. Les collections Running, Trail, Vélo, Natation sont présentes par défaut.
- Tous les fichiers d'activités doivent être pris en compte, y compris les sports non encore supportés ; conserver les fichiers source selon une politique de confidentialité et quotas définis.
- Import massif multi-fichiers/ZIP, déduplication, traitement par lots, reprise sur erreur et synthèse avant confirmation.
- Saisie manuelle déclarative et import de fichier ont des niveaux de vérification distincts.
- Récompenses liées aux performances et non à des boosters aléatoires.
- Reveal initial groupé différent du reveal quotidien.
- Les cartes d'exploits ne sont pas payantes ; les cosmétiques sont distincts.
- Strava et Garmin ne sont **pas intégrés en V1**.
- Avatar, vélo, boutique, défis, amis sont des maquettes de vision, non des exigences MVP.
- Si des marques sont ajoutées, leurs noms/logos/produits nécessitent licence et accord ; le nom « Atelier Ride » de la maquette est fictif.
- Les cartes et les objets doivent rester accessibles aux utilisateurs avec réduction des animations.

## Prochaine étape pour Codex

Recréer **les visuels des concepts prioritaires** dans le vrai projet React/TypeScript : composants isolés, navigation React Router, design tokens CSS/Tailwind, responsive 360–430 px, authentification réelle et fixtures pour les écrans de démonstration. Le prototype HTML aide à comprendre les parcours, pas à copier sa mise en page. Commencer par les parcours MVP et écrire des tests d'interface. Ne **pas** reprendre telle quelle la logique du HTML de maquette pour la production : elle simule des données et n'a pas de backend.

## Références publiques de conception

- https://datafa.st/
- https://theherofit.app/
- https://habitsgarden.com/

Les écrans et visuels de Launch sont des propositions originales de conception. Les fonctionnalités et chiffres sont fictifs.
