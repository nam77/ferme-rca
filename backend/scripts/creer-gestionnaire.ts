// Crée (ou met à jour) le compte gestionnaire « gestion » sur la base
// actuelle, sans réinitialiser les autres données.
//
//   cd backend && GESTION_PASSWORD='...' npx tsx scripts/creer-gestionnaire.ts
//
// Le mot de passe est lu depuis l'environnement (GESTION_PASSWORD) — jamais
// codé en dur : ce dépôt est public. Il ne sert qu'à la CRÉATION du compte
// (upsert non destructif : un compte existant conserve son mot de passe).
// Pour réinitialiser le mot de passe d'un compte existant, utiliser plutôt
// scripts/reinitialiser-mot-de-passe.ts (workflow « break-glass »).
//
// Le rôle « gestionnaire » doit exister dans la base (voir schema.prisma) :
//   npx prisma db push   # synchronise l'enum Role avant d'exécuter ce script
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'
import { Role } from '../src/generated/prisma/enums.js'

const EMAIL = 'gestion@ferme.rca'
const MOT_DE_PASSE = process.env.GESTION_PASSWORD ?? ''

async function main() {
  if (MOT_DE_PASSE.length < 8) {
    console.error('✗ GESTION_PASSWORD manquant ou trop court (8 caractères minimum).')
    console.error("  Exemple : GESTION_PASSWORD='motdepasse' npx tsx scripts/creer-gestionnaire.ts")
    process.exit(1)
  }
  const motDePasseHash = await bcrypt.hash(MOT_DE_PASSE, 10)

  // Idempotent et non destructif : si le compte existe déjà, on ne réinitialise
  // PAS son mot de passe (il a pu être changé en production). On garantit
  // seulement le rôle et l'état actif. Le mot de passe n'est posé qu'à la création.
  const compte = await prisma.utilisateur.upsert({
    where: { email: EMAIL },
    update: {
      role: Role.gestionnaire,
      actif: true,
    },
    create: {
      email: EMAIL,
      motDePasseHash,
      prenom: 'Gestion',
      nom: 'Réalisation',
      role: Role.gestionnaire,
      filiere: null,
    },
    select: { id: true, email: true, prenom: true, nom: true, role: true },
  })

  console.log('✅ Compte gestionnaire prêt :')
  console.log(`   email    : ${compte.email}`)
  console.log(`   rôle     : ${compte.role}`)
  // Le mot de passe n'est jamais affiché (dépôt public / logs).
}

main()
  .catch((erreur) => {
    console.error('❌ Échec de la création du gestionnaire :', erreur)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
