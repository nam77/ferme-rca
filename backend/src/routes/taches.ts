import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { verifierAuthOptionnel, protegerMutations } from '../middleware/auth.js'
import { Filiere, Priorite, Statut } from '../generated/prisma/enums.js'

export const routeurTaches = Router()

const enumZod = <T extends Record<string, string>>(e: T) =>
  z.enum(Object.values(e) as [string, ...string[]])

const schemaCreation = z.object({
  titre: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  filiere: enumZod(Filiere),
  priorite: enumZod(Priorite).optional(),
  statut: enumZod(Statut).optional(),
  dateLimite: z.string().datetime().optional().nullable(),
  responsableId: z.string().optional().nullable(),
  zoneId: z.string().optional().nullable(),
  montantBudget: z.number().nonnegative().max(999_999_999.99).optional().nullable(),
  montantDepense: z.number().nonnegative().max(999_999_999.99).optional().nullable(),
  budgetLigneId: z.string().optional().nullable(),
})

const schemaMiseAJour = schemaCreation.partial()

const schemaChangementStatut = z.object({
  nouveauStatut: enumZod(Statut),
})

const inclureRelations = {
  responsable: { select: { id: true, prenom: true, nom: true, email: true } },
  createur: { select: { id: true, prenom: true, nom: true } },
  zone: { select: { id: true, nom: true } },
  sousTaches: { orderBy: { ordre: 'asc' as const } },
  operations: { orderBy: { date: 'asc' as const } },
} as const

// Recalcule le montantDepense d'une tâche = somme des montants de ses
// opérations. Appelé après chaque mutation d'opération. Le montantReel de la
// ligne budgétaire est lui recalculé à la volée par GET /budget.
async function recalculerDepense(tacheId: string): Promise<number> {
  const agg = await prisma.operationTache.aggregate({
    where: { tacheId },
    _sum: { montant: true },
  })
  const total = Number(agg._sum.montant ?? 0)
  await prisma.tache.update({ where: { id: tacheId }, data: { montantDepense: total } })
  return total
}

// Mode consultatif : GET ouvert au public anonyme,
// mutations bloquées (401) sans authentification.
routeurTaches.use(verifierAuthOptionnel, protegerMutations)

