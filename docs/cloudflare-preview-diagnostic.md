# Diagnostic des previews Cloudflare — 30 octobre 2026

## Résultats observés

- Le client attend exactement `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`. URL HTTPS (HTTP localhost autorisé), clé publishable ou ancienne clé anon uniquement. Une configuration absente ou rejetée provoque le message avant tout appel Supabase.
- `vite.config.ts` ne change ni le préfixe `VITE_`, ni le dossier d’environnement, ni le mode selon la branche. `npm run build` exécute TypeScript puis `vite build`, donc le mode `production`, pour les deux types de déploiement.
- `wrangler.jsonc` publie les assets de `dist` avec fallback SPA. `previews: {}` active les previews. Aucune compilation personnalisée ni environnement `preview` n’y est déclaré. `npx wrangler preview` publie les assets ; `npm run preview` sert localement le bundle et ne le compile pas.
- Les variables de **Settings > Build > Variables and secrets** sont des entrées de compilation. Les variables/bindings **Previews Base** concernent l’exécution du Worker et ne remplacent pas les chaînes déjà intégrées au JavaScript Vite. Les changements de configuration nécessitent un nouveau build.
- La CI GitHub construit une version de démonstration sans identifiants. Elle ne déploie pas ces assets vers Cloudflare. Playwright reconstruit un bundle de test avec des paramètres synthétiques et ne le publie pas non plus.

## URL, commit et version déployée

L’historique des éditions du commentaire Cloudflare sur la [PR #3](https://github.com/MathieuFerreira1/launch/pull/3#issuecomment-6508661242) confirme ces déploiements du commit `fb581c9d54626c159da4a89ef57094a97ab14bd1`, dernier commit distant au début du diagnostic :

| URL de version                                               | Déploiement (Europe/Paris) |
| ------------------------------------------------------------ | -------------------------- |
| `https://7cc0c7a7-launch-dev.mathieu-ferreira18.workers.dev` | 29 octobre 2026, 22 h 23   |
| `https://5d5e084c-launch-dev.mathieu-ferreira18.workers.dev` | 29 octobre 2026, 22 h 41   |
| `https://e790fabb-launch-dev.mathieu-ferreira18.workers.dev` | 30 octobre 2026, 7 h 30    |

L’URL signalée par l’utilisateur est donc une ancienne version, malgré un commit identique. Un ajout de variables ou un nouveau build ne la met pas à jour. Utiliser l’[alias de branche](https://feat-bulk-activity-import-launch-dev.mathieu-ferreira18.workers.dev/auth), puis le nouveau lien indiqué par Cloudflare à chaque déploiement.

Les requêtes HTTP de cet environnement vers les pages Cloudflare renvoient 403, et la CLI Wrangler n’a pas de session Cloudflare. Les métadonnées GitHub sont accessibles. Les valeurs et la portée effective des variables dans le dashboard n’ont donc pas été inspectées : aucune affirmation de connexion Supabase réussie sur la preview n’en découle.

## Contrôle ajouté

`npm run build` affiche une ligne `[launch:build]` avec le mode, le SHA public et seulement ces états :

```json
{
  "mode": "production",
  "commit": "<SHA complet fourni par Workers Builds>",
  "VITE_SUPABASE_URL": "present",
  "VITE_SUPABASE_PUBLISHABLE_KEY": "present",
  "supabasePublicConfig": "valid"
}
```

Ni valeur, ni longueur, ni empreinte de clé, ni environnement complet ne sont journalisés. Le chargement utilise `loadEnv` avec le mode et la priorité Vite habituels, dont les variables du processus et `.env.local` localement. La validation partagée avec le navigateur évite des critères divergents.

- Dans Workers Builds (`WORKERS_CI=1`, variable standard Cloudflare), une configuration absente ou invalide arrête la compilation avant publication.
- Dans tout build, une clé fournie avec une configuration invalide arrête également la compilation. Les clés secrètes/service-role ne doivent jamais être intégrées au bundle.
- Une démo locale ou GitHub sans clé reste possible.
- Le SHA validé de `WORKERS_CI_COMMIT_SHA` (ou `GITHUB_SHA`) est inséré dans `<meta name="launch-commit">`. Il peut être comparé au commit de la branche sans afficher de paramètres Supabase.

## Correction minimale et vérification

1. Ouvrir l’alias de branche plutôt que `7cc0c7a7-…`. Recharger la page pour récupérer son HTML actuel.
2. Laisser **Build command = `npm run build`** et **Preview command = `npx wrangler preview`**. Refaire un build après les changements de variables. Aucun ajout de clé dans Wrangler ou le dépôt.
3. Dans les logs du nouveau build, chercher `[launch:build]`. Si un paramètre est `missing`, vérifier sa présence et sa portée dans **Build**, pour ce Worker/projet et ce build. Si les deux sont `present` mais le résultat est `invalid`, vérifier format HTTPS et type de clé publique, sans copier les valeurs dans un ticket ou un log.
4. Comparer le SHA de la ligne et de la balise HTML au SHA de la branche. Une ancienne URL de version ne permettra pas de valider la correction.

Les logs de build se trouvent sur le job lié par le commentaire Cloudflare. `observability.logs` concerne les invocations du Worker et n’est pas nécessaire à ce diagnostic. Aucune activation payante ni journalisation d’invocations n’a été ajoutée.

Aucun secret, binding ou paramètre du dashboard modifié ; aucune requête ni modification de la base Supabase.

Validation exécutée : TypeScript, ESLint, **30 tests Vitest**, **45 tests Playwright**, build et dry-run Wrangler réussis. Des builds contrôlés avec des valeurs synthétiques ont aussi vérifié le refus d’une configuration Cloudflare absente, le refus d’une clé privée sans fuite dans les logs, et l’injection des seuls paramètres publics et du SHA dans un build valide.

Sources officielles : [configuration Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [configuration Previews](https://developers.cloudflare.com/workers/previews/configuration/). Leur contenu a été consulté via le dépôt public officiel `cloudflare/cloudflare-docs`.
