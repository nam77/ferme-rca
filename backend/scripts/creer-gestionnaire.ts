// Crée (ou met à jour) le compte gestionnaire « gestion » sur la base
// actuelle, sans réinitialiser les autres données.
//
//   cd backend && npx tsx scripts/creer-gestionnaire.ts
//
// Le rôle « gestionnaire » doit exister dans la base (voir schema.prisma) :
//   npx prisma db push   # synchronise l'enum Role avant d'exécuter ce script
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'
import { Role } from '../src/generated/prisma/enums.js'

const EMAIL = 'gestion@ferme.rca'
const MOT_DE_PASSE = 'Yimbassa26'

async function main() {
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
  console.log(`   mot de passe : ${MOT_DE_PASSE}`)
  console.log(`   rôle     : ${compte.role}`)
}

main()
  .catch((erreur) => {
    console.error('❌ Échec de la création du gestionnaire :', erreur)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