routeurTaches.get('/', async (req: Request, res: Response) => {
  const { filiere, statut, responsable } = req.query
  try {
    const where: Record<string, unknown> = {}
    if (typeof filiere === 'string') where.filiere = filiere
    if (typeof statut === 'string') where.statut = statut
    if (typeof responsable === 'string') where.responsableId = responsable

    const taches = await prisma.tache.findMany({
      where,
      include: inclureRelations,
      orderBy: [{ priorite: 'asc' }, { creeLe: 'desc' }],
    })
    res.json({ succes: true, donnees: taches })
  } catch (erreur) {
    console.error('Erreur GET /taches:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurTaches.post('/', async (req: Request, res: Response) => {
  const parsed = schemaCreation.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides', details: parsed.error.issues })
    return
  }
  try {
    const cree = await prisma.tache.create({
      data: {
        titre: parsed.data.titre,
        description: parsed.data.description ?? null,
        filiere: parsed.data.filiere as Filiere,
        priorite: (parsed.data.priorite as Priorite | undefined) ?? Priorite.moyenne,
        statut: (parsed.data.statut as Statut | undefined) ?? Statut.a_faire,
        dateLimite: parsed.data.dateLimite ? new Date(parsed.data.dateLimite) : null,
        responsableId: parsed.data.responsableId ?? null,
        zoneId: parsed.data.zoneId ?? null,
        montantBudget: parsed.data.montantBudget ?? null,
        montantDepense: parsed.data.montantDepense ?? null,
        budgetLigneId: parsed.data.budgetLigneId ?? null,
        createurId: req.utilisateur!.utilisateurId,
      },
      include: inclureRelations,
    })
    res.status(201).json({ succes: true, donnees: cree })
  } catch (erreur) {
    console.error('Erreur POST /taches:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurTaches.patch('/:id/statut', async (req: Request, res: Response) => {
  const parsed = schemaChangementStatut.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides' })
    return
  }
  const { id } = req.params
  try {
    const tache = await prisma.tache.findUnique({ where: { id } })
    if (!tache) {
      res.status(404).json({ succes: false, message: 'Tâche introuvable' })
      return
    }
    const nouveauStatut = parsed.data.nouveauStatut as Statut
    if (nouveauStatut === tache.statut) {
      const inchange = await prisma.tache.findUnique({ where: { id }, include: inclureRelations })
      res.json({ succes: true, donnees: inchange })
      return
    }
    const [misAJour] = await prisma.$transaction([
      prisma.tache.update({
        where: { id },
        data: {
          statut: nouveauStatut,
          dateFinReelle: nouveauStatut === Statut.termine ? new Date() : null,
          dateDebut: nouveauStatut === Statut.en_cours && !tache.dateDebut ? new Date() : tache.dateDebut,
        },
        include: inclureRelations,
      }),
      prisma.mouvement.create({
        data: {
          tacheId: id,
          ancienStatut: tache.statut,
          nouveauStatut,
          auteurId: req.utilisateur!.utilisateurId,
        },
      }),
    ])
    res.json({ succes: true, donnees: misAJour })
  } catch (erreur) {
    console.error('Erreur PATCH /taches/:id/statut:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurTaches.patch('/:id', async (req: Request, res: Response) => {
  const parsed = schemaMiseAJour.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides' })
    return
  }
  const { id } = req.params
  try {
    const tache = await prisma.tache.findUnique({ where: { id } })
    if (!tache) {
      res.status(404).json({ succes: false, message: 'Tâche introuvable' })
      return
    }
    const data: Record<string, unknown> = {}
    if (parsed.data.titre !== undefined) data.titre = parsed.data.titre
    if (parsed.data.description !== undefined) data.description = parsed.data.description
    if (parsed.data.filiere !== undefined) data.filiere = parsed.data.filiere
    if (parsed.data.priorite !== undefined) data.priorite = parsed.data.priorite
    if (parsed.data.statut !== undefined) data.statut = parsed.data.statut
    if (parsed.data.dateLimite !== undefined) {
      data.dateLimite = parsed.data.dateLimite ? new Date(parsed.data.dateLimite) : null
    }
    if (parsed.data.responsableId !== undefined) data.responsableId = parsed.data.responsableId
    if (parsed.data.zoneId !== undefined) data.zoneId = parsed.data.zoneId
    if (parsed.data.montantBudget !== undefined) data.montantBudget = parsed.data.montantBudget
    if (parsed.data.montantDepense !== undefined) data.montantDepense = parsed.data.montantDepense
    if (parsed.data.budgetLigneId !== undefined) data.budgetLigneId = parsed.data.budgetLigneId

    const misAJour = await prisma.tache.update({
      where: { id },
      data,
      include: inclureRelations,
    })
    res.json({ succes: true, donnees: misAJour })
  } catch (erreur) {
    console.error('Erreur PATCH /taches/:id:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurTaches.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const tache = await prisma.tache.findUnique({ where: { id } })
    if (!tache) {
      res.status(404).json({ succes: false, message: 'Tâche introuvable' })
      return
    }
    await prisma.tache.delete({ where: { id } })
    res.json({ succes: true, message: 'Tâche supprimée' })
  } catch (erreur) {
    console.error('Erreur DELETE /taches/:id:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

// ─────────────────────── Sous-tâches (checklist) ───────────────────────

const schemaSousTacheCreation = z.object({
  titre: z.string().min(1).max(200),
})

const schemaSousTacheMaj = z.object({
  titre: z.string().min(1).max(200).optional(),
  faite: z.boolean().optional(),
  ordre: z.number().int().nonnegative().optional(),
})

routeurTaches.post('/:id/sous-taches', async (req: Request, res: Response) => {
  const parsed = schemaSousTacheCreation.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides' })
    return
  }
  try {
    const tache = await prisma.tache.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!tache) {
      res.status(404).json({ succes: false, message: 'Tâche introuvable' })
      return
    }
    const dernier = await prisma.sousTache.findFirst({
      where: { tacheId: req.params.id },
      orderBy: { ordre: 'desc' },
      select: { ordre: true },
    })
    const cree = await prisma.sousTache.create({
      data: {
        tacheId: req.params.id,
        titre: parsed.data.titre,
        ordre: (dernier?.ordre ?? -1) + 1,
      },
    })
    res.status(201).json({ succes: true, donnees: cree })
  } catch (erreur) {
    console.error('Erreur POST sous-tache:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurTaches.patch('/:id/sous-taches/:sousId', async (req: Request, res: Response) => {
  const parsed = schemaSousTacheMaj.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides' })
    return
  }
  try {
    const sous = await prisma.sousTache.findUnique({ where: { id: req.params.sousId } })
    if (!sous || sous.tacheId !== req.params.id) {
      res.status(404).json({ succes: false, message: 'Sous-tâche introuvable' })
      return
    }
    const data: Record<string, unknown> = {}
    if (parsed.data.titre !== undefined) data.titre = parsed.data.titre
    if (parsed.data.faite !== undefined) data.faite = parsed.data.faite
    if (parsed.data.ordre !== undefined) data.ordre = parsed.data.ordre
    const misAJour = await prisma.sousTache.update({ where: { id: req.params.sousId }, data })
    res.json({ succes: true, donnees: misAJour })
  } catch (erreur) {
    console.error('Erreur PATCH sous-tache:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurTaches.delete('/:id/sous-taches/:sousId', async (req: Request, res: Response) => {
  try {
    const sous = await prisma.sousTache.findUnique({ where: { id: req.params.sousId } })
    if (!sous || sous.tacheId !== req.params.id) {
      res.status(404).json({ succes: false, message: 'Sous-tâche introuvable' })
      return
    }
    await prisma.sousTache.delete({ where: { id: req.params.sousId } })
    res.json({ succes: true, message: 'Sous-tâche supprimée' })
  } catch (erreur) {
    console.error('Erreur DELETE sous-tache:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

// ──────────────── Opérations de dépense (consommation budget) ────────────────

const schemaOperationCreation = z.object({
  libelle: z.string().min(1).max(200),
  montant: z.number().nonnegative().max(999_999_999.99),
})

routeurTaches.post('/:id/operations', async (req: Request, res: Response) => {
  const parsed = schemaOperationCreation.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides' })
    return
  }
  try {
    const tache = await prisma.tache.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!tache) {
      res.status(404).json({ succes: false, message: 'Tâche introuvable' })
      return
    }
    const operation = await prisma.operationTache.create({
      data: {
        tacheId: req.params.id,
        libelle: parsed.data.libelle,
        montant: parsed.data.montant,
      },
    })
    const montantDepense = await recalculerDepense(req.params.id)
    res.status(201).json({ succes: true, donnees: { operation, montantDepense } })
  } catch (erreur) {
    console.error('Erreur POST operation:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurTaches.delete('/:id/operations/:opId', async (req: Request, res: Response) => {
  try {
    const operation = await prisma.operationTache.findUnique({ where: { id: req.params.opId } })
    if (!operation || operation.tacheId !== req.params.id) {
      res.status(404).json({ succes: false, message: 'Opération introuvable' })
      return
    }
    await prisma.operationTache.delete({ where: { id: req.params.opId } })
    const montantDepense = await recalculerDepense(req.params.id)
    res.json({ succes: true, donnees: { montantDepense } })
  } catch (erreur) {
    console.error('Erreur DELETE operation:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})
