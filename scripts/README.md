# Scripts de déploiement — Ferme RCA

Deux scripts qui automatisent la mise en production : backend sur **Railway**, frontend sur **Cloudflare Pages**. Configuration recommandée pour ce projet (latence Afrique acceptable, ~10–15 USD/mois).

## Pré-requis (à faire une seule fois)

### 1. Comptes hébergeurs

- Crée un compte sur [railway.app](https://railway.app) (free tier puis 5 $/mois "Hobby")
- Crée un compte sur [cloudflare.com](https://www.cloudflare.com) (Pages = gratuit illimité)

### 2. CLIs

```bash
npm install -g @railway/cli wrangler
```

### 3. Migration baseline Prisma (1re mise en prod uniquement)

```bash
cd backend
npx prisma migrate dev --name baseline_initial --create-only
npx prisma migrate resolve --applied baseline_initial
git add prisma/migrations && git commit -m "chore: baseline Prisma"
```

---

## Déploiement complet (5 commandes)

```bash
# 1. Backend + Postgres sur Railway (≈ 5 min, automatique)
./scripts/deploy-railway.sh

# 2. Récupère l'URL Railway dans la sortie, ex :
#    https://ferme-rca-production.up.railway.app

# 3. Frontend statique sur Cloudflare Pages (≈ 3 min)
./scripts/deploy-cloudflare.sh https://ferme-rca-production.up.railway.app

# 4. Migration Prisma sur la BDD de prod
cd backend && railway run npx prisma migrate deploy

# 5. Seed initial (comptes admin/responsable/ouvrier/investisseur)
railway run npm run seed
```

À la fin tu auras :
- API : `https://<projet>.up.railway.app`
- App : `https://<projet>.pages.dev`

---

## Que font les scripts en détail

### `deploy-railway.sh`

| Étape | Action |
|-------|--------|
| 0 | Vérifie `railway` CLI + structure projet |
| 1 | `railway login` si pas de session |
| 2 | `railway init` si pas de projet lié |
| 3 | Provisionne Postgres (`railway add --database postgres`) |
| 4 | Injecte `JWT_SECRET` (64 octets aléatoires), `NODE_ENV=production`, `PORT=3001` |
| 5 | `railway up --detach` (build + déploiement) |
| 6 | Crée le domaine public `<projet>.up.railway.app` |
| 7 | Affiche les commandes pour la migration Prisma |

**Idempotent** : peut être relancé sans casser ce qui existe (skippe les étapes déjà faites).

### `deploy-cloudflare.sh`

| Étape | Action |
|-------|--------|
| 0 | Vérifie `wrangler` + URL API fournie |
| 1 | `wrangler login` si pas de session |
| 2 | Crée `mobile/.env.local` avec `EXPO_PUBLIC_API_URL` |
| 3 | `npx expo export --platform web` (régénère `mobile/dist/`) |
| 4 | **Patch** `dist/agropilot-app.html` : remplace la déduction dynamique d'`API_BASE` par l'URL absolue Railway (sinon le HTML appellerait Cloudflare au lieu du backend) |
| 5 | `wrangler pages deploy dist` |

---

## Mise à jour du déploiement

Les deux scripts peuvent être relancés à volonté pour pousser une nouvelle version :

```bash
# Code backend changé → redéploie Railway
./scripts/deploy-railway.sh

# HTML/RN changé → rebuild + redéploie Cloudflare
./scripts/deploy-cloudflare.sh https://<projet>.up.railway.app

# Schéma BDD changé → migration
railway run npx prisma migrate deploy
```

Pour aller plus loin, configure le déploiement automatique sur push :
- Railway : Settings → GitHub → Connect → auto-deploy à chaque push sur `main`
- Cloudflare Pages : Settings → Builds & deployments → Connect to Git → branch `main`, build command `cd mobile && npx expo export --platform web --output-dir dist`, output directory `mobile/dist`

---

## Configuration CORS prod (à faire une fois)

Avant le 1er déploiement, mets à jour `backend/src/index.ts` :

```typescript
// Remplace
app.use(cors())
// Par
app.use(cors({
  origin: [
    'https://ferme-rca.pages.dev',         // Cloudflare Pages
    'https://app.agropilot.fr',             // Domaine custom si applicable
  ],
  credentials: true,
}))
```

Puis redéploie : `./scripts/deploy-railway.sh`

---

## Domaines custom (optionnel)

### Cloudflare Pages

1. Cloudflare Dashboard → Pages → ton projet → **Custom domains** → Set up a custom domain
2. Renseigne `app.agropilot.fr`, suis les instructions (ajout enregistrement CNAME)
3. SSL automatique via Cloudflare en quelques minutes

### Railway

1. Railway Dashboard → ton projet → Settings → **Domains** → Add custom domain
2. Renseigne `api.agropilot.fr` → Railway te donne un CNAME à pointer
3. SSL automatique via Let's Encrypt

Puis mets à jour les variables :
- Frontend : `EXPO_PUBLIC_API_URL=https://api.agropilot.fr`
- Backend : ajoute `https://app.agropilot.fr` à la whitelist CORS

---

## Coûts estimés

| Service | Free tier | Hobby/Starter | À surveiller |
|---------|-----------|---------------|--------------|
| Railway (backend + Postgres) | ~5 $ de crédit/mois pendant 30 jours | 5 $/mois (5 GB BDD, 8 GB RAM) | Trafic, taille BDD |
| Cloudflare Pages | Gratuit illimité | — | 500 builds/mois max |
| Domaine `.fr` ou `.com` | — | ~10 €/an chez OVH/Gandi | À renouveler |
| **Total** | **0** au démarrage | **~5–10 USD/mois** stable | |

---

## En cas de problème

```bash
# Logs backend en direct
railway logs --tail

# Variables d'env actuelles
railway variables

# État du déploiement Cloudflare
wrangler pages deployment list --project-name ferme-rca

# Rollback à un déploiement précédent
wrangler pages deployment list --project-name ferme-rca   # noter l'id
wrangler pages deployment activate <id> --project-name ferme-rca
```

Et bien sûr, le bouton **« ⬇ Télécharger sauvegarde SQL »** de l'IHM Déploiement avant tout redéploiement risqué.
