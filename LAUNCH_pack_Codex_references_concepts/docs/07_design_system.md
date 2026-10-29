# LAUNCH — Design system mobile-first (direction validée)

## 1. Principes

Produit **clair, épuré, accessible et légèrement ludique**. Interface quotidienne sobre ; moment de reveal, rareté et personnalisation plus expressifs. Inspiration de principes UX (HeroFit, Habits Garden, produits sobres de Marc Lou), **pas de copie d'interface, de logo ou de personnages**. **Les concepts graphiques de `design/concepts/` sont la référence visuelle principale** (détails et associations écran→image dans `design/REFERENCES_VISUELLES_PRIORITAIRES.md`). Le prototype HTML illustre uniquement les interactions, **pas le style à imiter**.

### À faire / à éviter

| À faire | À éviter |
|---|---|
| Blanc cassé, espacement généreux, ligne claire | Dark mode imposé, background violet, glow permanent |
| Accent orange pour CTA et sélection | Plusieurs couleurs vives concurrentes pour les actions |
| Une action principale par écran | Trop de blocs KPI et de badges en simultané |
| Cartes avec illustrations sportives fortes | Cartes réduites à un badge générique |
| Rarete visible sans confondre avec une vente | Fausses chances de drop ou boosters |
| Confettis et mouvement courts lors du reveal | Animation obligatoire interminable |
| Avatar stylisé et objets lisibles à petite taille (plus tard) | Complexité 3D/achat dans le MVP |

## 2. Tokens de référence

```css
:root {
  --color-bg: #FBFAF7;
  --color-surface: #FFFFFF;
  --color-ink: #20201F;
  --color-muted: #85837E;
  --color-accent: #F36B45;
  --color-accent-soft: #FFF0E8;
  --color-border: #EDEAE5;
  --color-cream: #F6F4EF;
  --color-positive: #4C977B;
  --color-rare: #4A92BB;
  --color-epic: #9872AD;
  --color-legendary: #E5AD47;
}
```

Vérifier les contrastes WCAG avant validation finale : certaines nuances ne doivent pas servir seules à des textes petits sur fond blanc. Typographie : Inter ou pile système gratuite. Les tailles et interlignages sont à fixer en rem/variables plutôt qu'en pixels rigides.

## 3. Layout / composants

- Largeur cible de design : 390 px ; test aussi à 360, 375, 430 px ; tablette et bureau adaptatifs sans « agrandir un mobile » aveuglément.
- Barre de navigation basse : 4 items V1 — Accueil, Collections, Activités, Profil. L'avatar devient un cinquième item seulement quand sa version fonctionnelle sortira.
- Safe-area `env(safe-area-inset-bottom)` et `env(safe-area-inset-top)` ; boutons >= 44 × 44 px, focus clavier visible et états pressés.
- Composants : `AppShell`, `BottomNavigation`, `PageHeader`, `PrimaryButton`, `QuietButton`, `CollectionProgress`, `SportChip`, `AchievementCard`, `LockedCard`, `ActivityRow`, `ImportDropzone`, `ImportProgress`, `ReviewIssue`, `RevealStage`, `EmptyState`, `InlineError`, `Modal`.
- Les cartes utilisent un ratio constant en grille (proposer 3:4 / 4:5 selon contenu), image recadrée avec focus stable et détails complets à l'ouverture.
- 1 CTA orange principal par écran ; actions secondaires neutres/outline.
- Aucune donnée visible dans la maquette (nom, 248 activités, 24 cartes, etc.) ne doit être codée en dur comme donnée réelle.

## 4. Système visuel des cartes

Cartes définies par catalogue : `card_id`, `sport_id`, `rarity`, `title`, `artwork_key`, `unlock_rule`, `version`. V1 : rareté commune/rare/épique/légendaire. Représentation : illustration sport + titre + badge discret de rareté + bordure/texture modulée (pas une interface full neon). Une carte verrouillée doit rester identifiable comme objectif et offrir la règle de déblocage, mais pas révéler des données sensibles d'autres comptes.

Les **images de concepts** ne constituent **pas** une banque d'illustrations séparées et ne sont pas des composants réutilisables. Employer placeholders originaux/ou des assets réellement licenciés avant commercialisation ; pouvoir changer d'image par clé sans migration DB.

## 5. Reveal : guide d'animation

- Reveal initial : compteur de cartes nouvellement attribuées, résumé par sport et rareté, mise en avant de quelques plus rares, puis accès à toute la collection ; jamais N animations imposées pour N cartes.
- Reveal ultérieur : 1 à quelques nouveautés, animation optionnelle de flip/scale/particules, puis accès au détail ; aucun reveal s'il n'y a pas de nouvelles cartes.
- Illustrations et progression restent compréhensibles sans mouvement (`prefers-reduced-motion`), option « Passer », gestion du retour, reprise depuis `reveal_sessions`.
- Les animations n'écrivent pas l'attribution ; elles ne modifient que l'état de présentation après action valide.

## 6. Consignes qualité visuelle

Captures Playwright sur iPhone 390×844 et au moins 360×780, revue des débordements, textos coupés, contraste, états à 0 cartes, 1 carte, 30 cartes, archives non valides. Éviter la fausse UX : boutons visuellement actifs sans action. Sur le web mobile, le drag-and-drop ne suffit pas : sélecteur de fichiers multiple accessible.
