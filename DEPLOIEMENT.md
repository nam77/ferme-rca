# Déploiement — Ferme Agropastorale RCA

Trois cibles à déployer : backend (Express + Postgres), web (Expo statique), natif (Android/iOS via EAS).

---

## 1. Backend Express + Postgres

### Variables d'environnement (production)

`backend/.env` :

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/ferme_rca"
JWT_SECRET="$(openssl rand -base64 64)"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=production
```

### Migration Prisma propre

En développement on a utilisé `prisma db push` pour aller vite. **Avant le premier déploiement** il faut créer une vraie migration baseline :

```bash
cd backend
# 1. Créer la première migration à partir du schéma actuel
npx prisma migrate dev --name baseline_initial --create-only
# 2. Marquer comme appliquée sur la BDD existante (sans rejouer)
npx prisma migrate resolve --applied baseline_initial
# 3. Vérifier
npx prisma migrate status
```

Pour la prod : `npx prisma migrate deploy` (rejoue toutes les migrations sur une BDD vide).

### Build + démarrage

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build         # → dist/
npm run start         # node dist/index.js
```

### Hébergeurs recommandés

| Plateforme    | Avantages                                 | Notes                                    |
| ------------- | ----------------------------------------- | ---------------------------------------- |
| **Railway**   | Postgres + Node tout-en-un, easy CI/CD    | Free tier limité, bascule en payant vite |
| **Render**    | Free tier permanent (cold start 30 s)     | Postgres séparé                          |
| **Fly.io**    | Edge, latence faible RCA, bon free tier   | Postgres via volume                      |
| **VPS (OVH)** | Plein contrôle, ~5 €/mois                 | Setup manuel (pm2, nginx, certbot)       |

---

## 2. Web (Expo statique)

L'app web est juste du HTML/JS statique : peut être déployée sur n'importe quel CDN.

### Variables d'environnement

`mobile/.env` :

```env
EXPO_PUBLIC_API_URL=https://api.agropilot.example.com
EXPO_PUBLIC_HTML_URL=https://app.agropilot.example.com/agropilot-app.html
```

### Build

```bash
cd mobile
npm ci
npx expo export --platform web
# → dossier dist/ contenant index.html, _expo/, agropilot-app.html, assets/, etc.
```

### Hébergement recommandé

| Plateforme            | Avantages                                       |
| --------------------- | ----------------------------------------------- |
| **Cloudflare Pages**  | CDN mondial, HTTPS auto, gratuit                |
| **Vercel**            | Détection auto Expo, preview deploys par PR     |
| **Netlify**           | Idem, simple                                    |
| **Same VPS**          | nginx servir `mobile/dist/` derrière le backend |

### Branchement backend

Le HTML embarqué (`agropilot-app.html`) lit `window.location.hostname` pour calculer `API_BASE`. En prod il faudra peut-être figer ça à l'URL du backend (rechercher `API_BASE = (() => {` dans le fichier).

---

## 3. Natif iOS / Android via EAS

### Prérequis

```bash
npm install -g eas-cli
eas login
cd mobile
eas init           # crée le projectId Expo
```

### Configuration

`mobile/eas.json` est déjà fourni avec 3 profils : `development`, `preview` (APK debug interne), `production` (AAB pour Play Store, IPA pour App Store).

`mobile/app.json` doit avoir un `package` (Android) et un `bundleIdentifier` (iOS) avant le premier build prod :

```json
"ios":     { "bundleIdentifier": "fr.agropilot.app" },
"android": { "package": "fr.agropilot.app" }
```

### Build de test (APK Android, gratuit, pas de compte Google Play requis)

```bash
cd mobile
eas build --platform android --profile preview
# → URL .apk à installer sur un téléphone
```

### Build production

```bash
# Android
eas build --platform android --profile production
eas submit --platform android  # nécessite un compte Google Play (25 $ une fois)

# iOS
eas build --platform ios --profile production
eas submit --platform ios       # nécessite un compte Apple Developer (99 $/an)
```

### App configuration prod

Définir les variables d'environnement EXPO_PUBLIC_* dans EAS :

```bash
eas env:create --environment production --name EXPO_PUBLIC_API_URL  --value https://api.agropilot.example.com
eas env:create --environment production --name EXPO_PUBLIC_HTML_URL --value https://app.agropilot.example.com/agropilot-app.html
```

---

## 4. Checklist avant la première mise en prod

- [ ] Générer un vrai `JWT_SECRET` aléatoire (`openssl rand -base64 64`)
- [ ] Changer les mots de passe des comptes seed (admin, responsable, ouvrier, investisseur)
- [ ] Remplacer `app.use(cors())` par une whitelist d'origines (`backend/src/index.ts`)
- [ ] Activer HTTPS (Cloudflare en frontal ou certbot sur VPS)
- [ ] Créer la migration baseline Prisma et la commiter
- [ ] Backup automatique Postgres (ex : `pg_dump` quotidien dans S3/Backblaze)
- [ ] Définir `EXPO_PUBLIC_API_URL` et `EXPO_PUBLIC_HTML_URL` côté EAS et build web
- [ ] Vérifier que l'iframe HTML utilise une URL absolue HTTPS pour `API_BASE`
- [ ] Tester les rôles : admin / responsable / ouvrier / investisseur
- [ ] Mode offline : tester un déplacement de carte avec backend coupé puis reconnexion

---

## 5. Architecture en production (recommandée)

```
┌──────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE / NGINX (HTTPS)                    │
│   app.agropilot.example.com   →   mobile/dist/   (statique)      │
│   api.agropilot.example.com   →   backend (port 3001 derrière)   │
└──────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
   ┌──────────────────┐              ┌────────────────────┐
   │ Backend Express  │   prisma     │ Postgres 16        │
   │ Node 20 + tsx    │ ───────────▶ │ (Railway/Render/   │
   │ port 3001        │              │  Fly.io ou managé) │
   └──────────────────┘              └────────────────────┘
                                              ▲
                                              │ pg_dump quotidien
                                              ▼
                                     ┌────────────────────┐
                                     │ Backup S3 / B2     │
                                     └────────────────────┘
```

Mobile natif (iOS/Android) attaque les mêmes URLs que la version web.
