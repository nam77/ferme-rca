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
#   ::FAIL::<message>      échec, sortie immédiate (rollback puis exit 1)
#   ::PROGRESS::<id>::<n>  pourcentage optionnel
#   tout autre stdout      log libre, à afficher tel quel à l'utilisateur.
#
# Garanties:
#   - Timeout par étape (l'étape ne peut pas se figer indéfiniment)
#   - Snapshot du HEAD git + dist/ backend avant tout changement
#   - Si une étape échoue OU si le processus reçoit SIGTERM, déclenche
#     un rollback automatique : git reset --hard, restauration dist,
#     pm2 reload, et si le frontend a déjà été publié, rebuild + redeploy
#     Cloudflare depuis le HEAD restauré.
#   - Le service en prod n'est jamais coupé : pm2 reload est gracieux
#     (zero-downtime) et n'arrive qu'à l'étape 5, après build OK.
#
# CWD attendu : racine du repo (~/apps/ferme-rca/).
#
set -uo pipefail

step()    { echo "::STEP::$1"; }
ok()      { echo "::OK::$1"; }
log()     { echo "[$(date +%H:%M:%S)] $*"; }
masque()  { sed -E 's#://[^:]+:[^@]+@#://***:***@#g'; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
MOBILE_DIR="$ROOT_DIR/mobile"

# État pour le rollback
HEAD_AVANT=""
DIST_BACKUP=""           # chemin vers le backup de backend/dist
FRONTEND_DEPLOYE=0       # 1 si l'étape Cloudflare a réussi (rollback frontend nécessaire)
ROLLBACK_EN_COURS=0      # garde-fou anti-récursion sur les traps
DEPLOIEMENT_REUSSI=0     # 1 quand toutes les étapes sont OK (désactive les traps)

# Timeouts (secondes) — généreux pour ne pas faire échouer un build lent,
# mais bornés pour ne jamais rester figé indéfiniment.
T_BACKUP=300       #  5 min
T_GITPULL=60       #  1 min
T_BACKEND_DEPS=300 #  5 min
T_BACKEND_BUILD=300 # 5 min
T_BACKEND_RELOAD=60 # 1 min
T_FRONT_DEPS=600   # 10 min (première install npm ci mobile peut être longue)
T_FRONT_BUILD=600  # 10 min
T_FRONT_DEPLOY=300 # 5 min
T_TESTS=60         # 1 min

# Retry de l'étape Cloudflare (erreurs réseau transitoires de l'API).
CF_DEPLOY_TENTATIVES=3 # nombre total d'essais de `wrangler pages deploy`
CF_DEPLOY_DELAI=10     # secondes d'attente entre deux essais

# ────────────────────────── Helpers exécution ─────────────────────────

# avec_timeout <secondes> <id-étape> -- <commande...>
# Lance la commande sous `timeout`. Retourne le code de sortie de la commande,
# ou 124 si timeout (signalé sur stderr). Ne JAMAIS appeler fail() ici : si
# avec_timeout est utilisé dans un pipeline, on est en sous-shell et le fail
# ne pourrait pas ramener l'état de rollback dans le shell parent. Le caller
# détecte l'échec via $? et appelle fail() lui-même.
# --kill-after=10 : si la commande ignore SIGTERM, SIGKILL après 10s.
avec_timeout() {
  local secs="$1"; shift
  local etape="$1"; shift
  if [ "$1" = "--" ]; then shift; fi
  local code=0
  timeout --kill-after=10 "${secs}" "$@" || code=$?
  if [ "$code" -eq 124 ] || [ "$code" -eq 137 ]; then
    echo "[TIMEOUT] étape '${etape}' dépassée après ${secs}s — processus tué" >&2
    return 124
  fi
  return "$code"
}

fail() {
  local msg="$1"
  echo "::FAIL::${msg}"
  declencher_rollback "$msg"
  exit 1
}

# ────────────────────────── Rollback ──────────────────────────────────

declencher_rollback() {
  local raison="${1:-inconnue}"
  if [ "$ROLLBACK_EN_COURS" -eq 1 ]; then
    log "Rollback déjà en cours, ignoré"
    return
  fi
  if [ -z "$HEAD_AVANT" ]; then
    # Rien n'a été modifié encore, pas besoin de rollback
    log "Aucun rollback nécessaire (snapshot non pris)"
    return
  fi
  ROLLBACK_EN_COURS=1

  step rollback
  log "Rollback déclenché : ${raison}"
  log "Restauration HEAD: ${HEAD_AVANT}"

  # 1) Restauration git
  cd "$ROOT_DIR"
  if ! git reset --hard "$HEAD_AVANT" 2>&1 | masque | tail -3; then
    log "AVERTISSEMENT: git reset a échoué"
  fi

  # 2) Restauration dist backend
  cd "$BACKEND_DIR"
  if [ -n "$DIST_BACKUP" ] && [ -d "$DIST_BACKUP" ]; then
    log "Restauration dist backend depuis ${DIST_BACKUP}"
    rm -rf dist
    cp -r "$DIST_BACKUP" dist
  else
    log "Pas de snapshot dist — reconstruction depuis HEAD restauré"
    timeout "${T_BACKEND_DEPS}" npm ci --include=dev --no-audit --no-fund 2>&1 | tail -3 || \
      log "AVERTISSEMENT: npm ci rollback échoué"
    timeout 60 npx prisma generate 2>&1 | grep -E "Generated|Error|error" || true
    timeout "${T_BACKEND_BUILD}" npm run build 2>&1 | tail -5 || \
      log "AVERTISSEMENT: build rollback échoué"
  fi

  # 3) pm2 reload pour que le backend prod reparte sur l'ancienne version
  log "pm2 reload agri-pilot-api..."
  timeout "${T_BACKEND_RELOAD}" pm2 reload agri-pilot-api 2>&1 | tail -3 || \
    log "AVERTISSEMENT: pm2 reload rollback a échoué"
  sleep 2
  if curl -sf -m 5 http://localhost:3001/api/sante > /dev/null; then
    log "Backend OK sur ancienne version"
  else
    log "ALERTE: backend ne répond pas après rollback — intervention manuelle requise"
  fi

  # 4) Rollback frontend Cloudflare si on avait déjà publié
  if [ "$FRONTEND_DEPLOYE" -eq 1 ]; then
    log "Rebuild + redeploy frontend depuis HEAD restauré"
    cd "$MOBILE_DIR"
    rm -rf dist
    if timeout "${T_FRONT_BUILD}" bash -c \
        'EXPO_PUBLIC_API_URL="https://api.agri-pilot.com" \
         EXPO_PUBLIC_HTML_URL="https://agri-pilot.com" \
         npx expo export --platform web' 2>&1 | tail -5; then
      local TMP_RB
      TMP_RB=$(mktemp -d /tmp/cf-rollback-XXXXXX)
      cp -r dist/. "$TMP_RB/"
      if timeout "${T_FRONT_DEPLOY}" env \
          CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}" \
          CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}" \
          npx --yes wrangler@3 pages deploy "$TMP_RB" \
            --project-name="${CLOUDFLARE_PAGES_PROJECT:-agri-pilot-v2}" \
            --branch=main --commit-dirty=true 2>&1 | tail -10; then
        log "Frontend restauré sur Cloudflare"
      else
        log "ALERTE: redeploy Cloudflare a échoué — l'ancienne version reste accessible via l'historique Cloudflare Pages"
      fi
      rm -rf "$TMP_RB"
    else
      log "ALERTE: rebuild frontend a échoué pendant le rollback"
    fi
  else
    log "Frontend non publié pendant ce run — aucun rollback Cloudflare nécessaire"
  fi

  ok rollback
  step done-rollback
  log "Rollback terminé : service restauré sur ${HEAD_AVANT}"
  ok done-rollback
}

