# 🚀 Procédure complète : du dev au déploiement en production

> **App de référence** : agri-pilot (Expo Router web + Node/Express + PostgreSQL)  
> **Hébergeurs** : Cloudflare (DNS + Pages + HTTPS) + Hetzner (VPS backend)  
> **Coût** : ~12 €/mois TTC + 9 €/an domaine  
> **Version** : 2.0 (capitalisation des leçons d'expérience)  
> **Durée** : 4-5 heures pour le 1er déploiement, ~30 min pour les suivants

---

## 📚 Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Phase 0 : Avant de commencer](#2-phase-0--avant-de-commencer)
3. [Phase 1 : Préparation du code](#3-phase-1--préparation-du-code)
4. [Phase 2 : Domaine + Cloudflare](#4-phase-2--domaine--cloudflare)
5. [Phase 3 : Provisioning du VPS Hetzner](#5-phase-3--provisioning-du-vps-hetzner)
6. [Phase 4 : Sécurisation du serveur](#6-phase-4--sécurisation-du-serveur)
7. [Phase 5 : Stack applicative](#7-phase-5--stack-applicative)
8. [Phase 6 : Déploiement du backend](#8-phase-6--déploiement-du-backend)
9. [Phase 7 : Déploiement du frontend](#9-phase-7--déploiement-du-frontend)
10. [Phase 8 : Sécurisation finale](#10-phase-8--sécurisation-finale)
11. [Pièges connus et solutions](#11-pièges-connus-et-solutions)
12. [Mise à jour d'une app déployée](#12-mise-à-jour-dune-app-déployée)

---

## 1. Vue d'ensemble

### Architecture cible

```
┌────────────────────────────────────────────────────────────┐
│  Internet                                                  │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  Cloudflare (DNS + HTTPS + CDN + DDoS)                     │
│                                                            │
│  agri-pilot.com      ──►  Cloudflare Pages (frontend)      │
│  www.agri-pilot.com  ──►  Cloudflare Pages (frontend)      │
│  api.agri-pilot.com  ──►  VPS Hetzner (backend)            │
└────────────────────────────────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
┌──────────────────┐        ┌────────────────────────────────┐
│ Cloudflare Pages │        │ Hetzner VPS (Nuremberg)        │
│ (frontend Expo)  │        │  - nginx (reverse proxy)       │
│ Direct Upload    │        │  - PM2 → Node/Express + Prisma │
│                  │        │  - PostgreSQL 16               │
└──────────────────┘        │  - UFW + fail2ban              │
                            │  - Backups quotidiens          │
                            └────────────────────────────────┘
```

### Les 3 contextes d'exécution

| Prompt | Lieu | Usage |
|---|---|---|
| `racso@laptop$` | Laptop local | Code, secrets, scp, build, navigateur |
| `ferme@vps:~$` | Serveur (utilisateur dédié) | Application, BDD, nginx |
| `root@vps:~#` | Serveur (root) | Configuration système initiale uniquement |

### Outils nécessaires

- ✅ Compte **Cloudflare** (gratuit)
- ✅ Compte **Hetzner Cloud** (avec validation d'identité)
- ✅ Compte **GitHub** (avec clé SSH configurée)
- ✅ Carte bancaire pour les abonnements (~15 €/mois total)
- ✅ Application 2FA (Authy, Google Authenticator, ou similaire)

---

## 2. Phase 0 : Avant de commencer

### Checklist préalable

- [ ] **Tests locaux passent** (lancer l'app en local de bout en bout)
- [ ] **`.gitignore`** correct (exclut `.env`, `node_modules`, `dist/`, secrets)
- [ ] **Pas de secret en clair dans le repo** : `git ls-files | grep -E "\.env|secret|backup\.sql"` → rien
- [ ] **Variables d'environnement documentées** dans `.env.example` (sans valeurs sensibles)
- [ ] **Build de production réussit en local** (`npm run build`, `expo export`, etc.)
- [ ] **Migration de base de données prête** (Prisma, Sequelize, etc.)

### Créer le dossier des secrets local

```bash
# Sur le laptop
mkdir -p ~/Documents/secrets-{nom-app}
chmod 700 ~/Documents/secrets-{nom-app}
```

Vous y mettrez progressivement :
- `README.txt` — inventaire des fichiers
- `hetzner-recovery-key.txt` — clé recovery 2FA Hetzner
- `hetzner-server-info.txt` — IP, mdp utilisateur ferme
- `postgres-prod.txt` — mdp BDD production
- `jwt-secret-prod.txt` — JWT_SECRET production
- `admin-passwords.txt` — mdp des comptes seed après reset
- `cloudflare-api-token.txt` — token API si Wrangler utilisé

⚠️ **NE JAMAIS** commiter ce dossier, le mettre dans Drive non chiffré, ou l'envoyer par email.

---

## 3. Phase 1 : Préparation du code

### 3.1 Configurer Git correctement

```bash
cd ~/votre-projet
git status

# Si pas encore initié :
git init
git remote add origin git@github.com:USER/REPO.git
```

### 3.2 Sécuriser les variables d'environnement

⚠️ **Piège classique** : par défaut, Expo lit `process.env.EXPO_PUBLIC_*` AU MOMENT DU BUILD. Si la variable est absente, l'app utilise un fallback (souvent `localhost:3001`) qui ne marche pas en production web.

**Solution** : dans votre code API client, traiter le cas web prod sans variable :

```typescript
// mobile/src/api/client.ts (exemple)
const URL_PAR_DEFAUT_DEV =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001'

function determinerUrlApi(): string {
  const urlEnv = process.env.EXPO_PUBLIC_API_URL
  if (urlEnv && urlEnv.trim().length > 0) return urlEnv.trim()

  // En web sur un vrai domaine sans variable : log d'erreur explicite
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const enLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    if (!enLocalhost) {
      console.error(
        '⛔ EXPO_PUBLIC_API_URL non définie au build. ' +
        "Le frontend ne pourra pas joindre le backend."
      )
    }
  }
  return URL_PAR_DEFAUT_DEV
}

export const URL_API = determinerUrlApi()
```

### 3.3 Vérifier qu'aucun secret n'est dans le repo

```bash
cd ~/votre-projet
git ls-files | grep -E "\.env|secret|password|backup\.sql|\.key$|admin@"
```

Si quelque chose remonte (hors `.env.example`), il faut **régénérer ce secret** car il est public sur GitHub.

### 3.4 Créer un `LESSONS_LEARNED.md`

Document vivant qui capitalise les bugs rencontrés. À mettre à jour à chaque déploiement.

```bash
mkdir -p docs
nano docs/LESSONS_LEARNED.md
```

Structure suggérée :
```markdown
# Lessons Learned

## Bug X
**Symptôme** :
**Cause** :
**Fix** :
**Prévention future** :
```

### 3.5 Pousser sur GitHub via SSH

```bash
# Vérifier la clé SSH chargée
ssh-add -l

# Si "agent has no identities" :
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Tester la connexion GitHub
ssh -T git@github.com

# Pousser
git push -u origin main
```

---

## 4. Phase 2 : Domaine + Cloudflare

### 4.1 Acheter le domaine

1. https://dash.cloudflare.com/ → créer un compte
2. **Activer la 2FA** dans Settings → Security ⚠️ critique
3. **Domain Registration → Register** → chercher votre nom
4. Acheter (~9 €/an pour `.com`)
5. ✅ WHOIS Privacy activée
6. ✅ Renouvellement automatique activé

### 4.2 Configurer le SSL/TLS

➡ Cloudflare → votre domaine → **SSL/TLS**

- **Mode** : **Complet** (commencer par là — pas "Strict" tant que Let's Encrypt n'est pas sur le serveur)
- **Edge Certificates** :
  - ✅ Toujours utiliser HTTPS
  - ✅ Réécritures HTTPS automatiques
  - ✅ TLS 1.3
  - **Version TLS minimum** : TLS 1.2

### ⚠️ Note de traduction française

| Anglais | Français Cloudflare |
|---|---|
| **A** (record type) | **UN** |
| **Proxied** | **Procuration** |

Pas une erreur, juste une traduction étrange. Garde la tête froide.

---

## 5. Phase 3 : Provisioning du VPS Hetzner

### 5.1 Création du compte

1. https://www.hetzner.com/cloud → créer un compte
2. **Validation d'identité** (ID + sélfie) — peut prendre 30 min à 2h
3. **Activer la 2FA** + **sauvegarder la recovery key** (papier + fichier local)
4. Configurer un moyen de paiement

### 5.2 Création du VPS

| Champ | Valeur recommandée |
|---|---|
| Location | 🇩🇪 **Nuremberg** ou **Falkenstein** (proche France) |
| Image | **Ubuntu 24.04** |
| Type | **Shared vCPU → CPX22** (3 vCPU, 4 Go RAM, 80 Go SSD) |
| Networking | Public IPv4 + IPv6 |
| **SSH Keys** | Coller votre `~/.ssh/id_ed25519.pub` |
| **Backups** | ✅ **Activer** (+0,90 €/mo) |
| Name | `{nom-app}-prod` |

**Coût** : ~6,12 €/mois TTC (CPX22 + backups + IPv4)

### 5.3 Sauvegarder l'IP

Sur le laptop :
```bash
nano ~/Documents/secrets-{nom-app}/hetzner-server-info.txt
```

Y mettre :
```
IP serveur : XX.XX.XX.XX
Nom : {nom-app}-prod
Location : Nuremberg
Type : CPX22
Backups : activés
```

### 5.4 Première connexion SSH

```bash
ssh root@VOTRE_IP
# Tapez "yes" à la première connexion
```

**Résultat attendu** : prompt `root@{nom-app}-prod:~#`

---

## 6. Phase 4 : Sécurisation du serveur

### 6.1 Mise à jour système

```bash
# En root
apt update && apt upgrade -y
```

⏱ 2-3 min. Si "Daemons using outdated libraries" apparaît : OK.

```bash
# Si "Pending kernel upgrade" :
reboot
# Reconnecter après 60s : ssh root@IP
uname -r   # Doit afficher 6.8.x ou plus récent
```

### 6.2 Outils de base

```bash
apt install -y curl wget git ufw fail2ban htop nano vim sudo build-essential
```

### 6.3 Création utilisateur non-root

```bash
adduser ferme
# Mot de passe fort (générer avec : openssl rand -base64 24 sur le laptop)

usermod -aG sudo ferme

# Copier la clé SSH
mkdir -p /home/ferme/.ssh
cp /root/.ssh/authorized_keys /home/ferme/.ssh/authorized_keys
chown -R ferme:ferme /home/ferme/.ssh
chmod 700 /home/ferme/.ssh
chmod 600 /home/ferme/.ssh/authorized_keys
```

### 6.4 Tester depuis un nouveau terminal local

⚠️ **NE PAS fermer le terminal root** — filet de sécurité tant que SSH n'est pas durci.

```bash
# Sur le laptop
ssh ferme@VOTRE_IP
sudo whoami    # Doit afficher : root
```

### 6.5 Sécurisation SSH

```bash
# En root, modifier sshd_config
nano /etc/ssh/sshd_config
```

Modifier 3 lignes :
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
# TESTER LA SYNTAXE AVANT DE REDÉMARRER
sshd -t
# Pas de sortie = OK ; sinon ne pas continuer

systemctl restart ssh
```

### 6.6 Tester immédiatement

```bash
# Sur le laptop, terminal séparé :
ssh ferme@VOTRE_IP        # Doit marcher
ssh root@VOTRE_IP         # Doit retourner "Permission denied (publickey)"
```

### 6.7 Firewall UFW

```bash
# En tant que ferme
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable    # confirmer y
sudo ufw status verbose
```

### 6.8 fail2ban

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
banaction = ufw
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = %(sshd_log)s
backend = systemd
maxretry = 3
findtime = 600
bantime = 86400
```

```bash
sudo fail2ban-client -t              # test syntaxe
sudo systemctl restart fail2ban
sudo fail2ban-client status sshd     # vérifier
```

---

## 7. Phase 5 : Stack applicative

### 7.1 Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version    # v20.x
npm --version     # 10.x
```

### 7.2 PostgreSQL 16

```bash
sudo apt install -y postgresql postgresql-contrib
psql --version    # 16.x
```

### 7.3 nginx

```bash
sudo apt install -y nginx
nginx -v          # 1.24.x
```

Test public : ouvrir `http://VOTRE_IP` → doit afficher "Welcome to nginx!"

### 7.4 PM2

```bash
sudo npm install -g pm2
pm2 --version     # 5.x ou 7.x
```

### 7.5 Certbot (Let's Encrypt — usage futur)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 7.6 Configuration PostgreSQL

#### Générer un mot de passe propre

```bash
openssl rand -hex 24    # alphanumeriques uniquement
```

⚠️ **Piège** : Le mdp BDD ne doit PAS contenir `/`, `@`, `:`, `?`, `#`, `%`, `=`, espace. Sinon Prisma plantera. **Toujours utiliser `-hex`**.

Sauvegarder dans `~/Documents/secrets-{app}/postgres-prod.txt` sur le laptop.

#### Créer base + utilisateur

```bash
sudo -u postgres psql
```

Dans `postgres=#` :
```sql
CREATE DATABASE agri_pilot;
CREATE USER agri_pilot_user WITH ENCRYPTED PASSWORD 'COLLER_LE_MDP';
GRANT ALL PRIVILEGES ON DATABASE agri_pilot TO agri_pilot_user;
ALTER DATABASE agri_pilot OWNER TO agri_pilot_user;
\c agri_pilot
GRANT ALL ON SCHEMA public TO agri_pilot_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO agri_pilot_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO agri_pilot_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO agri_pilot_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO agri_pilot_user;
\q
```

⚠️ **PostgreSQL 15+** exige les `GRANT ALL ON SCHEMA public` explicitement. Sans ça, Prisma plante avec "permission denied for schema public".

#### Tester

```bash
psql -h localhost -U agri_pilot_user -d agri_pilot
\q
```

---

## 8. Phase 6 : Déploiement du backend

### 8.1 DNS de l'API

Sur Cloudflare → votre domaine → **DNS** → **Enregistrements** → **Ajouter** :

| Type | Nom | Contenu | Proxy |
|---|---|---|---|
| **UN** (= A) | `api` | IP Hetzner | 🟠 Procuration |

### 8.2 Cloner le repo

```bash
# Sur le serveur, en ferme
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/USER/REPO.git agri-pilot
cd agri-pilot/backend
npm ci
```

### 8.3 Créer le `.env` de production

#### Générer le JWT_SECRET

```bash
openssl rand -base64 64 | tr -d '\n'; echo
```

Sauvegarder dans `~/Documents/secrets-{app}/jwt-secret-prod.txt` sur le laptop.

#### Créer le fichier

```bash
nano ~/apps/agri-pilot/backend/.env
```

```env
DATABASE_URL="postgresql://agri_pilot_user:VOTRE_MDP@localhost:5432/agri_pilot"
JWT_SECRET="VOTRE_JWT_SECRET"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=production
```

```bash
chmod 600 .env
ls -la .env    # -rw-------
```

### 8.4 Migration BDD

```bash
cd ~/apps/agri-pilot/backend
npx prisma db push
```

**Résultat attendu** : "Your database is now in sync"

```bash
# Vérifier les tables
psql -h localhost -U agri_pilot_user -d agri_pilot -c "\dt"
```

### 8.5 Import du backup.sql (si vous migrez depuis le dev)

```bash
# Sur le laptop : copier le dump
scp ~/votre-projet/deploiements/.../backup.sql ferme@IP:~/

# Sur le serveur :
pg_dump -h localhost -U agri_pilot_user agri_pilot > ~/backup_avant_import_$(date +%Y%m%d).sql
psql -h localhost -U agri_pilot_user -d agri_pilot < ~/backup.sql 2>&1 | tee ~/import.log
grep -i "ERROR" ~/import.log
```

### 8.6 Build TypeScript

```bash
cd ~/apps/agri-pilot/backend
npx prisma generate    # CRITIQUE — sans ça, le build TS échoue car
                       # src/generated/prisma/ est gitignoré et donc
                       # absent après npm ci
npm run build
ls dist/    # doit contenir index.js à la racine
```

⚠️ **Piège connu** : si `dist/src/index.js` au lieu de `dist/index.js`, corriger `tsconfig.json` :
```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  }
}
```

### 8.7 Démarrer avec PM2

```bash
pm2 start dist/index.js --name "agri-pilot-api"
pm2 status     # online attendu
curl -I http://localhost:3001    # devrait répondre

pm2 save       # pour resurrect au reboot
pm2 startup    # afficher la commande sudo à exécuter
# Copier-coller la commande "sudo env PATH=..." retournée
```

⚠️ **Piège PM2 récent + systemd Ubuntu 24** : le service systemd peut planter avec "Result: protocol" car PM2 ne crée plus de `pm2.pid`. Solution acceptable temporairement : laisser PM2 en mode user (l'app tourne 24/7 mais ne redémarre pas automatiquement au reboot du VPS).

### 8.8 nginx en reverse proxy

```bash
sudo nano /etc/nginx/sites-available/api.agri-pilot.com
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.agri-pilot.com;

    access_log /var/log/nginx/api.agri-pilot.com.access.log;
    error_log /var/log/nginx/api.agri-pilot.com.error.log;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api.agri-pilot.com /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t                    # tester syntaxe
sudo systemctl reload nginx
```

### 8.9 Test public

```bash
# Depuis le laptop
curl -I https://api.agri-pilot.com
```

**Résultat attendu** :
```
HTTP/2 404
server: cloudflare
x-powered-by: Express   ← votre app répond !
```

⚠️ **Si erreur 521 (Web server is down)** : passer Cloudflare en mode SSL/TLS **Flexible** temporairement. On reviendra en "Complet (strict)" après installation Let's Encrypt.

---

## 9. Phase 7 : Déploiement du frontend

### ⚠️ Leçon majeure (mai 2026)

Le mode **"Connect to Git"** sur Cloudflare Pages peut générer des builds **incomplets** (notamment pour Expo, où les polices `node_modules/@expo-google-fonts/...` ne sont parfois pas correctement copiées dans `dist/`).

**Solution préférée** : utiliser le mode **"Direct Upload"** avec un build local validé.

### 9.1 Build local avec les bonnes variables

```bash
cd ~/votre-projet/mobile

# Nettoyer
rm -rf dist/

# Builder avec les variables d'env (CRITIQUE)
EXPO_PUBLIC_API_URL=https://api.agri-pilot.com \
EXPO_PUBLIC_HTML_URL=https://agri-pilot.com \
npx expo export --platform web
```

⏱ 1-3 min.

### 9.2 Validations critiques avant upload

```bash
# 1. URL API présente dans le bundle ?
grep -c "api.agri-pilot.com" dist/_expo/static/js/web/*.js
# Attendu : >= 1

# 2. Plus d'éventuelles fuites de mots de passe seed ?
grep -c "admin123\|responsable123" dist/_expo/static/js/web/*.js
# Attendu : 0

# 3. Plus de boîte de comptes de démonstration en prod ?
grep -c "Comptes de démonstration" dist/_expo/static/js/web/*.js
# Attendu : 0 (si conditionné sur __DEV__)

# 4. Nombre de fichiers
find dist -type f | wc -l
# Attendu : ~96-100

# 5. Polices présentes (cas Expo Google Fonts)
find dist -name "*.ttf" | wc -l
# Attendu : 18+ (selon les polices utilisées)
```

⚠️ **Si un test échoue, NE PAS uploader**. Diagnostiquer d'abord.

### 9.3 Préparer l'upload

```bash
# Copier vers un endroit accessible (le drag & drop n'aime pas /tmp)
cp -r ~/votre-projet/mobile/dist ~/Documents/agri-pilot-dist

# Vérifier
find ~/Documents/agri-pilot-dist -type f | wc -l
```

### 9.4 Créer un projet Cloudflare Pages en Direct Upload

1. https://dash.cloudflare.com/ → **Workers & Pages** → **Create application**
2. **Continue with GitHub** ❌ → cliquer plutôt sur **"Get started"** en bas (pour Pages)
3. Choisir **"Drag and drop your files"**
4. **Project name** : `agri-pilot-v2` (ou autre nom unique)
5. **Create project**
6. Drag & drop le **contenu** de `~/Documents/agri-pilot-dist/` (Ctrl+A puis glisser, **pas le dossier**)
7. Vérifier le compteur : **"Uploading 96+ total file(s)"** ⚠️

⚠️ **Si vous ne voyez que 17-18 fichiers uploadés**, c'est probablement Wrangler qui filtre via `.gitignore` parents. Solutions :
- Le projet `dist/` doit être hors du repo Git lors de l'upload
- Ou utiliser le drag & drop dashboard Cloudflare (toujours fiable)

8. Cliquer **Deploy site**
9. ⏱ 2-3 min upload

### 9.5 Tester le déploiement preview

```bash
# Test page d'accueil
curl -I https://agri-pilot-v2.pages.dev

# Test critique : les polices
curl -IL "https://agri-pilot-v2.pages.dev/assets/node_modules/@expo-google-fonts/dm-sans/400Regular/SOME_FONT.ttf"
# Attendu : content-type: font/ttf (PAS text/html)
```

### 9.6 Ouvrir dans un navigateur en privé

`https://agri-pilot-v2.pages.dev` doit charger **complètement et instantanément** (pas de spinner infini).

### 9.7 Connecter les domaines custom

➡ Sur le projet Pages → onglet **Custom domains** → **Set up a custom domain**

1. Ajouter `agri-pilot.com` → **Activate domain**
2. Ajouter `www.agri-pilot.com` → **Activate domain**

⏱ 30 secondes - 1 min activation.

### 9.8 DNS de la racine

Si pas déjà fait, sur Cloudflare DNS :

| Type | Nom | Contenu | Proxy |
|---|---|---|---|
| **UN** (A) | `@` | (Cloudflare ajoute auto) | 🟠 Procuration |
| **CNAME** | `www` | `agri-pilot.com` | 🟠 Procuration |

Cloudflare gère normalement automatiquement quand on connecte un Pages.

### 9.9 Test final

```bash
curl -I https://agri-pilot.com
curl -IL "https://agri-pilot.com/assets/node_modules/@expo-google-fonts/dm-sans/400Regular/SOME_FONT.ttf"
```

Et dans un navigateur en privé : `https://agri-pilot.com` doit fonctionner. 🎉

---

## 10. Phase 8 : Sécurisation finale

### 10.1 Changer les mots de passe seed (URGENT)

⚠️ Les mots de passe seed (`admin123`, etc.) sont **publics** sur GitHub. À changer **immédiatement après le 1er déploiement**.

#### Générer 4 nouveaux mdp (laptop)

```bash
echo "admin       : $(openssl rand -hex 16)"
echo "responsable : $(openssl rand -hex 16)"
echo "ouvrier     : $(openssl rand -hex 16)"
echo "investisseur: $(openssl rand -hex 16)"
```

Sauvegarder dans `~/Documents/secrets-{app}/admin-passwords.txt`.

#### Créer un script de reset (serveur)

```bash
mkdir -p ~/apps/agri-pilot/backend/scripts
nano ~/apps/agri-pilot/backend/scripts/reset-admin-passwords.ts
```

```typescript
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const updates = [
  { email: 'admin@ferme.rca',         password: process.env.ADMIN_PASSWORD },
  { email: 'pisciculture@ferme.rca',  password: process.env.RESPONSABLE_PASSWORD },
  { email: 'ouvrier@ferme.rca',       password: process.env.OUVRIER_PASSWORD },
  { email: 'investisseur@ferme.rca',  password: process.env.INVESTISSEUR_PASSWORD },
]

async function main() {
  for (const { email, password } of updates) {
    if (!password || password.length < 16) {
      console.error(`❌ ${email}: mdp invalide`)
      continue
    }
    const hash = await bcrypt.hash(password, 12)
    const user = await prisma.utilisateur.update({
      where: { email },
      data: { motDePasseHash: hash },
    })
    console.log(`✅ ${email} (${user.role}) mis à jour`)
  }
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
```

⚠️ Adapter le **nom du champ** selon votre schéma Prisma (`motDePasseHash` ou `password` ou autre).

#### Exécuter (1 seule ligne, sans `\`)

```bash
cd ~/apps/agri-pilot/backend && ADMIN_PASSWORD="MDP1" RESPONSABLE_PASSWORD="MDP2" OUVRIER_PASSWORD="MDP3" INVESTISSEUR_PASSWORD="MDP4" npx tsx scripts/reset-admin-passwords.ts
```

#### Effacer l'historique shell

```bash
history -c && history -w
```

### 10.2 CORS whitelist

Modifier `backend/src/index.ts` pour ne plus avoir `Access-Control-Allow-Origin: *` :

```typescript
const allowedOrigins = [
  'https://agri-pilot.com',
  'https://www.agri-pilot.com',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Apps mobiles
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin non autorisée'));
  },
  credentials: true,
}));
```

Commit + push, puis sur le serveur :
```bash
cd ~/apps/agri-pilot && git pull
cd backend && npm ci && npx prisma generate && npm run build
pm2 restart agri-pilot-api
```

### 10.3 Backup automatique BDD

```bash
sudo nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
mkdir -p "$BACKUP_DIR"

PGPASSWORD="MDP_BDD" pg_dump -U agri_pilot_user -h localhost agri_pilot \
  | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# Conserver 30 jours
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
```

```bash
sudo chmod 700 /usr/local/bin/backup-db.sh

# Tester
sudo /usr/local/bin/backup-db.sh
ls /var/backups/postgres/

# Cron quotidien à 3h
sudo crontab -e
# Ajouter : 0 3 * * * /usr/local/bin/backup-db.sh >> /var/log/backup-db.log 2>&1
```

⚠️ **Recommandé** : externaliser les backups (S3, Backblaze B2) pour disaster recovery.

### 10.4 Let's Encrypt + Cloudflare strict

```bash
sudo certbot --nginx -d api.agri-pilot.com
```

Puis Cloudflare → SSL/TLS → passer en **"Complet (strict)"**.

### 10.5 Monitoring

Inscrivez-vous sur **UptimeRobot** (gratuit) :
- Monitor `https://api.agri-pilot.com` toutes les 5 min
- Monitor `https://agri-pilot.com` toutes les 5 min
- Alertes email si down

---

## 11. Pièges connus et solutions

### 🐛 Bug 1 : Network Error sur le frontend en prod

**Symptôme** : "Network Error" au login depuis agri-pilot.com.

**Cause** : `EXPO_PUBLIC_API_URL` pas définie au moment du build → fallback `localhost:3001` qui n'existe pas pour les visiteurs.

**Fix** : 
```bash
EXPO_PUBLIC_API_URL=https://api.agri-pilot.com npx expo export --platform web
```

**Vérification** :
```bash
grep -c "api.agri-pilot.com" dist/_expo/static/js/web/*.js
# Doit être >= 1
```

### 🐛 Bug 2 : Polices Expo non servies (text/html au lieu de font/ttf)

**Symptôme** : l'app reste sur le spinner infini, F12 Console montre "Failed to decode font".

**Cause** : Cloudflare Pages en mode "Connect to Git" génère un `dist/` incomplet qui ne contient pas les polices `@expo-google-fonts/...`.

**Fix temporaire** : utiliser le mode **"Direct Upload"** Pages avec un dist local validé.

**Fix permanent** : à investiguer (raison Cloudflare CI inconnue à date).

**Vérification** :
```bash
curl -IL "https://votre-domaine/assets/node_modules/@expo-google-fonts/dm-sans/400Regular/SOME.ttf"
# content-type doit être "font/ttf" pas "text/html"
```

### 🐛 Bug 3 : Mot de passe BDD avec caractères spéciaux

**Symptôme** : Prisma plante avec une erreur P1013 ou P1001.

**Cause** : `/`, `@`, `:`, `?`, `#`, `%`, `=`, espace dans le mdp BDD cassent l'URL `DATABASE_URL`.

**Fix** : régénérer avec `openssl rand -hex 24` (alphanumérique uniquement).

### 🐛 Bug 4 : `dist/src/index.js` au lieu de `dist/index.js`

**Symptôme** : `pm2 start dist/index.js` plante avec "Cannot find module".

**Cause** : `tsconfig.json` mal configuré (rootDir manquant ou `prisma.config.ts` à la racine).

**Fix** : ajouter dans `tsconfig.json` :
```json
{ "compilerOptions": { "rootDir": "./src", "outDir": "./dist" } }
```

### 🐛 Bug 5 : PostgreSQL "permission denied for schema public"

**Symptôme** : Prisma plante au `db push`.

**Cause** : PostgreSQL 15+ ne donne plus les permissions par défaut au utilisateur de la BDD.

**Fix** : 
```sql
\c ma_database
GRANT ALL ON SCHEMA public TO mon_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mon_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mon_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mon_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mon_user;
```

### 🐛 Bug 6 : PM2 systemd "Result: protocol"

**Symptôme** : `sudo systemctl status pm2-ferme` retourne failed.

**Cause** : PM2 récent (v6+) ne crée plus de `pm2.pid` que systemd attend.

**Fix temporaire** : laisser PM2 en mode user (l'app tourne mais ne redémarre pas au reboot du VPS).

**Fix permanent** : à investiguer (changer le service en `Type=simple`).

### 🐛 Bug 7 : Wrangler upload incomplet (17 fichiers au lieu de 96)

**Symptôme** : `wrangler pages deploy` n'upload que les fichiers HTML à la racine, pas les sous-dossiers.

**Cause** : Wrangler respecte le `.gitignore` parent qui contient probablement `dist/`. Du coup il considère que les fichiers du `dist/` sont à exclure.

**Fix** : utiliser le **dashboard Cloudflare** (drag & drop) qui ignore les `.gitignore`.

### 🐛 Bug 8 : Cloudflare 521 "Web server is down"

**Symptôme** : `https://api.agri-pilot.com` retourne 521 alors que le serveur tourne.

**Cause** : SSL/TLS en mode "Complet (strict)" mais pas de certificat Let's Encrypt sur le serveur.

**Fix temporaire** : passer en mode **Flexible** sur Cloudflare.

**Fix permanent** : installer Let's Encrypt avec `certbot --nginx`, puis repasser en "Complet (strict)".

---

## 12. Mise à jour d'une app déployée

### 12.1 Backend (workflow git pull)

```bash
# Sur le serveur
cd ~/apps/agri-pilot
git fetch
git log HEAD..origin/main --oneline    # voir ce qui va arriver
git pull
cd backend
npm ci                  # si le package.json a changé
npx prisma generate     # CRITIQUE si schema.prisma a changé — sans ça
                        # le build TS échoue car src/generated/prisma/
                        # est gitignoré (lesson learned 2026-05-07)
npx prisma db push      # si schema.prisma a changé (rétrocompatible)
npm run build
pm2 reload agri-pilot-api    # reload sans downtime
```

### 12.2 Frontend (build local + upload)

```bash
# Sur le laptop
cd ~/votre-projet
git pull       # récupérer dernières modifs
cd mobile
rm -rf dist/
EXPO_PUBLIC_API_URL=https://api.agri-pilot.com \
EXPO_PUBLIC_HTML_URL=https://agri-pilot.com \
npx expo export --platform web

# Vérifier le bundle
grep -c "api.agri-pilot.com" dist/_expo/static/js/web/*.js
find dist -type f | wc -l

# Préparer l'upload
cp -r dist ~/Documents/agri-pilot-dist-NEW
```

Puis sur Cloudflare → Workers & Pages → votre projet → **Create new deployment** → drag & drop le contenu.

### 12.3 Migrer la BDD

```bash
# Sur le serveur
cd ~/apps/agri-pilot/backend
npx prisma db push        # ou prisma migrate deploy si vous utilisez migrate
```

### 12.4 Vérifier après mise à jour

```bash
# Backend OK ?
curl -I https://api.agri-pilot.com

# Frontend OK ?
curl -I https://agri-pilot.com

# Logs PM2
pm2 logs agri-pilot-api --lines 50 --nostream

# Visuel : ouvrir https://agri-pilot.com en privé
```

---

## 📋 Checklist finale post-déploiement

### Sécurité
- [ ] 2FA Cloudflare activée
- [ ] 2FA Hetzner activée + recovery key sauvegardée
- [ ] SSH par clé uniquement (root + password désactivés)
- [ ] UFW configuré (22/80/443)
- [ ] fail2ban actif
- [ ] HTTPS forcé partout
- [ ] Mots de passe seed changés
- [ ] CORS whitelisté
- [ ] Let's Encrypt installé + Cloudflare "Full strict"

### Sauvegardes
- [ ] Hetzner backups quotidiens activés
- [ ] pg_dump quotidien configuré
- [ ] Externalisation S3/Backblaze (optionnel mais recommandé)
- [ ] Test de restauration trimestriel

### Documentation
- [ ] Tous les secrets dans `~/Documents/secrets-{app}/`
- [ ] Permissions 600 sur les fichiers sensibles
- [ ] Procédure de déploiement à jour
- [ ] LESSONS_LEARNED.md mis à jour
- [ ] Variables d'environnement documentées dans `.env.example`

### Monitoring
- [ ] UptimeRobot configuré
- [ ] Alertes email actives
- [ ] (Optionnel) Sentry pour les erreurs JS

---

## 🆘 Commandes d'urgence

```bash
# === BACKEND ===
pm2 status
pm2 logs agri-pilot-api --lines 50
pm2 reload agri-pilot-api          # sans downtime
pm2 restart agri-pilot-api         # avec downtime

# === NGINX ===
sudo nginx -t && sudo systemctl reload nginx
sudo tail -f /var/log/nginx/api.agri-pilot.com.error.log

# === SÉCURITÉ ===
sudo fail2ban-client status sshd

# === SYSTÈME ===
df -h          # espace disque
htop           # ressources

# === BDD ===
psql -h localhost -U agri_pilot_user -d agri_pilot

# === FRONTEND DÉPLOIEMENT D'URGENCE ===
# Si le déploiement Cloudflare échoue :
# 1. Vérifier le dist local
# 2. Drag & drop via dashboard Cloudflare
```

---

## 🌐 URLs et accès finaux

| Service | URL / Accès |
|---|---|
| Frontend | https://agri-pilot.com |
| Frontend (alias) | https://www.agri-pilot.com |
| API | https://api.agri-pilot.com |
| Pages preview | https://agri-pilot-v2.pages.dev |
| Cloudflare | https://dash.cloudflare.com/ |
| Hetzner Cloud | https://console.hetzner.cloud/ |
| GitHub repo | https://github.com/USER/REPO |
| SSH serveur | `ssh ferme@VOTRE_IP` |
| BDD prod | `psql -h localhost -U agri_pilot_user -d agri_pilot` |

---

## 📁 Structure finale du dossier secrets

```
~/Documents/secrets-{app}/
├── README.txt                      # Inventaire
├── hetzner-recovery-key.txt        # 2FA Hetzner (CRITIQUE)
├── hetzner-server-info.txt         # IP, nom serveur, mdp ferme
├── postgres-prod.txt               # mdp BDD production
├── jwt-secret-prod.txt             # JWT secret
├── admin-passwords.txt             # mdp comptes seed après reset
└── cloudflare-api-token.txt        # token API si Wrangler utilisé
```

Permissions : dossier `chmod 700`, fichiers `chmod 600`.

---

**Document généré le 5 mai 2026**  
**Version 2.0 — Capitalisation des leçons d'expérience**  
**Durée 1er déploiement : 4-5h | Mises à jour : ~30 min**
