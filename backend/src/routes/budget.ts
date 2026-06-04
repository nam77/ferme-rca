import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { verifierAuth } from '../middleware/auth.js'
import { Phase, Role } from '../generated/prisma/enums.js'

export const routeurBudget = Router()

const enumZod = <T extends Record<string, string>>(e: T) =>
  z.enum(Object.values(e) as [string, ...string[]])

const schemaCreation = z.object({
  phase: enumZod(Phase),
  categorie: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  montantPrevu: z.number().nonnegative(),
  montantReel: z.number().nonnegative().optional(),
  devise: z.string().min(1).max(10).optional(),
})

const schemaMiseAJour = z.object({
  phase: enumZod(Phase).optional(),
  categorie: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  montantPrevu: z.number().nonnegative().optional(),
  montantReel: z.number().nonnegative().optional(),
  devise: z.string().min(1).max(10).optional(),
})

const enUtilisateur = (req: Request) => req.utilisateur!

const decimalEnNumber = (d: unknown): number => {
  if (typeof d === 'number') return d
  if (typeof d === 'string') return Number(d)
  if (d && typeof (d as { toNumber?: () => number }).toNumber === 'function') {
    return (d as { toNumber: () => number }).toNumber()
  }
  return 0
}

routeurBudget.use(verifierAuth)

routeurBudget.get('/', async (_req: Request, res: Response) => {
  try {
    const lignes = await prisma.budgetLigne.findMany({
      orderBy: [{ phase: 'asc' }, { categorie: 'asc' }],
      include: {
        taches: {
          select: {
            id: true,
            titre: true,
            statut: true,
            filiere: true,
            montantBudget: true,
            montantDepense: true,
          },
          orderBy: { creeLe: 'desc' },
        },
      },
    })
    const lignesNumber = lignes.map((l) => {
      const taches = l.taches.map((t) => ({
        id: t.id,
        titre: t.titre,
        statut: t.statut,
        filiere: t.filiere,
        montantBudget: t.montantBudget != null ? decimalEnNumber(t.montantBudget) : null,
        montantDepense: t.montantDepense != null ? decimalEnNumber(t.montantDepense) : null,
      }))
      // Budget réel = somme des dépenses des tâches enfants (auto-calculé).
      const montantReel = taches.reduce((s, t) => s + (t.montantDepense ?? 0), 0)
      return {
        ...l,
        montantPrevu: decimalEnNumber(l.montantPrevu),
        montantReel,
        taches,
      }
    })

    const groupes: Record<string, typeof lignesNumber> = {
      phase_1_infrastructure: [],
      phase_2_lancement: [],
      phase_3_exploitation: [],
    }
    for (const l of lignesNumber) {
      groupes[l.phase].push(l)
    }

    const totalParPhase: Record<string, { prevu: number; reel: number }> = {}
    let totalPrevu = 0
    let totalReel = 0
    for (const [phase, liste] of Object.entries(groupes)) {
      const prevu = liste.reduce((s, l) => s + l.montantPrevu, 0)
      const reel = liste.reduce((s, l) => s + l.montantReel, 0)
      totalParPhase[phase] = { prevu, reel }
      totalPrevu += prevu
      totalReel += reel
    }

    res.json({
      succes: true,
      donnees: {
        groupes,
        totalParPhase,
        totalPrevu,
        totalReel,
      },
    })
  } catch (erreur) {
    console.error('Erreur GET /budget:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurBudget.post('/', async (req: Request, res: Response) => {
  if (enUtilisateur(req).role !== Role.admin) {
    res.status(403).json({ succes: false, message: 'Création réservée à admin' })
    return
  }
  const parsed = schemaCreation.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides', details: parsed.error.issues })
    return
  }
  try {
    const cree = await prisma.budgetLigne.create({
      data: {
        phase: parsed.data.phase as Phase,
        categorie: parsed.data.categorie,
        description: parsed.data.description ?? null,
        montantPrevu: parsed.data.montantPrevu,
        montantReel: parsed.data.montantReel ?? 0,
        devise: parsed.data.devise ?? 'XAF',
      },
    })
    res.status(201).json({ succes: true, donnees: cree })
  } catch (erreur) {
    console.error('Erreur POST /budget:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurBudget.patch('/:id', async (req: Request, res: Response) => {
  const role = enUtilisateur(req).role
  if (role !== Role.admin && role !== Role.responsable) {
    res.status(403).json({ succes: false, message: 'Édition réservée à admin/responsable' })
    return
  }
  const parsed = schemaMiseAJour.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides' })
    return
  }
  // Un responsable ne peut éditer que le montant réel
  if (role === Role.responsable) {
    const cles = Object.keys(parsed.data)
    if (cles.some((c) => c !== 'montantReel')) {
      res.status(403).json({ succes: false, message: 'Responsable : seul montantReel modifiable' })
      return
    }
  }
  const { id } = req.params
  try {
    const data: Record<string, unknown> = {}
    if (parsed.data.phase !== undefined) data.phase = parsed.data.phase
    if (parsed.data.categorie !== undefined) data.categorie = parsed.data.categorie
    if (parsed.data.description !== undefined) data.description = parsed.data.description
    if (parsed.data.montantPrevu !== undefined) data.montantPrevu = parsed.data.montantPrevu
    if (parsed.data.montantReel !== undefined) data.montantReel = parsed.data.montantReel
    if (parsed.data.devise !== undefined) data.devise = parsed.data.devise

    const misAJour = await prisma.budgetLigne.update({ where: { id }, data })
    res.json({
      succes: true,
      donnees: {
        ...misAJour,
        montantPrevu: decimalEnNumber(misAJour.montantPrevu),
        montantReel: decimalEnNumber(misAJour.montantReel),
      },
    })
  } catch (erreur) {
    console.error('Erreur PATCH /budget:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurBudget.delete('/:id', async (req: Request, res: Response) => {
  if (enUtilisateur(req).role !== Role.admin) {
    res.status(403).json({ succes: false, message: 'Suppression réservée à admin' })
    return
  }
  const { id } = req.params
  try {
    await prisma.budgetLigne.delete({ where: { id } })
    res.json({ succes: true, message: 'Ligne supprimée' })
  } catch (erreur) {
    console.error('Erreur DELETE /budget:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})
