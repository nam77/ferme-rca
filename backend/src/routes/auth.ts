import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import {
  signerJeton,
  signerJetonReset,
  lireUtilisateurIdReset,
  verifierJetonReset,
} from '../lib/jeton.js'
import { envoyerEmail, emailConfigure } from '../lib/email.js'
import { verifierAuth, verifierRole } from '../middleware/auth.js'
import { Role, Filiere } from '../generated/prisma/enums.js'

// URL publique de l'app (pour bâtir le lien de réinitialisation).
const URL_APP = process.env.APP_URL ?? 'https://agri-pilot.com'

export const routeurAuth = Router()

const schemaInscription = z.object({
  email: z.string().email(),
  motDePasse: z.string().min(8).max(100),
  prenom: z.string().min(1).max(50),
  nom: z.string().min(1).max(50),
  telephone: z.string().max(40).optional().nullable(),
  role: z.enum([Role.admin, Role.gestionnaire, Role.responsable, Role.ouvrier, Role.investisseur]).optional(),
  filiere: z.enum([
    Filiere.pisciculture,
    Filiere.aviculture,
    Filiere.porcins,
    Filiere.caprins,
    Filiere.cultures,
    Filiere.infrastructure,
    Filiere.habitat,
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

// Création de compte réservée à un administrateur authentifié.
// (Auparavant publique : n'importe qui pouvait créer un compte avec n'importe
// quel rôle, y compris admin → élévation de privilèges.)
routeurAuth.post('/inscription', verifierAuth, verifierRole(Role.admin), async (req: Request, res: Response) => {
  const parsed = schemaInscription.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides', details: parsed.error.issues })
    return
  }
  const { email, motDePasse, prenom, nom, telephone, role, filiere } = parsed.data
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
        telephone: telephone?.trim() || null,
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
    // On envoie l'email seulement si le compte existe — mais la réponse reste
    // générique pour ne pas révéler l'existence d'un compte (anti-énumération).
    if (utilisateur && emailConfigure()) {
      const jetonReset = signerJetonReset(utilisateur.id, utilisateur.motDePasseHash)
      const lien = `${URL_APP}/reinitialiser?token=${encodeURIComponent(jetonReset)}`
      try {
        await envoyerEmail({
          destinataire: utilisateur.email,
          sujet: 'Réinitialisation de votre mot de passe — AgroPilot',
          html: `
            <div style="font-family:Arial,sans-serif;font-size:15px;color:#2d1f0e;line-height:1.6">
              <p>Bonjour ${utilisateur.prenom},</p>
              <p>Vous avez demandé à réinitialiser votre mot de passe AgroPilot.
                 Cliquez sur le bouton ci-dessous (lien valable <strong>1 heure</strong>) :</p>
              <p style="margin:24px 0">
                <a href="${lien}" style="background:#4a8c3f;color:#fff;text-decoration:none;
                   padding:12px 22px;border-radius:8px;font-weight:bold">Réinitialiser mon mot de passe</a>
              </p>
              <p style="font-size:13px;color:#5c3d1e">Si le bouton ne fonctionne pas, copiez ce lien :<br>
                <a href="${lien}">${lien}</a></p>
              <p style="font-size:13px;color:#8b5e3c">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
            </div>`,
        })
      } catch (e) {
        console.error('[auth] échec envoi email reset:', e instanceof Error ? e.message : e)
      }
    } else if (utilisateur && !emailConfigure()) {
      console.warn(`[auth] Reset demandé pour ${email} mais RESEND_API_KEY absent.`)
    }
    res.json({
      succes: true,
      message:
        "Si un compte existe pour cette adresse, un email de réinitialisation vient d'être envoyé.",
    })
  } catch (erreur) {
    console.error('Erreur mot-de-passe-oublie:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

// ─────────── Réinitialisation via le jeton reçu par email ───────────
const schemaReinitialiser = z.object({
  token: z.string().min(10),
  nouveauMotDePasse: z.string().min(8).max(100),
})

routeurAuth.post('/reinitialiser-mot-de-passe', async (req: Request, res: Response) => {
  const parsed = schemaReinitialiser.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides (mot de passe : 8 caractères min)' })
    return
  }
  try {
    const utilisateurId = lireUtilisateurIdReset(parsed.data.token)
    if (!utilisateurId) {
      res.status(400).json({ succes: false, message: 'Lien invalide' })
      return
    }
    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: utilisateurId } })
    if (!utilisateur) {
      res.status(400).json({ succes: false, message: 'Lien invalide' })
      return
    }
    // La clé de vérification dérive du hash actuel : un lien déjà utilisé
    // (mot de passe changé) devient automatiquement invalide.
    try {
      verifierJetonReset(parsed.data.token, utilisateur.motDePasseHash)
    } catch {
      res.status(400).json({ succes: false, message: 'Lien expiré ou déjà utilisé' })
      return
    }
    const motDePasseHash = await bcrypt.hash(parsed.data.nouveauMotDePasse, 10)
    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { motDePasseHash, actif: true },
    })
    res.json({ succes: true, message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' })
  } catch (erreur) {
    console.error('Erreur reinitialiser-mot-de-passe:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

// ─────────── Réinitialisation du mot de passe par un admin ───────────
// Un administrateur authentifié définit un nouveau mot de passe pour
// n'importe quel compte (lui-même ou un autre). Le mot de passe n'est
// jamais renvoyé ni journalisé.
const schemaResetMotDePasse = z.object({
  motDePasse: z.string().min(8).max(100),
})

routeurAuth.patch(
  '/utilisateurs/:id/mot-de-passe',
  verifierAuth,
  verifierRole(Role.admin),
  async (req: Request, res: Response) => {
    const parsed = schemaResetMotDePasse.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ succes: false, message: 'Mot de passe invalide (8 caractères minimum)' })
      return
    }
    try {
      const cible = await prisma.utilisateur.findUnique({ where: { id: req.params.id } })
      if (!cible) {
        res.status(404).json({ succes: false, message: 'Compte introuvable' })
        return
      }
      const motDePasseHash = await bcrypt.hash(parsed.data.motDePasse, 10)
      await prisma.utilisateur.update({
        where: { id: req.params.id },
        data: { motDePasseHash },
      })
      res.json({ succes: true, message: `Mot de passe réinitialisé pour ${cible.email}` })
    } catch (erreur) {
      console.error('Erreur reset mot de passe admin:', erreur)
      res.status(500).json({ succes: false, message: 'Erreur serveur' })
    }
  },
)

// ─────────── Liste de tous les utilisateurs (admin) ───────────
routeurAuth.get(
  '/utilisateurs',
  verifierAuth,
  verifierRole(Role.admin),
  async (_req: Request, res: Response) => {
    try {
      const utilisateurs = await prisma.utilisateur.findMany({
        orderBy: [{ actif: 'desc' }, { role: 'asc' }, { nom: 'asc' }],
        select: {
          id: true,
          prenom: true,
          nom: true,
          email: true,
          telephone: true,
          role: true,
          filiere: true,
          actif: true,
          creeLe: true,
        },
      })
      res.json({ succes: true, donnees: utilisateurs })
    } catch (erreur) {
      console.error('Erreur GET /auth/utilisateurs:', erreur)
      res.status(500).json({ succes: false, message: 'Erreur serveur' })
    }
  },
)

// ─────────── Mise à jour d'un utilisateur (admin) ───────────
const enumZodRole = z.enum([
  Role.admin, Role.gestionnaire, Role.responsable, Role.ouvrier, Role.investisseur,
])
const enumZodFiliere = z.enum([
  Filiere.pisciculture, Filiere.aviculture, Filiere.porcins, Filiere.caprins,
  Filiere.cultures, Filiere.infrastructure, Filiere.habitat,
])

const schemaMajUtilisateur = z.object({
  prenom: z.string().min(1).max(50).optional(),
  nom: z.string().min(1).max(50).optional(),
  telephone: z.string().max(40).optional().nullable(),
  role: enumZodRole.optional(),
  filiere: enumZodFiliere.optional().nullable(),
  actif: z.boolean().optional(),
})

routeurAuth.patch(
  '/utilisateurs/:id',
  verifierAuth,
  verifierRole(Role.admin),
  async (req: Request, res: Response) => {
    const parsed = schemaMajUtilisateur.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ succes: false, message: 'Données invalides' })
      return
    }
    try {
      const cible = await prisma.utilisateur.findUnique({ where: { id: req.params.id } })
      if (!cible) {
        res.status(404).json({ succes: false, message: 'Compte introuvable' })
        return
      }
      // Garde-fou : empêche de retirer son propre rôle admin / de se désactiver
      // soi-même (évite de se verrouiller dehors).
      const estMoi = req.utilisateur!.utilisateurId === cible.id
      if (estMoi && parsed.data.role !== undefined && parsed.data.role !== Role.admin) {
        res.status(400).json({ succes: false, message: 'Vous ne pouvez pas retirer votre propre rôle admin' })
        return
      }
      if (estMoi && parsed.data.actif === false) {
        res.status(400).json({ succes: false, message: 'Vous ne pouvez pas désactiver votre propre compte' })
        return
      }
      const data: Record<string, unknown> = {}
      if (parsed.data.prenom !== undefined) data.prenom = parsed.data.prenom
      if (parsed.data.nom !== undefined) data.nom = parsed.data.nom
      if (parsed.data.telephone !== undefined) data.telephone = parsed.data.telephone
      if (parsed.data.role !== undefined) data.role = parsed.data.role
      if (parsed.data.filiere !== undefined) data.filiere = parsed.data.filiere
      if (parsed.data.actif !== undefined) data.actif = parsed.data.actif
      const misAJour = await prisma.utilisateur.update({
        where: { id: req.params.id },
        data,
        select: {
          id: true, prenom: true, nom: true, email: true, telephone: true,
          role: true, filiere: true, actif: true, creeLe: true,
        },
      })
      res.json({ succes: true, donnees: misAJour })
    } catch (erreur) {
      console.error('Erreur PATCH /auth/utilisateurs/:id:', erreur)
      res.status(500).json({ succes: false, message: 'Erreur serveur' })
    }
  },
)

