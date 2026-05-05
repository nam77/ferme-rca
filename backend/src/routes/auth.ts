import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { signerJeton } from '../lib/jeton.js'
import { verifierAuth } from '../middleware/auth.js'
import { Role, Filiere } from '../generated/prisma/enums.js'

export const routeurAuth = Router()

const schemaInscription = z.object({
  email: z.string().email(),
  motDePasse: z.string().min(8).max(100),
  prenom: z.string().min(1).max(50),
  nom: z.string().min(1).max(50),
  role: z.enum([Role.admin, Role.responsable, Role.ouvrier, Role.investisseur]).optional(),
  filiere: z.enum([
    Filiere.pisciculture,
    Filiere.aviculture,
    Filiere.porcins,
    Filiere.caprins,
    Filiere.cultures,
    Filiere.infrastructure,
  ]).optional(),
})

const schemaConnexion = z.object({
  email: z.string().email(),
  motDePasse: z.string().min(1),
})

const schemaMotDePasseOublie = z.object({
  email: z.string().email(),
})

const profilPublic = (u: {
  id: string
  email: string
  prenom: string
  nom: string
  role: Role
  filiere: Filiere | null
}) => ({
  id: u.id,
  email: u.email,
  prenom: u.prenom,
  nom: u.nom,
  role: u.role,
  filiere: u.filiere,
})

routeurAuth.post('/inscription', async (req: Request, res: Response) => {
  const parsed = schemaInscription.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides', details: parsed.error.issues })
    return
  }
  const { email, motDePasse, prenom, nom, role, filiere } = parsed.data
  try {
    const existant = await prisma.utilisateur.findUnique({ where: { email } })
    if (existant) {
      res.status(409).json({ succes: false, message: 'Cet email est déjà utilisé' })
      return
    }
    const motDePasseHash = await bcrypt.hash(motDePasse, 10)
    const cree = await prisma.utilisateur.create({
      data: {
        email,
        motDePasseHash,
        prenom,
        nom,
        role: role ?? Role.ouvrier,
        filiere: filiere ?? null,
      },
    })
    const jeton = signerJeton({ utilisateurId: cree.id, email: cree.email, role: cree.role })
    res.status(201).json({ succes: true, donnees: { utilisateur: profilPublic(cree), jeton } })
  } catch (erreur) {
    console.error('Erreur inscription:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurAuth.post('/connexion', async (req: Request, res: Response) => {
  const parsed = schemaConnexion.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides' })
    return
  }
  const { email, motDePasse } = parsed.data
  try {
    const utilisateur = await prisma.utilisateur.findUnique({ where: { email } })
    if (!utilisateur || !utilisateur.actif) {
      res.status(401).json({ succes: false, message: 'Identifiants invalides' })
      return
    }
    const ok = await bcrypt.compare(motDePasse, utilisateur.motDePasseHash)
    if (!ok) {
      res.status(401).json({ succes: false, message: 'Identifiants invalides' })
      return
    }
    const jeton = signerJeton({
      utilisateurId: utilisateur.id,
      email: utilisateur.email,
      role: utilisateur.role,
    })
    res.json({ succes: true, donnees: { utilisateur: profilPublic(utilisateur), jeton } })
  } catch (erreur) {
    console.error('Erreur connexion:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurAuth.post('/mot-de-passe-oublie', async (req: Request, res: Response) => {
  const parsed = schemaMotDePasseOublie.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Email invalide' })
    return
  }
  const { email } = parsed.data
  try {
    const utilisateur = await prisma.utilisateur.findUnique({ where: { email } })
    if (utilisateur) {
      console.warn(
        `[auth] Demande de réinitialisation du mot de passe pour ${email} (id=${utilisateur.id}). ` +
          `Aucune infrastructure email n'est disponible : un administrateur doit réinitialiser ` +
          `manuellement via Prisma Studio (champ motDePasseHash).`,
      )
    }
    res.json({
      succes: true,
      message:
        "Si un compte existe pour cette adresse, un administrateur sera notifié et pourra réinitialiser votre mot de passe.",
    })
  } catch (erreur) {
    console.error('Erreur mot-de-passe-oublie:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurAuth.get('/moi', verifierAuth, async (req: Request, res: Response) => {
  try {
    const u = await prisma.utilisateur.findUnique({
      where: { id: req.utilisateur!.utilisateurId },
    })
    if (!u) {
      res.status(404).json({ succes: false, message: 'Utilisateur introuvable' })
      return
    }
    res.json({ succes: true, donnees: profilPublic(u) })
  } catch (erreur) {
    console.error('Erreur moi:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})