# Trap signal : SEUL SIGTERM (envoyé par /api/admin/deploy/cancel ou par
# le watchdog Node) déclenche un rollback intentionnel.
# SIGINT est explicitement ignoré : c'est ce que pm2 envoie au worker
# Express quand il fait `pm2 reload agri-pilot-api` à l'étape 5. Sans
# cette protection, notre propre déploiement nous tuait au reload.
# (Le double-fork du detached-runner.sh isole déjà notre bash de l'arbre
# pm2, mais on garde cette ceinture en plus des bretelles.)
sur_signal() {
  local sig="$1"
  echo "::FAIL::Interruption (${sig}) reçue"
  declencher_rollback "signal ${sig}"
  exit 130
}
trap '' INT
trap 'sur_signal TERM' TERM
# Filet de sécurité : si le script sort sans avoir déroulé tous les ::OK::,
# on lance un rollback. Le flag DEPLOIEMENT_REUSSI le désactive en fin.
sur_exit() {
  local code=$?
  if [ "$DEPLOIEMENT_REUSSI" -eq 1 ]; then return; fi
  if [ "$ROLLBACK_EN_COURS" -eq 1 ]; then return; fi
  if [ "$code" -ne 0 ]; then
    declencher_rollback "exit ${code}"
  fi
}
trap sur_exit EXIT

# ────────────────────────── Vérifs préalables ─────────────────────────

