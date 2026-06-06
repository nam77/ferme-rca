/**
 * Réinitialise (ou crée) un compte : mot de passe, et optionnellement le rôle.
 *
 * Valeurs via l'environnement (jamais en arguments, pour ne rien fuiter) :
 *   RESET_EMAIL     (obligatoire) email du compte
 *   RESET_PASSWORD  (obligatoire) nouveau mot de passe (>= 8 caractères)
 *   RESET_ROLE      (optionnel)   admin | gestionnaire | responsable | ouvrier | investisseur
 *   RESET_PRENOM    (optionnel)   prénom si le compte doit être créé
 *   RESET_NOM       (optionnel)   nom si le compte doit être créé
 *
 * Si le compte existe : met à jour mot de passe (+ rôle si fourni) + réactive.
 * Sinon : le crée. Outil « break-glass », déclenché via GitHub Actions sur le
 * serveur de prod. Le mot de passe n'est jamais affiché.
 */
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'
import { Role } from '../src/generated/prisma/enums.js'

async function main(): Promise<void> {
  const email = (process.env.RESET_EMAIL ?? '').trim().toLowerCase()
  const motDePasse = process.env.RESET_PASSWORD ?? ''
  const roleBrut = (process.env.RESET_ROLE ?? '').trim()
  const prenom = (process.env.RESET_PRENOM ?? '').trim() || 'Compte'
  const nom = (process.env.RESET_NOM ?? '').trim() || 'AgroPilot'

  if (!email) {
    console.error('✗ RESET_EMAIL manquant')
    process.exit(1)
  }
  if (motDePasse.length < 8) {
    console.error('✗ RESET_PASSWORD manquant ou trop court (8 caractères minimum)')
    process.exit(1)
  }

  let role: Role | undefined
  if (roleBrut) {
    if (!(roleBrut in Role)) {
      console.error(`✗ RESET_ROLE invalide : ${roleBrut} (attendu: ${Object.values(Role).join(', ')})`)
      process.exit(1)
    }
    role = roleBrut as Role
  }

  const motDePasseHash = await bcrypt.hash(motDePasse, 10)
  const existant = await prisma.utilisateur.findUnique({ where: { email } })

  if (existant) {
    await prisma.utilisateur.update({
      where: { email },
      data: { motDePasseHash, actif: true, ...(role ? { role } : {}) },
    })
    console.log(
      `✓ Compte mis à jour : ${email} (rôle: ${role ?? existant.role}, mot de passe réinitialisé, compte actif)`,
    )
  } else {
    const cree = await prisma.utilisateur.create({
      data: {
        email,
        motDePasseHash,
        prenom,
        nom,
        role: role ?? Role.ouvrier,
        actif: true,
      },
    })
    console.log(`✓ Compte créé : ${email} (rôle: ${cree.role})`)
  }
}

main()
  .catch((e) => {
    console.error('✗ Erreur:', e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
