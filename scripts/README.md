# Scripts de déploiement — Ferme RCA

Le déploiement de l'app AGROPILOT est **piloté depuis l'interface admin**
de l'application (`/deploiement` — réservée au rôle `admin`). Cette page
appelle `POST /api/admin/deploy` qui exécute `scripts/deploy-server.sh`
côté serveur Hetzner et streame la progression au navigateur via SSE.

## Architecture

```
Navigateur admin
   │
   │  POST /api/admin/deploy             (auth JWT admin)
   ▼
Backend Express  ──────►  spawn bash scripts/deploy-server.sh
   │                                  │
   │  EventSource SSE ◄────── stdout, marqueurs ::STEP::/::OK::/::FAIL::
   │
   │  Étapes orchestrées par le script :
   │    1. backup-db        (pg_dump → ~/backups-deploy/)
   │    2. git-pull         (origin/main, fast-forward seulement)
   │    3. backend-deps     (npm ci + prisma generate + db push)
   │    4. backend-build    (tsc)
   │    5. backend-reload   (pm2 reload, zéro downtime)
   │    6. frontend-deps    (npm ci dans mobile/)
   │    7. frontend-build   (expo export)
   │    8. frontend-deploy  (wrangler pages deploy)
   │    9. tests-prod       (curl GET / + POST /api/cra/photo)
   ▼
agri-pilot.com (frontend) + api.agri-pilot.com (backend)
```

## Pré-requis (à configurer une fois)

### 1. Variables d'environnement côté serveur

Dans `~/apps/ferme-rca/backend/.env` sur le VPS Hetzner :

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
CLOUDFLARE_API_TOKEN="..."        # token API avec UNIQUEMENT Pages:Edit
CLOUDFLARE_ACCOUNT_ID="..."        # visible en bas du dashboard Cloudflare
CLOUDFLARE_PAGES_PROJECT="agri-pilot-v2"
```

Le token Cloudflare se crée sur https://dash.cloudflare.com/profile/api-tokens
→ "Create Custom Token" → permission "Account / Cloudflare Pages / Edit"
sur le bon compte. Principe du moindre privilège : **rien d'autre**.

### 2. Outils sur le serveur

Le script attend `pg_dump`, `git`, `node`/`npm`, `pm2`, `npx`. Si c'est le
premier run frontend, `npm ci` dans `mobile/` télécharge ~700 Mo.

## Lancer un déploiement

### Via l'IHM (recommandé)

1. Pousser tes commits sur `origin/main`
2. Ouvrir https://agri-pilot.com → onglet **Déploiement** (admin only)
3. Cliquer **▶ Lancer le déploiement**
4. Suivre la progression en temps réel (étapes ✓/⏳/✗ + journal stdout)

### En CLI (debug ou fallback)

Connecté en SSH au serveur, depuis la racine du repo :

```bash
cd ~/apps/ferme-rca
bash scripts/deploy-server.sh
```

Ce mode est utile si l'IHM est cassée ou si on veut voir la sortie brute.
Mais aucun audit n'est enregistré dans `backend/logs/deployments/`.

## Sécurité

- Route `POST /api/admin/deploy` protégée par `verifierAuth` + `verifierRole(admin)`.
- Mutex global côté backend : un seul déploiement à la fois (HTTP 409 sinon).
- Le script ne reçoit **aucun paramètre du client** — il est exécuté tel quel.
- Le SSE accepte le JWT en query string (limitation `EventSource`) ; admin only.
- Chaque run est persisté dans `backend/logs/deployments/{runId}.json` avec
  l'email du déclencheur, l'horodatage, le statut de chaque étape et le journal.
- Backup automatique de la BDD avant toute migration. Les 10 derniers backups
  sont conservés dans `~/backups-deploy/` sur le serveur.

## Rollback en cas d'échec

### Backend cassé

```bash
ssh ferme@<IP>
cd ~/apps/ferme-rca
git reset --hard HEAD~1
cd backend && npm ci && npx prisma generate && npm run build
pm2 reload agri-pilot-api
```

### BDD corrompue après migration

```bash
ssh ferme@<IP>
ls ~/backups-deploy/                  # repérer le backup avant le run
psql "$DATABASE_URL" < ~/backups-deploy/backup_AAAAMMJJ_HHMMSS.sql
```

### Frontend cassé sur Cloudflare

Sur https://dash.cloudflare.com → projet `agri-pilot-v2` →
**Deployments** → cliquer les "..." d'un déploiement antérieur →
**Rollback to this deployment**. Pas de CLI nécessaire.

## Coûts

| Service | Plan | Coût mensuel |
|---|---|---|
| Hetzner CPX22 (backend + Postgres) | locatif | ~10 € |
| Cloudflare Pages | Free | 0 € |
| Domaine `agri-pilot.com` | OVH/Gandi | ~1 €/mois |
| **Total** | | **~11 €/mois** |
