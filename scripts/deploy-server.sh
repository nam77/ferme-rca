#!/usr/bin/env bash
#
# Script de déploiement complet AGROPILOT, exécuté côté serveur Hetzner
# par le backend Express via /api/admin/deploy.
#
# AUCUN paramètre user accepté : le script est lancé tel quel et ne lit
# que des variables d'environnement de confiance (DATABASE_URL,
# CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_PAGES_PROJECT).
#
# Émet des marqueurs sur stdout pour que l'orchestrateur backend puisse
# parser la progression :
#   ::STEP::<id>           début d'étape
#   ::OK::<id>             étape réussie
#   ::FAIL::<message>      échec, sortie immédiate (exit 1)
#   ::PROGRESS::<id>::<n>  pourcentage optionnel
#   tout autre stdout      log libre, à afficher tel quel à l'utilisateur.
#
# CWD attendu : racine du repo (~/apps/ferme-rca/).
#
set -uo pipefail

step()    { echo "::STEP::$1"; }
ok()      { echo "::OK::$1"; }
fail()    { echo "::FAIL::$1"; exit 1; }
log()     { echo "[$(date +%H:%M:%S)] $*"; }
masque()  { sed -E 's#://[^:]+:[^@]+@#://***:***@#g'; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
MOBILE_DIR="$ROOT_DIR/mobile"

[ -f "$BACKEND_DIR/.env" ] || fail "backend/.env introuvable"
# shellcheck disable=SC1091
set -a; source "$BACKEND_DIR/.env"; set +a

[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL absente du .env"

# ─────────────────────────── 1. Backup BDD ───────────────────────────
step backup-db
BACKUP_DIR="$HOME/backups-deploy"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
log "pg_dump → $BACKUP_FILE"
if ! pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2> >(masque >&2); then
  fail "Échec pg_dump"
fi
TAILLE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup OK ($TAILLE)"
# Conserver les 10 derniers backups
ls -1t "$BACKUP_DIR"/backup_*.sql 2>/dev/null | tail -n +11 | xargs -r rm -f
ok backup-db

# ─────────────────────────── 2. Git pull ─────────────────────────────
step git-pull
cd "$ROOT_DIR"
BRANCHE=$(git branch --show-current)
log "Branche : $BRANCHE"
HEAD_AVANT=$(git rev-parse --short HEAD)
log "HEAD avant : $HEAD_AVANT"
git fetch --quiet origin || fail "git fetch a échoué"
N=$(git rev-list --count "HEAD..origin/$BRANCHE")
log "Commits à appliquer : $N"
if [ "$N" -gt 0 ]; then
  git --no-pager log --oneline "HEAD..origin/$BRANCHE" | head -20
  git pull --ff-only --quiet origin "$BRANCHE" || fail "git pull non fast-forward (rebase manuel requis)"
fi
HEAD_APRES=$(git rev-parse --short HEAD)
log "HEAD après : $HEAD_APRES"
ok git-pull

# ─────────────────────────── 3. Backend deps ─────────────────────────
step backend-deps
cd "$BACKEND_DIR"
log "npm ci..."
npm ci --include=dev --no-audit --no-fund 2>&1 | tail -3
log "prisma generate (CRITIQUE — sans ça le build TS échoue)..."
npx prisma generate 2>&1 | grep -E "Generated|Error|error" || true
log "prisma db push (rétrocompatible)..."
npx prisma db push --skip-generate 2>&1 | grep -E "in sync|error|warn" || true
ok backend-deps

# ─────────────────────────── 4. Backend build ────────────────────────
step backend-build
log "tsc..."
if ! npm run build 2>&1 | tail -10; then
  fail "Build TypeScript a échoué"
fi
[ -f dist/index.js ] || fail "dist/index.js manquant après build"
ok backend-build

# ─────────────────────────── 5. PM2 reload ───────────────────────────
step backend-reload
log "pm2 reload agri-pilot-api..."
pm2 reload agri-pilot-api 2>&1 | tail -3 || fail "pm2 reload a échoué"
sleep 3
log "Test /api/sante..."
if ! curl -sf -m 5 http://localhost:3001/api/sante > /dev/null; then
  fail "Backend ne répond pas après reload"
fi
log "Backend OK"
ok backend-reload

# ─────────────────────────── 6. Frontend deps ────────────────────────
step frontend-deps
cd "$MOBILE_DIR"
if [ ! -d node_modules ]; then
  log "Première installation npm ci mobile (peut prendre 2-3 min)..."
fi
npm ci --include=dev --no-audit --no-fund 2>&1 | tail -3
ok frontend-deps

# ─────────────────────────── 7. Frontend build ───────────────────────
step frontend-build
log "Nettoyage dist..."
rm -rf dist
log "expo export (~1-2 min)..."
EXPO_PUBLIC_API_URL="https://api.agri-pilot.com" \
  EXPO_PUBLIC_HTML_URL="https://agri-pilot.com" \
  npx expo export --platform web 2>&1 | tail -10
[ -d dist ] || fail "dist/ non créé"
NB=$(find dist -type f | wc -l)
log "Bundle : $NB fichiers"
[ "$NB" -lt 50 ] && fail "Bundle anormalement petit ($NB fichiers)"
URL_API_OCC=$(grep -c "api.agri-pilot.com" dist/_expo/static/js/web/*.js | head -1 | cut -d: -f2)
log "Occurrences api.agri-pilot.com : $URL_API_OCC"
[ "${URL_API_OCC:-0}" -lt 1 ] && fail "URL API absente du bundle"
ok frontend-build

# ─────────────────────────── 8. Cloudflare deploy ────────────────────
step frontend-deploy
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || fail "CLOUDFLARE_API_TOKEN manquant dans .env"
[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || fail "CLOUDFLARE_ACCOUNT_ID manquant dans .env"
PROJET="${CLOUDFLARE_PAGES_PROJECT:-agri-pilot-v2}"

# Copie hors-repo pour éviter le filtrage .gitignore parent par wrangler
TMP_DIST=$(mktemp -d /tmp/cf-pages-XXXXXX)
trap 'rm -rf "$TMP_DIST"' EXIT
log "Copie dist → $TMP_DIST"
cp -r dist/. "$TMP_DIST/"
NB_TMP=$(find "$TMP_DIST" -type f | wc -l)
log "Fichiers à uploader : $NB_TMP"

log "wrangler pages deploy → $PROJET..."
if ! CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
     CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" \
     npx --yes wrangler@latest pages deploy "$TMP_DIST" \
       --project-name="$PROJET" \
       --branch=main \
       --commit-dirty=true 2>&1 | tail -20; then
  fail "Upload Cloudflare a échoué"
fi
ok frontend-deploy

# ─────────────────────────── 9. Tests prod ───────────────────────────
step tests-prod
sleep 3
log "GET https://agri-pilot.com..."
HTTP_FRONT=$(curl -s -o /dev/null -w "%{http_code}" -m 10 https://agri-pilot.com)
log "→ $HTTP_FRONT"
[ "$HTTP_FRONT" = "200" ] || fail "Frontend prod : HTTP $HTTP_FRONT"

log "GET https://api.agri-pilot.com/api/sante..."
HTTP_SANTE=$(curl -s -o /dev/null -w "%{http_code}" -m 10 https://api.agri-pilot.com/api/sante)
log "→ $HTTP_SANTE"
[ "$HTTP_SANTE" = "200" ] || fail "API sante : HTTP $HTTP_SANTE"

log "POST https://api.agri-pilot.com/api/cra/photo (attendu 401)..."
HTTP_CRA=$(curl -s -o /dev/null -w "%{http_code}" -m 10 -X POST https://api.agri-pilot.com/api/cra/photo)
log "→ $HTTP_CRA"
[ "$HTTP_CRA" = "401" ] || fail "Route CRA photo : HTTP $HTTP_CRA"

ok tests-prod

# ─────────────────────────── DONE ────────────────────────────────────
step done
log "Déploiement complet RÉUSSI ($HEAD_AVANT → $HEAD_APRES)"
ok done