// ─────────── Changer son propre mot de passe (self-service) ───────────
// L'utilisateur connecté fournit son ancien mot de passe + le nouveau.
const schemaChangerMonMotDePasse = z.object({
  ancienMotDePasse: z.string().min(1),
  nouveauMotDePasse: z.string().min(8).max(100),
})

routeurAuth.patch('/mon-mot-de-passe', verifierAuth, async (req: Request, res: Response) => {
  const parsed = schemaChangerMonMotDePasse.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Nouveau mot de passe invalide (8 caractères minimum)' })
    return
  }
  try {
    const moi = await prisma.utilisateur.findUnique({ where: { id: req.utilisateur!.utilisateurId } })
    if (!moi) {
      res.status(404).json({ succes: false, message: 'Compte introuvable' })
      return
    }
    const ancienOk = await bcrypt.compare(parsed.data.ancienMotDePasse, moi.motDePasseHash)
    if (!ancienOk) {
      res.status(401).json({ succes: false, message: 'Ancien mot de passe incorrect' })
      return
    }
    const motDePasseHash = await bcrypt.hash(parsed.data.nouveauMotDePasse, 10)
    await prisma.utilisateur.update({ where: { id: moi.id }, data: { motDePasseHash } })
    res.json({ succes: true, message: 'Mot de passe changé' })
  } catch (erreur) {
    console.error('Erreur changement mon mot de passe:', erreur)
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
