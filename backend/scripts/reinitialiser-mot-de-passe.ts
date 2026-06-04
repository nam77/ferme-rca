/**
 * Réinitialise le mot de passe d'un compte existant.
 *
 * Usage (les valeurs viennent de l'environnement, JAMAIS des arguments,
 * pour éviter toute fuite dans l'historique shell ou les logs) :
 *
 *   RESET_EMAIL="admin@ferme.rca" RESET_PASSWORD="..." \
 *     npx tsx scripts/reinitialiser-mot-de-passe.ts
 *
 * Conçu comme outil « break-glass » : déclenché par le workflow GitHub
 * Actions `reinitialiser-mot-de-passe.yml` qui SSH vers le serveur de prod.
 * Le mot de passe n'est jamais affiché.
 */
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

async function main(): Promise<void> {
  const email = (process.env.RESET_EMAIL ?? '').trim().toLowerCase()
  const motDePasse = process.env.RESET_PASSWORD ?? ''

  if (!email) {
    console.error('✗ RESET_EMAIL manquant')
    process.exit(1)
  }
  if (motDePasse.length < 8) {
    console.error('✗ RESET_PASSWORD manquant ou trop court (8 caractères minimum)')
    process.exit(1)
  }

  const utilisateur = await prisma.utilisateur.findUnique({ where: { email } })
  if (!utilisateur) {
    console.error(`✗ Aucun compte avec l'email ${email}`)
    process.exit(1)
  }

  const motDePasseHash = await bcrypt.hash(motDePasse, 10)
  await prisma.utilisateur.update({
    where: { email },
    data: { motDePasseHash, actif: true },
  })

  // On confirme le compte touché et son rôle — jamais le mot de passe.
  console.log(`✓ Mot de passe réinitialisé pour ${email} (rôle: ${utilisateur.role}, compte réactivé)`)
}

main()
  .catch((e) => {
    console.error('✗ Erreur:', e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
