
# Ferme Agropastorale RCA — Outil de Pilotage

## Contexte du projet
Application mobile et web de pilotage d'une ferme agropastorale
de 8 hectares en République Centrafricaine (RCA).

## Composition de la ferme
- 5 bassins piscicoles Tilapia + Clarias (2 opérationnels en juin)
- 1 poulailler : 2000 poulets au démarrage (race Cobb 500 ou locale)
- 1 porcherie : 2 mâles + 10 femelles (Large White x race locale)
- Parc caprins : 2 mâles + 10 femelles (chèvre naine Afrique Ouest)
- Ovins : 1 mâle + 2 femelles (mouton Djallonké)
- 8 ha : maïs (2ha), manioc (2ha), légumes (1ha),
         Brachiaria fourragère (2ha), bananiers (0,5ha), jachère (0,5ha)

## Modèle économique circulaire
  Fientes poulailler -> fertilisation phytoplancton bassins
  Eaux résiduelles bassins + lisier porcs + fumier cabris
  -> compostage 45 jours -> irrigation et fertilisation champs
  Maïs et manioc autocultivés -> alimentation animaux (dès an 2)

## Stack technique
  Frontend : React Native 0.81 + Expo SDK 54 + React 19
  Navigation : Expo Router (basé sur React Navigation v7)
  Drag and Drop : @dnd-kit/core (web/tablet) + gesture handler (mobile)
  Graphiques : Victory Native
  Backend : Node.js 20 + Express 4
  ORM : Prisma 7 (générateur "prisma-client", client dans src/generated/prisma)
  Base de données : PostgreSQL 16
  Auth : JWT (jsonwebtoken) + bcrypt
  State : Zustand
  Offline : AsyncStorage + NetInfo

## Structure des dossiers
  /ferme-rca
    /backend
      /src/routes/      -- routes Express : auth, taches, budget, zones, dashboard,
                           cra, deploiement, lots, parcelles, ventes, admin-deploy
      /src/middleware/  -- auth.ts (auth JWT, validation Zod)
      /src/lib/         -- prisma.ts singleton, jeton.ts (JWT), helpers
      /src/generated/prisma/ -- client Prisma généré (ne pas versionner, gitignoré)
      /prisma/
        schema.prisma   -- 13 modèles, 16 enums (PAS de migrations : workflow `prisma db push`)
        seed.ts
      /scripts/         -- scripts d'admin (ex. creer-gestionnaire.ts)
      /uploads/         -- photos CRA uploadées (contenu gitignoré, .gitkeep versionné)
      .env.example
    /mobile
      /app/             -- routes Expo Router (file-based) : index, connexion, inscription,
                           mot-de-passe-oublie, dashboard, budget, activite, ferme, projet,
                           cheptel, cultures, cra, deploiement, _layout
      /src/screens/     -- EcranTableauDeBord, EcranBudget, EcranFerme, EcranActivite, EcranProjet
      /src/components/  -- BandeauReseau, IframePage, Toaster + /ui (BarreNavigation,
                           Bouton, Card, Hero, Pastille, Tag, EnteteSection)
      /src/hooks/       -- usePolices, useReseau
      /src/store/       -- Zustand stores (authStore, toastStore)
      /src/api/         -- appels axios (client.ts, auth.api.ts)
      /src/types/       -- types TypeScript
      /src/constants/
        couleurs.ts     -- couleurs par filière (NE PAS MODIFIER)
  Note : certaines pages métier (app complète, projet Yimbassa) sont servies via
  IframePage à partir de /mobile/public/*.html (agropilot-app.html, yimbassa.html).

## Couleurs par filière (CONSTANTES IMMUABLES)
  Pisciculture  : #1a6b8a  (bleu eau)
  Aviculture    : #e8943a  (orange poulet)
  Porcins       : #d4548a  (rose)
  Caprins/Ovins : #7b6e3e  (kaki terre)
  Cultures      : #4a8c3f  (vert feuille)
  Infrastructure: #6b6b6b  (gris béton)

## Statuts des tâches
  "a_faire"  -> colonne gauche Kanban (rouge)
  "en_cours" -> colonne centrale Kanban (orange)
  "termine"  -> colonne droite Kanban (vert)

## Rôles utilisateurs (enum Role)
  "admin"        -- accès total
  "gestionnaire" -- gestion/réalisation (ajouté en FIN d'enum : voir note schema.prisma)
  "responsable"  -- gestion tâches de sa filière uniquement
  "ouvrier"      -- consultation + mise à jour de ses tâches
  "investisseur" -- lecture seule (dashboard + budget)
  Sécurité : POST /auth/inscription est réservé aux admins authentifiés (commit 5cce90e).

## Conventions obligatoires
  - Tout le code en FRANÇAIS (variables, fonctions, commentaires, labels)
  - TypeScript strict - JAMAIS de "any"
  - Composants React Native : arrow functions
  - Styles : StyleSheet.create() uniquement, pas d'inline
  - Un composant = un fichier
  - Tester le build Expo avant chaque commit

## Accessibilité (critique pour l'usage terrain RCA)
  - Taille police minimum : 16px pour le contenu
  - Taille boutons minimum : height 48px, padding horizontal 20px
  - Contraste élevé (utilisation en plein soleil)
  - accessibilityLabel sur tous les boutons et cartes interactives

## Mode offline Kanban
  - AsyncStorage clé : "kanban_queue_actions"
  - Format action : { type, tacheId, nouveauStatut, timestamp }
  - Synchronisation automatique au retour de connexion (NetInfo)
  - Toast informatif quand l'action est mise en file d'attente

## Scripts de développement
  cd backend && npm run dev        -- API sur port 3001
  cd mobile && npm start           -- Expo dev server (port 8081)
  cd mobile && npm run web         -- App en mode navigateur
  cd mobile && npm run android     -- App sur Android
  cd backend && npx prisma studio  -- Interface base de données
  cd backend && npm run seed       -- Données initiales (reset + peuple)
  cd backend && npm run prisma:push -- Synchroniser le schéma (db push, PAS de migrate)
  cd backend && npm run prisma:generate -- Régénérer le client Prisma

## Skills disponibles (lire avant de coder)
  .claude/skills/react-native.md -- Patterns composants et écrans
  .claude/skills/api-express.md  -- Routes API et validation
  .claude/skills/kanban.md       -- Kanban drag and drop

## Périmètre fonctionnel (modules)
  Tâches/Kanban   -- modèle Tache + SousTache, statuts a_faire/en_cours/termine
  Budget          -- BudgetLigne (suivi des dépenses/recettes par filière)
  Cheptel         -- LotAnimaux + MouvementAnimal (espèces, sexe, catégories d'âge)
  Cultures        -- Parcelle + EvenementCulture (types de culture, statuts parcelle)
  Ventes          -- Vente (catégories produit, unités)
  CRA             -- SaisieJourCRA : compte-rendu d'activité journalier + Photo (uploads)
  Zones / Dashboard / Déploiement (admin-deploy : déploiement piloté depuis l'app)

## JAMAIS toucher sans validation explicite
  /mobile/src/constants/couleurs.ts -- Système couleurs défini
  .env et .env.example            -- Variables d'environnement
  enum Role (schema.prisma)       -- toute nouvelle valeur s'ajoute EN FIN (db push sûr)
  Note : pas de dossier /backend/prisma/migrations/ (workflow `prisma db push`).
      