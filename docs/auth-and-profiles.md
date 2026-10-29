# Mission 02 — Supabase Auth et profils privés

## Projet et périmètre

Projet de développement confirmé via l’API de gestion : **Launch dev**, ref `kephzbvcbmjzqqvqgtav`, région `eu-west-1`. Aucun projet de production utilisé.

Inscription email/mot de passe, confirmation par email, connexion, restauration/rafraîchissement des sessions par le SDK, déconnexion de la session courante, récupération PKCE et changement du mot de passe. Le profil connecté est lu et modifié dans Supabase. Les cartes, activités et leurs compteurs restent des fixtures et sont identifiés comme tels. La démo sans compte reste accessible, mais ne lit jamais de profil réel.

## Configuration frontend

Copier `.env.example` vers `.env.local`, ignoré par Git :

- `VITE_SUPABASE_URL=https://kephzbvcbmjzqqvqgtav.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` : clé **publishable** ou ancienne clé **anon** depuis les paramètres API Supabase.

Le fichier local de cet environnement a été renseigné avec la clé publique du projet via l’API de gestion, sans la journaliser. Redémarrer Vite après tout changement d’environnement. Le client refuse les clés `sb_secret_*`, les JWT portant un rôle autre que `anon` et les jetons de gestion. Ne jamais utiliser `SUPABASE_ACCESS_TOKEN` ou `service_role` dans une variable `VITE_*`.

Le secret `SUPABASE_ACCESS_TOKEN` reste réservé aux commandes de gestion dans Codex Cloud. Ni les tests CI ni le bundle n’en ont besoin. Les tests Playwright utilisent un domaine fictif et une clé publique de test, avec réponses HTTP simulées ; ils ne ciblent pas launch-dev.

## Migration appliquée

`supabase/migrations/20261029000100_profiles_and_sports.sql` :

- `profiles.user_id`, PK/FK vers `auth.users`, pseudo facultatif unique/minuscule, nom affiché, URL d’avatar HTTPS facultative, biographie, dates serveur UTC.
- Trigger de création de profil lors d’une inscription ; backfill des comptes préexistants sans remplacer leurs données.
- Trigger de mise à jour de `updated_at`. Fonctions dans un schéma privé, `search_path` fixé et accès direct retiré.
- RLS propriétaire sur les profils. `authenticated` peut lire son profil et modifier uniquement `handle`, `display_name`, `avatar_url`, `bio` ; pas d’INSERT/DELETE, pas de modification des IDs ou dates. Aucun accès anonyme aux profils.
- `sports` extensible, sans enum figé côté base : Running, Trail, Vélo, Natation actifs. Catalogue actif lisible, aucune écriture client. Aucun choix de sports à l’inscription.

Vérification préalable locale sur PostgreSQL embarqué (PGlite), puis transaction distante intégralement annulée. Application additive sur launch-dev, en une transaction, avec inscription dans `supabase_migrations.schema_migrations`. Tests RLS distants rejoués après application ; les deux comptes fixtures et leurs changements sont annulés. Aucune donnée existante supprimée.

Le runner `scripts/supabase-dev.py` utilise l’API de gestion autorisée plutôt qu’un accès PostgreSQL TCP non configuré. Il vérifie le nom **et** la ref exacte. Il refuse de réappliquer une version déjà enregistrée. Les changements du schéma applicatif sont exclusivement dans le fichier de migration ; le runner maintient seulement l’historique standard de l’outil.

```sh
# Avant la première application, transaction annulée :
python3 scripts/supabase-dev.py validate
# Déjà exécuté sur launch-dev — ne pas rejouer :
python3 scripts/supabase-dev.py apply
# Rejouable : fixtures annulées, sans besoin de clé service_role :
python3 scripts/supabase-dev.py test
```

## Sécurité vérifiée

`supabase/tests/auth_profiles.sql` est exécuté dans PostgreSQL local et sur launch-dev. Assertions pour deux identités A/B, rôle anonyme et identité expirée :

- profil créé automatiquement, lecture/édition de son propre profil ;
- aucune lecture ou édition de celui d’autrui ;
- refus des écritures des identifiants/dates, insertions et suppressions de profils ;
- mise à jour serveur de la date, pseudo unique, rejet de pseudo invalide et d’URL d’avatar dangereuse ;
- catalogue actif uniquement, refus des INSERT/UPDATE/DELETE des sports ;
- aucune invocation directe de la fonction privée et aucun compte fixture persistant.

