import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { verifierAuth } from '../middleware/auth.js'
import {
  TypeCulture,
  StatutParcelle,
  TypeEvenementCulture,
} from '../generated/prisma/enums.js'

export const routeurParcelles = Router()

const enumZod = <T extends Record<string, string>>(e: T) =>
  z.enum(Object.values(e) as [string, ...string[]])

const schemaCreationParcelle = z.object({
  nom: z.string().min(2).max(120),
  typeCulture: enumZod(TypeCulture),
  surfaceHa: z.number().positive().max(1000),
  dateSemis: z.string().datetime().optional().nullable(),
  dateRecoltePrev: z.string().datetime().optional().nullable(),
  rendementPrevuKg: z.number().nonnegative().optional().nullable(),
  rendementReelKg: z.number().nonnegative().optional().nullable(),
  statut: enumZod(StatutParcelle).optional(),
  zoneId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

const schemaMiseAJour = schemaCreationParcelle.partial().extend({
  actif: z.boolean().optional(),
})

const schemaCreationEvenement = z.object({
  type: enumZod(TypeEvenementCulture),
  dateEvenement: z.string().datetime().optional(),
  description: z.string().max(2000).optional().nullable(),
  coutTotal: z.number().nonnegative().optional().nullable(),
  quantiteKg: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

const inclureEvenementsLeger = {
  evenements: {
    select: { type: true, quantiteKg: true, coutTotal: true },
  },
} as const

const inclureEvenementsComplets = {
  evenements: {
    orderBy: { dateEvenement: 'desc' as const },
    include: {
      auteur: { select: { id: true, prenom: true, nom: true } },
    },
  },
  zone: { select: { id: true, nom: true } },
} as const

routeurParcelles.use(verifierAuth)

routeurParcelles.get('/', async (req: Request, res: Response) => {
  try {
    const filtreType = req.query.typeCulture as string | undefined
    const inclureInactives = req.query.inactives === 'true'

    const parcelles = await prisma.parcelle.findMany({
      where: {
        ...(filtreType ? { typeCulture: filtreType as TypeCulture } : {}),
        ...(inclureInactives ? {} : { actif: true }),
      },
      orderBy: [{ typeCulture: 'asc' }, { nom: 'asc' }],
      include: {
        ...inclureEvenementsLeger,
        zone: { select: { id: true, nom: true } },
      },
    })

    const enrichies = parcelles.map((p) => {
      const totalRecolteKg = p.evenements
        .filter((e) => e.type === TypeEvenementCulture.recolte && e.quantiteKg !== null)
        .reduce((acc, e) => acc + (e.quantiteKg ?? 0), 0)
      const coutTotal = p.evenements
        .filter((e) => e.coutTotal !== null)
        .reduce((acc, e) => acc + Number(e.coutTotal ?? 0), 0)
      return {
        id: p.id,
        nom: p.nom,
        typeCulture: p.typeCulture,
        surfaceHa: p.surfaceHa,
        dateSemis: p.dateSemis,
        dateRecoltePrev: p.dateRecoltePrev,
        rendementPrevuKg: p.rendementPrevuKg,
        rendementReelKg: p.rendementReelKg,
        statut: p.statut,
        notes: p.notes,
        actif: p.actif,
        zoneId: p.zoneId,
        zone: p.zone,
        creeLe: p.creeLe,
        modifieLe: p.modifieLe,
        totalRecolteKg,
        coutTotal,
        nombreEvenements: p.evenements.length,
      }
    })

    res.json({ succes: true, donnees: enrichies })
  } catch (erreur) {
    console.error('Erreur GET /parcelles:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurParcelles.get('/:id', async (req: Request, res: Response) => {
  try {
    const parcelle = await prisma.parcelle.findUnique({
      where: { id: req.params.id },
      include: inclureEvenementsComplets,
    })
    if (!parcelle) {
      res.status(404).json({ succes: false, message: 'Parcelle introuvable' })
      return
    }
    const totalRecolteKg = parcelle.evenements
      .filter((e) => e.type === TypeEvenementCulture.recolte && e.quantiteKg !== null)
      .reduce((acc, e) => acc + (e.quantiteKg ?? 0), 0)
    const coutTotal = parcelle.evenements
      .filter((e) => e.coutTotal !== null)
      .reduce((acc, e) => acc + Number(e.coutTotal ?? 0), 0)
    res.json({
      succes: true,
      donnees: { ...parcelle, totalRecolteKg, coutTotal },
    })
  } catch (erreur) {
    console.error('Erreur GET /parcelles/:id:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurParcelles.post('/', async (req: Request, res: Response) => {
  const parsed = schemaCreationParcelle.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      succes: false,
      message: 'Données invalides',
      details: parsed.error.issues,
    })
    return
  }
  try {
    const cree = await prisma.parcelle.create({
      data: {
        nom: parsed.data.nom,
        typeCulture: parsed.data.typeCulture as TypeCulture,
        surfaceHa: parsed.data.surfaceHa,
        dateSemis: parsed.data.dateSemis ? new Date(parsed.data.dateSemis) : null,
        dateRecoltePrev: parsed.data.dateRecoltePrev ? new Date(parsed.data.dateRecoltePrev) : null,
        rendementPrevuKg: parsed.data.rendementPrevuKg ?? null,
        rendementReelKg: parsed.data.rendementReelKg ?? null,
        statut: (parsed.data.statut as StatutParcelle) ?? StatutParcelle.preparation,
        zoneId: parsed.data.zoneId ?? null,
        notes: parsed.data.notes ?? null,
      },
    })
    res.status(201).json({
      succes: true,
      donnees: { ...cree, totalRecolteKg: 0, coutTotal: 0, nombreEvenements: 0 },
    })
  } catch (erreur) {
    console.error('Erreur POST /parcelles:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurParcelles.patch('/:id', async (req: Request, res: Response) => {
  const parsed = schemaMiseAJour.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides' })
    return
  }
  try {
    const data: Record<string, unknown> = {}
    if (parsed.data.nom !== undefined) data.nom = parsed.data.nom
    if (parsed.data.typeCulture !== undefined) data.typeCulture = parsed.data.typeCulture
    if (parsed.data.surfaceHa !== undefined) data.surfaceHa = parsed.data.surfaceHa
    if (parsed.data.dateSemis !== undefined) {
      data.dateSemis = parsed.data.dateSemis ? new Date(parsed.data.dateSemis) : null
    }
    if (parsed.data.dateRecoltePrev !== undefined) {
      data.dateRecoltePrev = parsed.data.dateRecoltePrev ? new Date(parsed.data.dateRecoltePrev) : null
    }
    if (parsed.data.rendementPrevuKg !== undefined) data.rendementPrevuKg = parsed.data.rendementPrevuKg
    if (parsed.data.rendementReelKg !== undefined) data.rendementReelKg = parsed.data.rendementReelKg
    if (parsed.data.statut !== undefined) data.statut = parsed.data.statut
    if (parsed.data.zoneId !== undefined) data.zoneId = parsed.data.zoneId
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes
    if (parsed.data.actif !== undefined) data.actif = parsed.data.actif

    const misAJour = await prisma.parcelle.update({
      where: { id: req.params.id },
      data,
    })
    res.json({ succes: true, donnees: misAJour })
  } catch (erreur) {
    console.error('Erreur PATCH /parcelles/:id:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurParcelles.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.parcelle.delete({ where: { id: req.params.id } })
    res.json({ succes: true, message: 'Parcelle supprimée' })
  } catch (erreur) {
    console.error('Erreur DELETE /parcelles/:id:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurParcelles.post('/:id/evenements', async (req: Request, res: Response) => {
  const parsed = schemaCreationEvenement.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      succes: false,
      message: 'Données invalides',
      details: parsed.error.issues,
    })
    return
  }
  try {
    const parcelle = await prisma.parcelle.findUnique({ where: { id: req.params.id } })
    if (!parcelle) {
      res.status(404).json({ succes: false, message: 'Parcelle introuvable' })
      return
    }
    const cree = await prisma.evenementCulture.create({
      data: {
        parcelleId: req.params.id,
        type: parsed.data.type as TypeEvenementCulture,
        dateEvenement: parsed.data.dateEvenement
          ? new Date(parsed.data.dateEvenement)
          : new Date(),
        description: parsed.data.description ?? null,
        coutTotal: parsed.data.coutTotal ?? null,
        quantiteKg: parsed.data.quantiteKg ?? null,
        notes: parsed.data.notes ?? null,
        auteurId: req.utilisateur!.utilisateurId,
      },
      include: {
        auteur: { select: { id: true, prenom: true, nom: true } },
      },
    })
    res.status(201).json({ succes: true, donnees: cree })
  } catch (erreur) {
    console.error('Erreur POST /parcelles/:id/evenements:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurParcelles.delete('/:id/evenements/:evenementId', async (req: Request, res: Response) => {
  try {
    const evenement = await prisma.evenementCulture.findUnique({
      where: { id: req.params.evenementId },
    })
    if (!evenement || evenement.parcelleId !== req.params.id) {
      res.status(404).json({ succes: false, message: 'Événement introuvable' })
      return
    }
    await prisma.evenementCulture.delete({ where: { id: req.params.evenementId } })
    res.json({ succes: true, message: 'Événement supprimé' })
  } catch (erreur) {
    console.error('Erreur DELETE événement:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})
