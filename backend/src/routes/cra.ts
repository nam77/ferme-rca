import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { verifierAuth } from '../middleware/auth.js'
import { TypeJourCRA } from '../generated/prisma/enums.js'

export const routeurCRA = Router()

const enumZod = <T extends Record<string, string>>(e: T) =>
  z.enum(Object.values(e) as [string, ...string[]])

const schemaSaisie = z.object({
  utilisateurId: z.string().optional(),
  date: z.string(), // YYYY-MM-DD
  type: enumZod(TypeJourCRA).optional(),
  heures: z.number().min(0).max(24).optional(),
  notes: z.string().max(500).optional().nullable(),
})

routeurCRA.use(verifierAuth)

/**
 * GET /api/cra?mois=YYYY-MM&utilisateurId=...
 * Retourne les saisies du mois (pour l'utilisateur demandé, ou tous si admin et pas filtre).
 */
routeurCRA.get('/', async (req: Request, res: Response) => {
  try {
    const mois = (req.query.mois as string | undefined) || new Date().toISOString().slice(0, 7)
    const utilisateurId = req.query.utilisateurId as string | undefined

    const debut = new Date(`${mois}-01T00:00:00Z`)
    const finMois = new Date(debut)
    finMois.setUTCMonth(finMois.getUTCMonth() + 1)

    const where: Record<string, unknown> = {
      date: { gte: debut, lt: finMois },
    }
    if (utilisateurId) where.utilisateurId = utilisateurId

    const saisies = await prisma.saisieJourCRA.findMany({
      where,
      include: {
        utilisateur: { select: { id: true, prenom: true, nom: true, email: true, role: true } },
      },
      orderBy: { date: 'asc' },
    })
    res.json({ succes: true, donnees: saisies })
  } catch (erreur) {
    console.error('Erreur GET /cra:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * GET /api/cra/utilisateurs — liste des utilisateurs actifs (pour le sélecteur côté UI)
 */
routeurCRA.get('/utilisateurs', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.utilisateur.findMany({
      where: { actif: true },
      select: { id: true, prenom: true, nom: true, role: true, filiere: true },
      orderBy: [{ prenom: 'asc' }],
    })
    res.json({ succes: true, donnees: users })
  } catch (erreur) {
    console.error('Erreur GET /cra/utilisateurs:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * POST /api/cra : upsert une saisie pour (utilisateurId, date)
 * Body : { utilisateurId?, date: 'YYYY-MM-DD', type, heures?, notes? }
 * Si utilisateurId absent → on prend req.utilisateur.utilisateurId
 */
routeurCRA.post('/', async (req: Request, res: Response) => {
  const parsed = schemaSaisie.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides', details: parsed.error.issues })
    return
  }
  try {
    const utilisateurId = parsed.data.utilisateurId || req.utilisateur!.utilisateurId
    const date = new Date(parsed.data.date + 'T00:00:00Z')
    const type = (parsed.data.type as TypeJourCRA | undefined) ?? TypeJourCRA.travail
    const heures = parsed.data.heures ?? (type === TypeJourCRA.travail ? 8 : 0)

    const saisie = await prisma.saisieJourCRA.upsert({
      where: { utilisateurId_date: { utilisateurId, date } },
      create: {
        utilisateurId,
        date,
        type,
        heures,
        notes: parsed.data.notes ?? null,
      },
      update: {
        type,
        heures,
        notes: parsed.data.notes ?? null,
      },
      include: {
        utilisateur: { select: { id: true, prenom: true, nom: true } },
      },
    })
    res.json({ succes: true, donnees: saisie })
  } catch (erreur) {
    console.error('Erreur POST /cra:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * DELETE /api/cra/:id — supprime une saisie
 */
routeurCRA.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.saisieJourCRA.delete({ where: { id: req.params.id } })
    res.json({ succes: true, message: 'Saisie supprimée' })
  } catch (erreur) {
    console.error('Erreur DELETE /cra:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * GET /api/cra/recap?mois=YYYY-MM
 * Recap par utilisateur : nombre de jours travaillés / absences / etc.
 */
routeurCRA.get('/recap', async (req: Request, res: Response) => {
  try {
    const mois = (req.query.mois as string | undefined) || new Date().toISOString().slice(0, 7)
    const debut = new Date(`${mois}-01T00:00:00Z`)
    const finMois = new Date(debut)
    finMois.setUTCMonth(finMois.getUTCMonth() + 1)

    const saisies = await prisma.saisieJourCRA.findMany({
      where: { date: { gte: debut, lt: finMois } },
      include: {
        utilisateur: { select: { id: true, prenom: true, nom: true, role: true } },
      },
    })

    // Agrégation par utilisateur
    type Agrege = {
      utilisateur: { id: string; prenom: string; nom: string; role: string }
      compteurs: Record<TypeJourCRA, number>
      heuresTotales: number
    }
    const par: Record<string, Agrege> = {}
    for (const s of saisies) {
      const k = s.utilisateurId
      if (!par[k]) {
        par[k] = {
          utilisateur: s.utilisateur,
          compteurs: {
            travail: 0, absence: 0, conge: 0, maladie: 0, formation: 0, ferie: 0,
          },
          heuresTotales: 0,
        }
      }
      par[k].compteurs[s.type] = (par[k].compteurs[s.type] || 0) + 1
      par[k].heuresTotales += s.heures
    }

    res.json({ succes: true, donnees: Object.values(par) })
  } catch (erreur) {
    console.error('Erreur GET /cra/recap:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})
