# CI/CD — agri-pilot.com

Workflows GitHub Actions inspirés du setup `fast-aiglion`, adaptés à l'architecture existante d'agri-pilot (Express + PM2 + Cloudflare Pages, **pas** Docker).

---

## Vue d'ensemble

| Workflow | Fichier | Déclencheurs | Rôle |
|---|---|---|---|
| **CI** | `.github/workflows/ci.yml` | PR, push `main` | Typecheck backend (avec `prisma generate`) + typecheck/lint mobile |
| **Deploy** | `.github/workflows/deploy.yml` | Push `main`, `workflow_dispatch` | SSH vers Hetzner, exécute `scripts/deploy-server.sh` |

Le script `scripts/deploy-server.sh` reste la source de vérité : il gère le backup BDD, le rollback automatique, les healthchecks, le redeploy Cloudflare. GitHub Actions n'est qu'un **déclencheur supplémentaire** — l'UI admin (`/api/admin/deploy`) continue de fonctionner en parallèle.

---

## CI — `ci.yml`

Deux jobs en parallèle :

- **backend** : `npm ci` → `prisma generate` (indispensable, sinon le typecheck casse sur les imports du client généré dans `src/generated/prisma`) → `npm run typecheck`.
- **mobile** : `npm ci` → `npx tsc --noEmit` → `npm run lint` (en `continue-on-error` pour l'instant).

Node 20 sur les deux runners, cache npm par lockfile.

---

## Deploy — `deploy.yml`

Un seul job qui :

1. Checkout (utile pour les logs / éventuels futurs upload d'artefacts)
2. Installe la clé SSH (`SSH_PRIVATE_KEY`) dans `~/.ssh/id_ed25519`, ajoute l'host à `known_hosts`
3. SSH vers `SSH_USER@SSH_HOST`, `cd DEPLOY_DIR`, exécute `bash scripts/deploy-server.sh`

Le script côté serveur fait le reste : backup BDD → git pull → backend build → `pm2 reload agri-pilot-api` → mobile build → `wrangler pages deploy` → tests prod. Rollback automatique en cas d'échec.

`concurrency` empêche deux déploiements simultanés.

---

## Secrets GitHub à configurer

Dans **Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Valeur | Notes |
|---|---|---|
| `SSH_PRIVATE_KEY` | Contenu d'une clé privée OpenSSH | Doit pouvoir se connecter au serveur Hetzner. Générer une clé dédiée GitHub Actions (`ssh-keygen -t ed25519 -f gh-actions -C "gh-actions@agri-pilot"`) et coller sa pubkey dans `~/.ssh/authorized_keys` de l'utilisateur cible. |
| `SSH_HOST` | IP ou DNS du serveur | Ex. `1.2.3.4` ou `agri-pilot.com` |
| `SSH_USER` | Utilisateur SSH | Celui qui possède `~/apps/ferme-rca/` |
| `DEPLOY_DIR` | Chemin absolu | Ex. `~/apps/ferme-rca` ou `/home/agri/apps/ferme-rca` |

Et l'environnement protégé `production` (Settings → Environments → New environment → `production`) — utile pour ajouter une protection « required reviewers » si tu veux qu'un déploiement attende une approbation manuelle.

---

## Comment déclencher

**Automatique** : tout push sur `main` lance `ci.yml` puis `deploy.yml`. Si CI échoue, le déploiement passe quand même (les workflows sont indépendants — à durcir plus tard avec `needs:` si on veut un gating strict).

**Manuel** : onglet Actions → workflow « Deploy » → « Run workflow » → branche `main`.

**Depuis l'UI admin** : toujours disponible via `/api/admin/deploy` (route Express existante).

---

## Cohabitation avec l'UI admin

`scripts/deploy-server.sh` utilise un mécanisme de marqueurs (`::STEP::`, `::OK::`, `::FAIL::`) pour communiquer avec le backend Express. Quand le script est lancé via SSH par GitHub Actions, ces marqueurs apparaissent simplement dans les logs Actions — aucun effet de bord côté UI.

Le `concurrency: deploy-production` garantit qu'un déploiement GH Actions et un déploiement UI admin ne tournent pas en même temps **côté GH Actions**. Si tu veux empêcher un déclenchement simultané UI admin + push main, ajoute un lock côté script (ex. `flock /tmp/agripilot-deploy.lock`).

---

## Comparaison rapide avec fast-aiglion

| | fast-aiglion | agri-pilot.com |
|---|---|---|
| Build des images | Docker → GHCR | aucun (build sur serveur) |
| Reverse proxy | Caddy (TLS Let's Encrypt) | Cloudflare + Nginx |
| Rollback | `docker compose` retag manuel | automatique via `deploy-server.sh` |
| Migrations DB | `prisma migrate deploy` dans le workflow | gérées dans le script (rétrocompatible via `db push`) |
| Frontend | container Next.js | Cloudflare Pages via wrangler |

Le CI est très proche (lint + typecheck Node 20). Le CD est volontairement plus mince côté workflow puisque toute la logique est déjà dans le script bash serveur.
