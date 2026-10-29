# PROMPT 02 — Implémenter le design Launch après l'initialisation

Une fois LAU-001 et LAU-002 validés, implémente LAU-003. Lis `docs/07_design_system.md`, `docs/08_navigation_et_ecrans.md` et **`design/REFERENCES_VISUELLES_PRIORITAIRES.md`**. **Observe les fichiers `design/concepts/` avant de programmer** ; l'accueil, la collection et l'import ont des vues individuelles détaillées dans `design/concepts/ecrans_individuels/`. Les collages complètent ces références pour les autres écrans. Le prototype HTML ne sert qu'aux interactions, pas au style ; les anciennes planches ne doivent pas être utilisées.

- Conçois des composants React réutilisables (ne recopie pas le HTML/JS fictif).
- Assemble les écrans V1 existants en thème clair ivoire/orange. Une action principale par écran. **Fidélité d'intention aux concepts** : tailles typographiques, respiration, cartes illustrées, hiérarchie, gamification discrète. Ne reproduis pas les erreurs ou chiffres fictifs des images.
- Avant la livraison, produis des captures de tes écrans V1, compare-les visuellement avec les concepts correspondants et décris les écarts ainsi que les choix pris. Ne déclare pas « conforme » sans comparaison.
- Prépare les composants CollectionProgress, AchievementCard (verrouillée/débloquée), ActivityRow, ImportDropzone (placeholder clairement non opérationnel), EmptyState, RevealStage de démonstration.
- N'active pas les écrans Avatar/Boutique/Amis/Défis en navigation principale : vision future seulement.
- Ajoute tests d'accessibilité élémentaires et captures Playwright à 360/390 px.
- Ne code ni data réelle ni Supabase tant que LAU-004/005/006 ne sont pas demandés.

Rends captures, résultats tests et liste des écarts visuels restant à ajuster.
