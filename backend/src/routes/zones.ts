import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { verifierAuth } from '../middleware/auth.js'
import { Filiere, Role } from '../generated/prisma/enums.js'

export const routeurZones = Router()

const enumZod = <T extends Record<string, string>>(e: T) =>
  z.enum(Object.values(e) as [string, ...string[]])

const schemaCreation = z.object({
  nom: z.string().min(1).max(120),
  filiere: enumZod(Filiere),
  surface: z.number().positive().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  positionX: z.number().min(0).max(100).optional(),
  positionY: z.number().min(0).max(100).optional(),
})

const schemaMiseAJour = schemaCreation.partial()

const inclurePhotos = {
  photos: { orderBy: { creeLe: 'desc' as const } },
}

routeurZones.use(verifierAuth)

routeurZones.get('/', async (_req: Request, res: Response) => {
  try {
    const zones = await prisma.zone.findMany({
      orderBy: { nom: 'asc' },
      include: {
        photos: { orderBy: { creeLe: 'desc' } },
        _count: { select: { taches: true } },
      },
    })
    res.json({ succes: true, donnees: zones })
  } catch (erreur) {
    console.error('Erreur GET /zones:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurZones.get('/:id', async (req: Request, res: Response) => {
  try {
    const zone = await prisma.zone.findUnique({
      where: { id: req.params.id },
      include: {
        ...inclurePhotos,
        taches: {
          orderBy: { creeLe: 'desc' },
          take: 5,
          include: {
            responsable: { select: { id: true, prenom: true, nom: true } },
          },
        },
      },
    })
    if (!zone) {
      res.status(404).json({ succes: false, message: 'Zone introuvable' })
      return
    }
    res.json({ succes: true, donnees: zone })
  } catch (erreur) {
    console.error('Erreur GET /zones/:id:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurZones.post('/', async (req: Request, res: Response) => {
  if (req.utilisateur!.role !== Role.admin) {
    res.status(403).json({ succes: false, message: 'Création réservée à admin' })
    return
  }
  const parsed = schemaCreation.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides', details: parsed.error.issues })
    return
  }
  try {
    const cree = await prisma.zone.create({
      data: {
        nom: parsed.data.nom,
        filiere: parsed.data.filiere as Filiere,
        surface: parsed.data.surface ?? null,
        description: parsed.data.description ?? null,
        positionX: parsed.data.positionX ?? 50,
        positionY: parsed.data.positionY ?? 50,
      },
    })
    res.status(201).json({ succes: true, donnees: cree })
  } catch (erreur) {
    console.error('Erreur POST /zones:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurZones.patch('/:id', async (req: Request, res: Response) => {
  if (req.utilisateur!.role !== Role.admin) {
    res.status(403).json({ succes: false, message: 'Édition réservée à admin' })
    return
  }
  const parsed = schemaMiseAJour.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides' })
    return
  }
  try {
    const data: Record<string, unknown> = {}
    if (parsed.data.nom !== undefined) data.nom = parsed.data.nom
    if (parsed.data.filiere !== undefined) data.filiere = parsed.data.filiere
    if (parsed.data.surface !== undefined) data.surface = parsed.data.surface
    if (parsed.data.description !== undefined) data.description = parsed.data.description
    if (parsed.data.positionX !== undefined) data.positionX = parsed.data.positionX
    if (parsed.data.positionY !== undefined) data.positionY = parsed.data.positionY

    const misAJour = await prisma.zone.update({
      where: { id: req.params.id },
      data,
    })
    res.json({ succes: true, donnees: misAJour })
  } catch (erreur) {
    console.error('Erreur PATCH /zones:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurZones.delete('/:id', async (req: Request, res: Response) => {
  if (req.utilisateur!.role !== Role.admin) {
    res.status(403).json({ succes: false, message: 'Suppression réservée à admin' })
    return
  }
  try {
    await prisma.zone.delete({ where: { id: req.params.id } })
    res.json({ succes: true, message: 'Zone supprimée' })
  } catch (erreur) {
    console.error('Erreur DELETE /zones:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})