# Lessons Learned — Déploiement agri-pilot

Capitalisation des problèmes rencontrés lors du déploiement initial
(mai 2026 — backend Hetzner VPS `https://api.agri-pilot.com`,
frontend Cloudflare Pages `https://agri-pilot.com`).

## 1. URL API en `localhost` en prod web

**Symptôme** — Network Error au login depuis le frontend en production.
Côté DevTools, la requête tape `http://localhost:3001/api/auth/connexion`
au lieu de `https://api.agri-pilot.com/api/auth/connexion`.

**Cause** — `mobile/src/api/client.ts` exposait :

```ts
export const URL_API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'
```

Les variables `EXPO_PUBLIC_*` sont **figées dans le bundle au moment du
`npx expo export`**. Si la variable n'est pas définie au build, le
fallback `localhost` est cuit dans le `dist/_expo/static/js/web/*.js` et
chaque visiteur de `agri-pilot.com` essaie de joindre **son propre**
`localhost:3001` (qui n'existe pas).

**Fix** — `client.ts` détecte désormais le contexte d'exécution :

- Variable injectée au build → on l'utilise.
- Variable absente + `Platform.OS === 'web'` + hostname ≠ `localhost`
  → `console.error` explicite (avec l'origine actuelle et la commande à
  lancer pour rebuilder).
- Sinon → fallback dev `localhost` / `10.0.2.2` conservé.

L'app ne crashe pas au boot mais le diagnostic devient évident côté
DevTools : « EXPO_PUBLIC_API_URL non définie au build web. Le frontend
(origine https://agri-pilot.com) ne pourra pas joindre le backend ».

**Prévention future**

- Le script `scripts/deploy-cloudflare.sh` génère déjà un `mobile/.env.local`
  juste avant `npx expo export`. Vérifier que la variable y est présente
  avant chaque déploiement.
- Sur Cloudflare Pages CI : ajouter `EXPO_PUBLIC_API_URL` dans
  *Settings → Environment variables → Production* AVANT le premier build.
- Un check post-build à ajouter dans le script :
  `grep -c "api.agri-pilot.com" dist/_expo/static/js/web/*.js` doit
  retourner > 0, sinon `exit 1`.

## 2. Bundle web déployé obsolète

**Symptôme** — La boîte « Comptes de démonstration » s'affichait sur
`agri-pilot.com` alors qu'elle avait été retirée du code source 2 jours
plus tôt. Le formulaire de connexion arrivait pré-rempli avec
`admin@ferme.rca` / `admin123`.

**Cause** — Décalage de timestamp :

- `mobile/app/connexion.tsx` modifié le **5 mai à 15:34** (clean fait).
- `mobile/dist/index.html` daté du **3 mai à 18:54** (build pré-clean).

Le `dist/` uploadé manuellement via le dashboard Cloudflare contenait
l'ancien bundle. Comme `dist/` est dans `.gitignore` (ce qui est correct),
il n'y a aucun garde-fou Git qui aurait pu détecter l'écart.

**Fix immédiat** — Rebuild et re-upload :

```bash
cd mobile
rm -rf dist/
EXPO_PUBLIC_API_URL=https://api.agri-pilot.com \
EXPO_PUBLIC_HTML_URL=https://agri-pilot.com \
npx expo export --platform web
wrangler pages deploy dist --project-name agri-pilot
```

**Prévention future**

- Ajouter un script `npm run deploy:web` dans `mobile/package.json` qui
  enchaîne `rm -rf dist && npx expo export --platform web && wrangler pages deploy`.
- Mieux : faire fonctionner le CI Cloudflare Pages auto sur push (cf. § 3),
  comme ça le bundle déployé suit toujours la dernière commit `main`.
- À court terme, ajouter un check dans le script de déploiement :
  comparer `git log -1 --format=%ct -- mobile/app mobile/src` (timestamp
  du dernier commit code) à `stat -c %Y dist/index.html` (mtime du
  bundle). Si écart > 0 → refuser le upload.

## 3. Build CI Cloudflare Pages incomplet — polices manquantes

**Symptôme** — Le `dist/` produit par le build CI Cloudflare Pages est
partiel : `dist/assets/node_modules/@expo-google-fonts/dm-sans/...`
ne contient pas tous les `.ttf` attendus. Conséquence : `usePolices()`
reste bloqué sur `false` → l'app stagne sur le spinner initial.
Le build local (même commit, même `package-lock.json`) génère
correctement tous les TTF.

**Workaround actuel** — On contourne en buildant **localement** puis en
uploadant via `wrangler pages deploy dist` (Worker `agri-pilot-v1`).

**Cause — pas encore confirmée**. Il faut récupérer les logs complets du
build CF avant de patcher. Hypothèses à vérifier dans cet ordre :

1. **Version Node sur Cloudflare CI**
   Cloudflare Pages utilise Node 18 par défaut (juin 2026). Expo 54 +
   React 19 + Metro récent recommandent Node 20+. Vérifier dans le
   dashboard CF → *Settings → Build & deployments → Build configuration*
   qu'on a bien `NODE_VERSION=20` (ou 22). Une variante Node peut
   amener Metro à bypasser certains modules sans erreur visible.

2. **`package-lock.json` présent et committé**
   `npm ci` exige `package-lock.json`. S'il manque, `npm` retombe en
   mode permissif et peut omettre des sous-paquets. Vérifier
   `git ls-files mobile/package-lock.json` localement et dans le repo
   distant.

3. **Build command exacte dans le dashboard CF**
   Doit être strictement :
   ```
   cd mobile && npm ci && npx expo export --platform web
   ```
   avec output directory `mobile/dist`. Une version sans `--platform web`
   ou avec `npm install` (au lieu de `ci`) peut produire un bundle
   inattendu.

4. **OOM silencieux pendant l'export**
   Le bundling Expo + 18 polices `.ttf` à hasher est gourmand. Cloudflare
   Pages a une limite de RAM par worker de build qui peut être atteinte
   sans que l'erreur remonte clairement. Tester avec
   `NODE_OPTIONS=--max-old-space-size=4096` dans les variables CF.

5. **Cache CF qui réutilise un build foiré**
   Cloudflare met en cache `node_modules` entre les builds. Si un build
   antérieur a installé partiellement `@expo-google-fonts/dm-sans`, le
   cache le rejoue. Forcer un rebuild propre : *Settings → Builds →
   Clear cache → Retry deployment*.

6. **Folders dont le nom commence par un chiffre**
   `400Regular/`, `200ExtraLight/`, `100Thin/` — ces noms sont valides
   mais peuvent surprendre des linters/résolveurs custom. À écarter en
   dernier recours (le bundling local marche, donc Metro lui-même les
   gère bien).

**Plan d'investigation** :

```bash
# 1. Récupérer les logs du dernier build CF échoué
wrangler pages deployment tail --project-name agri-pilot
# ou via dashboard → Deployments → Build log

# 2. Identifier le moment où le build "réussit" sans toutes les polices
grep -E "dm-sans|dm-mono|fraunces" build.log | wc -l  # < attendu ?

# 3. Tester localement avec exactement la même commande CF
cd mobile && rm -rf node_modules dist
NODE_VERSION=18 npm ci  # reproduire la version CF
npx expo export --platform web
find dist -name "*.ttf" | wc -l  # attendu : 18
```

**Workaround tant que le CI n'est pas réparé** : conserver le déploiement
manuel via `scripts/deploy-cloudflare.sh` lancé localement. Ne PAS activer
le déploiement auto sur push tant que le bundle CF est incomplet.
