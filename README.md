# Ferme Agropastorale RCA — Outil de Pilotage

Application mobile et web pour piloter une ferme agropastorale de 8 ha en
République Centrafricaine (pisciculture, aviculture, porcins, caprins, cultures).

## Stack

- **Backend** : Node.js 20 + Express + Prisma + PostgreSQL
- **Mobile** : React Native + Expo SDK 50
- **Auth** : JWT
- **State** : Zustand

## Démarrage rapide

```bash
# Backend
cd backend
npm install
npm run dev

# Mobile (dans un autre terminal)
cd mobile
npm install
npx expo start
```

## Base de données locale

- Nom : `ferme_rca`
- Utilisateur : `ferme_user`
- Mot de passe : `ferme_dev_2026` (DEV uniquement, à changer en production)
- Connection string : `postgresql://ferme_user:ferme_dev_2026@localhost:5432/ferme_rca`

## Documentation Claude Code

- `CLAUDE.md` — Contexte global du projet, conventions, structure
- `.claude/skills/` — Patterns de code (React Native, API Express, Kanban)
- `.claude/mcp.json` — Connecteurs MCP (PostgreSQL, Context7, Exa)
- `prototype.html` — Prototype visuel et fonctionnel de référence

## Prochaines étapes

Lancer `claude` à la racine du projet, activer le Plan Mode (Shift+Tab),
puis demander à Claude Code de construire le projet en suivant CLAUDE.md
et les skills.
# ferme-rca