[ -f "$BACKEND_DIR/.env" ] || fail "backend/.env introuvable"
# shellcheck disable=SC1091
set -a; source "$BACKEND_DIR/.env"; set +a

[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL absente du .env"

# ─────────────────────────── 0. Snapshot rollback ─────────────────────
# Capturé AVANT toute modification : c'est le point de retour garanti.
cd "$ROOT_DIR"
HEAD_AVANT=$(git rev-parse --short HEAD)
log "Point de rollback enregistré : HEAD=${HEAD_AVANT}"
if [ -d "$BACKEND_DIR/dist" ]; then
  DIST_BACKUP=$(mktemp -d /tmp/dist-backup-XXXXXX)
  cp -r "$BACKEND_DIR/dist/." "$DIST_BACKUP/"
  log "Snapshot dist backend → ${DIST_BACKUP}"
fi

# ─────────────────────────── 1. Backup BDD ───────────────────────────
step backup-db
BACKUP_DIR="$HOME/backups-deploy"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
log "pg_dump → $BACKUP_FILE"
if ! avec_timeout "$T_BACKUP" backup-db -- bash -c "pg_dump \"\$DATABASE_URL\" > \"$BACKUP_FILE\"" 2> >(masque >&2); then
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
log "HEAD avant : $HEAD_AVANT"
avec_timeout "$T_GITPULL" git-pull -- git fetch --quiet origin || fail "git fetch a échoué"
N=$(git rev-list --count "HEAD..origin/$BRANCHE")
log "Commits à appliquer : $N"
if [ "$N" -gt 0 ]; then
  git --no-pager log --oneline "HEAD..origin/$BRANCHE" | head -20
  avec_timeout "$T_GITPULL" git-pull -- git pull --ff-only --quiet origin "$BRANCHE" \
    || fail "git pull non fast-forward (rebase manuel requis)"
fi
HEAD_APRES=$(git rev-parse --short HEAD)
log "HEAD après : $HEAD_APRES"
ok git-pull

# ─────────────────────────── 3. Backend deps ─────────────────────────
step backend-deps
cd "$BACKEND_DIR"
log "npm ci..."
avec_timeout "$T_BACKEND_DEPS" backend-deps -- \
  npm ci --include=dev --no-audit --no-fund 2>&1 | tail -3 \
  || fail "npm ci backend a échoué"
log "prisma generate (CRITIQUE — sans ça le build TS échoue)..."
avec_timeout 60 backend-deps -- npx prisma generate 2>&1 | grep -E "Generated|Error|error" || true
# NB : `--skip-generate` n'existe plus dans Prisma 7 (db push affichait son aide
# sans rien appliquer). On laisse db push régénérer le client (redondant avec le
# generate ci-dessus mais sûr).
log "prisma db push (rétrocompatible)..."
avec_timeout 120 backend-deps -- npx prisma db push 2>&1 | tail -12 || true
log "Compte gestionnaire (idempotent, ne réécrit pas le mot de passe existant)..."
avec_timeout 60 backend-deps -- npx tsx scripts/creer-gestionnaire.ts 2>&1 | tail -15 || true
ok backend-deps

# ─────────────────────────── 4. Backend build ────────────────────────
step backend-build
log "tsc... (timeout ${T_BACKEND_BUILD}s)"
# nice + ionice pour ne pas étouffer le serveur prod pendant la compilation
if ! avec_timeout "$T_BACKEND_BUILD" backend-build -- \
     nice -n 10 npm run build 2>&1 | tail -10; then
  fail "Build TypeScript a échoué"
fi
[ -f dist/index.js ] || fail "dist/index.js manquant après build"
ok backend-build

# ─────────────────────────── 5. PM2 reload ───────────────────────────
step backend-reload
log "pm2 reload agri-pilot-api..."
avec_timeout "$T_BACKEND_RELOAD" backend-reload -- \
  pm2 reload agri-pilot-api 2>&1 | tail -3 \
  || fail "pm2 reload a échoué"
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
avec_timeout "$T_FRONT_DEPS" frontend-deps -- \
  npm ci --include=dev --no-audit --no-fund 2>&1 | tail -3 \
  || fail "npm ci mobile a échoué"
ok frontend-deps

# ─────────────────────────── 7. Frontend build ───────────────────────
step frontend-build
log "Nettoyage dist..."
rm -rf dist
log "expo export (~1-2 min, timeout ${T_FRONT_BUILD}s)..."
if ! avec_timeout "$T_FRONT_BUILD" frontend-build -- bash -c \
     'EXPO_PUBLIC_API_URL="https://api.agri-pilot.com" \
      EXPO_PUBLIC_HTML_URL="https://agri-pilot.com" \
      nice -n 10 npx expo export --platform web' 2>&1 | tail -10; then
  fail "expo export a échoué"
fi
[ -d dist ] || fail "dist/ non créé"
NB=$(find dist -type f | wc -l)
log "Bundle : $NB fichiers"
[ "$NB" -lt 50 ] && fail "Bundle anormalement petit ($NB fichiers)"
URL_API_OCC=$(grep -c "api.agri-pilot.com" dist/_expo/static/js/web/*.js | head -1 | cut -d: -f2)
log "Occurrences api.agri-pilot.com : $URL_API_OCC"
[ "${URL_API_OCC:-0}" -lt 1 ] && fail "URL API absente du bundle"

# Workaround wrangler@3 : il filtre silencieusement tout dossier nommé
# `node_modules`, ce qui élimine les polices générées par expo dans
# dist/assets/node_modules/@expo-google-fonts/*. Sans ce rename, le bundle
# servi sur Cloudflare est incomplet et l'app affiche un écran blanc.
if [ -d dist/assets/node_modules ]; then
  log "Rename dist/assets/node_modules → dist/assets/_modules (contournement wrangler)"
  mv dist/assets/node_modules dist/assets/_modules
  # Patche les références dans tous les fichiers générés (HTML/JS/CSS).
  CIBLES=$(grep -rl "assets/node_modules" dist 2>/dev/null || true)
  if [ -n "$CIBLES" ]; then
    echo "$CIBLES" | xargs sed -i 's|assets/node_modules|assets/_modules|g'
    NB_PATCHES=$(echo "$CIBLES" | wc -l)
    log "Références patchées dans $NB_PATCHES fichier(s)"
  fi
fi
ok frontend-build

# ─────────────────────────── 8. Cloudflare deploy ────────────────────
step frontend-deploy
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || fail "CLOUDFLARE_API_TOKEN manquant dans .env"
[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || fail "CLOUDFLARE_ACCOUNT_ID manquant dans .env"
PROJET="${CLOUDFLARE_PAGES_PROJECT:-agri-pilot-v2}"

# Copie hors-repo pour éviter le filtrage .gitignore parent par wrangler
TMP_DIST=$(mktemp -d /tmp/cf-pages-XXXXXX)
# trap dédié pour nettoyer ce tmp même en cas d'échec ultérieur — on le supprime à la fin de l'étape
log "Copie dist → $TMP_DIST"
cp -r dist/. "$TMP_DIST/"
NB_TMP=$(find "$TMP_DIST" -type f | wc -l)
log "Fichiers à uploader : $NB_TMP"

log "wrangler pages deploy → $PROJET..."
# wrangler@3 reste compatible Node 18+. wrangler@4 exige Node 22+, ce que
# le serveur Hetzner (Node 20) ne fournit pas encore.
#
# Retry automatique : l'API Cloudflare renvoie parfois une erreur réseau
# transitoire (constaté en prod le 12/06 — échec en 71s, succès à la relance
# sans changement). On retente quelques fois avant d'abandonner pour ne pas
# gâcher un déploiement dont backup + builds ont déjà tourné. Le timeout
# T_FRONT_DEPLOY s'applique à CHAQUE tentative.
CF_DEPLOY_OK=0
for tentative in $(seq 1 "$CF_DEPLOY_TENTATIVES"); do
  log "Upload Cloudflare — tentative ${tentative}/${CF_DEPLOY_TENTATIVES}..."
  if avec_timeout "$T_FRONT_DEPLOY" frontend-deploy -- env \
       CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
       CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" \
       npx --yes wrangler@3 pages deploy "$TMP_DIST" \
         --project-name="$PROJET" \
         --branch=main \
         --commit-dirty=true 2>&1 | tail -20; then
    CF_DEPLOY_OK=1
    break
  fi
  if [ "$tentative" -lt "$CF_DEPLOY_TENTATIVES" ]; then
    log "Échec tentative ${tentative} — nouvelle tentative dans ${CF_DEPLOY_DELAI}s..."
    sleep "$CF_DEPLOY_DELAI"
  fi
done
if [ "$CF_DEPLOY_OK" -ne 1 ]; then
  rm -rf "$TMP_DIST"
  fail "Upload Cloudflare a échoué (après ${CF_DEPLOY_TENTATIVES} tentatives)"
fi
rm -rf "$TMP_DIST"
FRONTEND_DEPLOYE=1
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
DEPLOIEMENT_REUSSI=1
# Nettoyage du snapshot dist (plus utile)
[ -n "$DIST_BACKUP" ] && rm -rf "$DIST_BACKUP"
ok done