Les tests du provider vérifient restauration, expiration, erreur initiale, désabonnement et absence de rétablissement d’une session obsolète après déconnexion. Les redirections après connexion restent sur l’origine courante. Les messages de récupération/confirmation sont neutres. Les caches privés sont vidés aux changements d’identité. Le backend RLS est la frontière de sécurité : la protection React ne la remplace pas.

## Configuration Auth effectuée et étapes manuelles

Sur launch-dev : inscription email et confirmation email conservées ; minimum du mot de passe porté de 6 à 12 ; Site URL local `http://localhost:5173` ; redirections ajoutées sans retirer les précédentes :

- `http://localhost:5173/auth/callback`
- `http://localhost:5173/auth/update-password`
- `http://127.0.0.1:5173/auth/callback`
- `http://127.0.0.1:5173/auth/update-password`

Pour une adresse de preview/hébergement réelle, ajouter les deux chemins exacts à l’allowlist Supabase Auth et adapter Site URL. Le flux PKCE impose d’ouvrir le lien dans le navigateur qui a initié la demande.

L’environnement Codex Cloud autorise actuellement l’API de gestion mais a refusé l’accès HTTP au domaine du projet. L’ajout réseau `kephzbvcbmjzqqvqgtav.supabase.co` a été enregistré dans le brouillon de configuration, sans publication automatique. Enregistrer cet accès dans les paramètres de l’environnement pour permettre les essais Auth réels depuis cette machine.

La délivrance réelle des emails de confirmation/récupération n’a pas été validée. Vérifier le SMTP, l’expéditeur, les limites de débit et les restrictions du service email Supabase par défaut. Aucun email de test envoyé à un tiers. Une recette avec deux comptes email de développement sera nécessaire après configuration réseau et SMTP. Aucun compte test persistant n’a été créé.

L’avatar est une URL HTTPS facultative, pas un upload. Son chargement est annoncé comme externe et utilise `referrerPolicy="no-referrer"`. Les politiques Storage et le téléversement d’avatars restent hors de cette mission. Mentions légales/consentements et suppression/export du compte restent des travaux distincts avant une ouverture au public.

## Résultats de recette de cette mission

- Typecheck et ESLint : réussis, aucune erreur ni avertissement ESLint.
- Vitest : **14 tests réussis**, 8 fichiers, dont l’intégration PostgreSQL exécutant les assertions RLS.
- Suite SQL distante : validation avant application, puis tests après application réussis ; **0 utilisateur fixture résiduel** vérifié.
- Build : réussi. Vite signale un chunk de 667 Ko minifié (environ 195 Ko gzip) après ajout du SDK ; découpage différé des dépendances à envisager avant production, sans masquer l’avertissement.
- Playwright : **29 tests réussis sur 30** lors de la passe complète. Le seul échec était une erreur de protocole Chromium système à `page.reload` (`Not attached to an active page`), sans assertion métier échouée. Ce cas exact a été rejoué seul avec un worker : **1/1 réussi**. Les 30 scénarios ont ainsi été validés, dont les 20 parcours Auth/profil sur cinq formats. Aucun retry automatique ni assertion désactivée.
- Captures [connexion](screenshots/auth-login.png), [inscription](screenshots/auth-signup.png) et [profil éditable](screenshots/auth-profile.png) à 390 px inspectées : tokens, surfaces et navigation Mission 01 conservés.

## Cloudflare Workers Builds / previews

Le Worker Cloudflare associé au dépôt est `launch-dev`. La configuration `wrangler.jsonc` déclare les assets Vite dans `dist`, le fallback SPA pour les liens directs React Router (`/auth/callback`, `/profile`, etc.) et un bloc `previews` pour la commande `npx wrangler preview` configurée sur les branches de PR. Wrangler est épinglé dans les dépendances de développement pour éviter de télécharger une version différente à chaque build.

Commandes Cloudflare : build `npm run build`, preview de branche `npx wrangler preview`. La commande de déploiement principal existante est à conserver ; aucune publication manuelle effectuée par les commandes de validation ci-dessous.

```sh
npm run build
npm run check:cloudflare
```

La seconde commande prépare le déploiement en `--dry-run` sans jeton ni publication. Elle est aussi exécutée par la CI. Les variables publiques `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` doivent être disponibles **au moment du build Cloudflare**, puis la nouvelle URL de preview doit être autorisée dans les redirections Supabase Auth si l’authentification y est testée. Ne pas ajouter de clé service_role ou de jeton de gestion dans la configuration Wrangler ou dans les variables `VITE_*`.
