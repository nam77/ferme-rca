#!/usr/bin/env bash
#
# Déploiement du frontend statique Ferme RCA sur Cloudflare Pages.
# Build le bundle Expo Web puis l'upload vers Cloudflare via wrangler.
#
# Prérequis :
#   - Compte Cloudflare (cloudflare.com) — gratuit illimité
#   - npm install -g wrangler  (CLI Cloudflare)
#   - URL API du backend déjà déployée (à configurer ci-dessous)
#
# Usage :
#   ./scripts/deploy-cloudflare.sh
#   ./scripts/deploy-cloudflare.sh https://api.agropilot.up.railway.app
#
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Nom du projet Cloudflare Pages (créé au 1er run)
PROJET="${CLOUDFLARE_PAGES_PROJECT:-ferme-rca}"
URL_API="${1:-${EXPO_PUBLIC_API_URL:-}}"

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗"
echo -e "║   Déploiement Frontend Ferme RCA sur Cloudflare      ║"
echo -e "╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# --- 0. Pré-requis ---
echo -e "${CYAN}[0/5] Vérification des pré-requis...${NC}"
if ! command -v wrangler &> /dev/null; then
  echo -e "${RED}✗ wrangler CLI introuvable.${NC}"
  echo "   Installer : npm install -g wrangler"
  exit 1
fi
if [ ! -f "mobile/package.json" ]; then
  echo -e "${RED}✗ Lance ce script depuis la racine du projet.${NC}"
  exit 1
fi
if [ -z "$URL_API" ]; then
  echo -e "${YELLOW}⚠ URL API non fournie.${NC}"
  echo "   Tu peux la passer en argument :"
  echo -e "   ${YELLOW}./scripts/deploy-cloudflare.sh https://ton-backend.up.railway.app${NC}"
  echo ""
  read -rp "URL du backend (https://...) : " URL_API
  if [ -z "$URL_API" ]; then
    echo -e "${RED}✗ URL requise pour configurer EXPO_PUBLIC_API_URL${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}  ✓ wrangler installé${NC}"
echo -e "${GREEN}  ✓ URL API : $URL_API${NC}"

# --- 1. Login Cloudflare ---
echo ""
echo -e "${CYAN}[1/5] Connexion Cloudflare...${NC}"
if ! wrangler whoami &> /dev/null; then
  echo "  Pas de session. Lancement de wrangler login (navigateur)..."
  wrangler login
fi
echo -e "${GREEN}  ✓ Connecté${NC}"

# --- 2. Configuration des variables Expo ---
echo ""
echo -e "${CYAN}[2/5] Configuration des variables Expo...${NC}"
cd mobile
cat > .env.local <<EOF
EXPO_PUBLIC_API_URL=$URL_API
EXPO_PUBLIC_HTML_URL=https://$PROJET.pages.dev/agropilot-app.html
EOF
echo -e "${GREEN}  ✓ mobile/.env.local créé${NC}"

# --- 3. Build Expo Web ---
echo ""
echo -e "${CYAN}[3/5] Build Expo Web (peut prendre 1-3 min)...${NC}"
rm -rf dist
npx expo export --platform web --output-dir dist
SIZE=$(du -sh dist | cut -f1)
echo -e "${GREEN}  ✓ Build généré dans mobile/dist/ ($SIZE)${NC}"

# --- 4. Patch URL API absolue dans agropilot-app.html ---
# Le HTML déduit API_BASE depuis window.location.hostname par défaut.
# En prod, le HTML est sur Cloudflare et l'API sur Railway → on hardcode.
echo ""
echo -e "${CYAN}[4/5] Configuration de l'URL API dans le HTML...${NC}"
# Remplace le bloc API_BASE pour pointer vers l'URL Railway
python3 - <<PY
import re
fp = 'dist/agropilot-app.html'
with open(fp) as f:
    src = f.read()
nouveau = """const API_BASE = '$URL_API/api';"""
src = re.sub(
    r"const API_BASE = \(\(\) => \{[\s\S]*?\}\)\(\);",
    nouveau,
    src,
    count=1,
)
with open(fp, 'w') as f:
    f.write(src)
print('  ✓ API_BASE figé sur', '$URL_API/api')
PY

# --- 5. Déploiement Cloudflare Pages ---
echo ""
echo -e "${CYAN}[5/5] Upload vers Cloudflare Pages...${NC}"
wrangler pages deploy dist --project-name "$PROJET" --commit-dirty=true

cd ..

# --- Récap ---
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗"
echo -e "║          ✓ DÉPLOIEMENT CLOUDFLARE PAGES OK           ║"
echo -e "╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "URL publique :"
echo -e "${GREEN}  https://$PROJET.pages.dev${NC}"
echo ""
echo "Pour un domaine custom (app.agropilot.fr par exemple) :"
echo -e "${CYAN}  → Cloudflare Dashboard → Pages → $PROJET → Custom domains → Set up a custom domain${NC}"
echo ""
echo "CORS — Pense à ajouter l'origine Cloudflare dans backend/src/index.ts :"
echo -e "${YELLOW}  app.use(cors({ origin: ['https://$PROJET.pages.dev'], credentials: true }))${NC}"
echo "  Puis redéploie le backend : ./scripts/deploy-railway.sh"
echo ""
