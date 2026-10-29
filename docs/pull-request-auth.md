# Ajouter Supabase Auth et les profils privés sur launch-dev

Launch ne proposait qu’une session de démonstration. Cette PR ajoute les parcours email/mot de passe (inscription et confirmation, connexion, récupération PKCE, changement de mot de passe et déconnexion), la restauration des sessions, les routes protégées et l’édition du profil privé. Le design existant et les données fictives des cartes/activités sont conservés.

Migration additive `20261029000100_profiles_and_sports.sql` préparée et validée localement, puis dans une transaction annulée sur **Launch dev (`kephzbvcbmjzqqvqgtav`)**, avant application sur ce seul projet. Profils liés à `auth.users`, création automatique par trigger, horodatages serveur, RLS propriétaire et grants limités aux colonnes éditables. Catalogue extensible avec les quatre sports V1, actif en lecture seule. Aucune migration destructive, aucun moteur de cartes, aucun accès de production.

Validation : TypeScript, ESLint, 14 tests Vitest dont une intégration PostgreSQL, build et parcours Playwright Auth/profil/démo aux quatre largeurs mobiles et sur bureau. La suite SQL RLS a aussi été exécutée sur launch-dev après application : isolation A/B, accès anonyme et expiré, droits SQL, IDs/dates protégés, unicité du pseudo et URL d’avatar. Les fixtures ont été annulées ; absence de comptes de test résiduels vérifiée.

Les tests navigateur utilisent le SDK Supabase réel avec des réponses HTTP simulées, sans vrai email ni compte distant. Il reste à enregistrer l’accès réseau au domaine du projet dans Codex Cloud (ajout déjà sauvegardé dans le brouillon), vérifier le SMTP et tester les emails réels. Les redirections locales 5173 et le minimum de 12 caractères sont configurés sur launch-dev ; ajouter les URLs exactes du futur hébergement dans Supabase Auth.

Recette Playwright : 29/30 réussis dans la passe complète ; le cas restant a subi une erreur de protocole Chromium système puis a réussi seul (1/1). Aucune assertion supprimée. Le build émet un avertissement de taille de chunk (667 Ko minifié, environ 195 Ko gzip).

Documentation, commandes et limites : `docs/auth-and-profiles.md`. Captures Auth à 390 px : `docs/screenshots/auth-login.png`, `auth-signup.png` et `auth-profile.png`.
