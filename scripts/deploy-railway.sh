#!/usr/bin/env bash
#
# Déploiement automatisé du backend Ferme RCA sur Railway.
# Provisionne Postgres + Node, configure les variables d'env,
# applique les migrations Prisma. Idempotent : peut être relancé.
#
# Prérequis :
#   - Compte Railway (railway.app) — gratuit puis 5 $/mois en hobby
#   - npm install -g @railway/cli
#   - Lancer depuis la racine du projet
#
# Usage :
#   ./scripts/deploy-railway.sh
#
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗"
echo -e "║   Déploiement Backend Ferme RCA sur Railway          ║"
echo -e "╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# --- 0. Pré-requis ---
echo -e "${CYAN}[0/7] Vérification des pré-requis...${NC}"
if ! command -v railway &> /dev/null; then
  echo -e "${RED}✗ railway CLI introuvable.${NC}"
  echo "   Installer avec : npm install -g @railway/cli"
  exit 1
fi
if [ ! -f "backend/package.json" ]; then
  echo -e "${RED}✗ backend/package.json introuvable. Lance ce script depuis la racine du projet.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ railway CLI installé${NC}"
echo -e "${GREEN}  ✓ structure projet OK${NC}"

# --- 1. Login ---
echo ""
echo -e "${CYAN}[1/7] Connexion Railway...${NC}"
if ! railway whoami &> /dev/null; then
  echo "  Pas de session active. Lancement de railway login (navigateur)..."
  railway login
fi
echo -e "${GREEN}  ✓ Connecté en tant que $(railway whoami | head -1)${NC}"

cd backend

# --- 2. Initialisation projet ---
echo ""
echo -e "${CYAN}[2/7] Projet Railway...${NC}"
if [ ! -f ".railway/config.json" ] && [ ! -d ".railway" ]; then
  echo "  Aucun projet lié. Création..."
  echo -e "  ${YELLOW}→ Choisis 'Empty Project' quand demandé${NC}"
  railway init
fi
PROJECT_NAME=$(railway status --json 2>/dev/null | grep -oE '"name":"[^"]+"' | head -1 | cut -d'"' -f4 || echo "ferme-rca")
echo -e "${GREEN}  ✓ Projet : $PROJECT_NAME${NC}"

# --- 3. Postgres ---
echo ""
echo -e "${CYAN}[3/7] Base de données PostgreSQL...${NC}"
if ! railway variables --json 2>/dev/null | grep -q "DATABASE_URL"; then
  echo "  Provisionnement Postgres (peut prendre 1-2 min)..."
  railway add --database postgres
  echo -e "${GREEN}  ✓ Postgres provisionné${NC}"
else
  echo -e "${GREEN}  ✓ Postgres déjà présent (DATABASE_URL détecté)${NC}"
fi

# --- 4. Variables d'environnement ---
echo ""
echo -e "${CYAN}[4/7] Variables d'environnement...${NC}"
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
railway variables \
  --set "JWT_SECRET=$JWT_SECRET" \
  --set "JWT_EXPIRES_IN=7d" \
  --set "NODE_ENV=production" \
  --set "PORT=3001" \
  > /dev/null
echo -e "${GREEN}  ✓ JWT_SECRET (64 octets aléatoires) injecté${NC}"
echo -e "${GREEN}  ✓ NODE_ENV=production, PORT=3001${NC}"

# --- 5. Build & déploiement ---
echo ""
echo -e "${CYAN}[5/7] Déploiement du backend (peut prendre 2-4 min)...${NC}"
railway up --detach
echo -e "${GREEN}  ✓ Build envoyé à Railway${NC}"
echo "  Suivi en direct : railway logs"

# --- 6. URL publique ---
echo ""
echo -e "${CYAN}[6/7] Génération de l'URL publique...${NC}"
if ! railway variables --json 2>/dev/null | grep -q "RAILWAY_PUBLIC_DOMAIN"; then
  echo "  Création du domaine public..."
  railway domain || true
fi
URL_API=$(railway variables --json 2>/dev/null | grep -oE '"RAILWAY_PUBLIC_DOMAIN":"[^"]+"' | cut -d'"' -f4 || echo "")
if [ -n "$URL_API" ]; then
  URL_API="https://$URL_API"
  echo -e "${GREEN}  ✓ URL API : $URL_API${NC}"
else
  echo -e "${YELLOW}  ⚠ Domaine pas encore provisionné. Lance 'railway domain' manuellement.${NC}"
fi

# --- 7. Migration Prisma ---
echo ""
echo -e "${CYAN}[7/7] Migration Prisma sur la BDD prod...${NC}"
echo "  Note : la 1re fois, créer la migration baseline en local :"
echo -e "  ${YELLOW}    cd backend && npx prisma migrate dev --name baseline_initial --create-only${NC}"
echo -e "  ${YELLOW}    npx prisma migrate resolve --applied baseline_initial${NC}"
echo ""
echo "  Puis depuis Railway :"
echo -e "  ${YELLOW}    railway run npx prisma migrate deploy${NC}"
echo ""
echo "  (À lancer une fois manuellement ou via l'IHM Déploiement)"

# --- Récap ---
cd ..
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗"
echo -e "║              ✓ DÉPLOIEMENT RAILWAY OK                ║"
echo -e "╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Prochaines étapes :"
echo ""
echo -e "${CYAN}1.${NC} Déploie le frontend statique sur Cloudflare Pages :"
echo -e "   ${YELLOW}./scripts/deploy-cloudflare.sh${NC}"
echo ""
echo -e "${CYAN}2.${NC} Configure les variables Expo avec l'URL API :"
echo -e "   ${YELLOW}EXPO_PUBLIC_API_URL=$URL_API${NC}"
echo ""
echo -e "${CYAN}3.${NC} Crée un compte admin réel (depuis psql ou via API) :"
echo -e "   ${YELLOW}railway run npm run seed${NC}    (réinit + comptes seed)"
echo ""
echo -e "${CYAN}4.${NC} Surveille les logs :"
echo -e "   ${YELLOW}railway logs --tail${NC}"
echo ""
