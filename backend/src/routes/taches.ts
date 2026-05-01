import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { verifierAuth } from '../middleware/auth.js'
import { Filiere, Priorite, Role, Statut } from '../generated/prisma/enums.js'

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
})

const schemaMiseAJour = schemaCreation.partial()

const schemaChangementStatut = z.object({
  nouveauStatut: enumZod(Statut),
})

const inclureRelations = {
  responsable: { select: { id: true, prenom: true, nom: true, email: true } },
  createur: { select: { id: true, prenom: true, nom: true } },
  zone: { select: { id: true, nom: true } },
} as const

const peutModifierTache = (
  utilisateurRole: Role,
  utilisateurId: string,
  tache: { responsableId: string | null; createurId: string; filiere: Filiere },
  utilisateurFiliere: Filiere | null,
): boolean => {
  if (utilisateurRole === Role.admin) return true
  if (utilisateurRole === Role.investisseur) return false
  if (utilisateurRole === Role.responsable) {
    return utilisateurFiliere === tache.filiere
  }
  if (utilisateurRole === Role.ouvrier) {
    return tache.responsableId === utilisateurId || tache.createurId === utilisateurId
  }
  return false
}

routeurTaches.use(verifierAuth)

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
  if (req.utilisateur!.role === Role.investisseur) {
    res.status(403).json({ succes: false, message: 'Lecture seule pour investisseur' })
    return
  }
  const parsed = schemaCreation.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides', details: parsed.error.issues })
    return
  }
  try {
    const auteur = await prisma.utilisateur.findUnique({
      where: { id: req.utilisateur!.utilisateurId },
      select: { filiere: true, role: true },
    })
    if (!auteur) {
      res.status(401).json({ succes: false, message: 'Utilisateur introuvable' })
      return
    }
    if (auteur.role === Role.responsable && auteur.filiere !== parsed.data.filiere) {
      res.status(403).json({ succes: false, message: 'Filière non autorisée pour ce responsable' })
      return
    }
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
    const auteur = await prisma.utilisateur.findUnique({
      where: { id: req.utilisateur!.utilisateurId },
      select: { filiere: true, role: true },
    })
    if (!auteur || !peutModifierTache(auteur.role, req.utilisateur!.utilisateurId, tache, auteur.filiere)) {
      res.status(403).json({ succes: false, message: 'Action interdite' })
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
    const auteur = await prisma.utilisateur.findUnique({
      where: { id: req.utilisateur!.utilisateurId },
      select: { filiere: true, role: true },
    })
    if (!auteur || !peutModifierTache(auteur.role, req.utilisateur!.utilisateurId, tache, auteur.filiere)) {
      res.status(403).json({ succes: false, message: 'Action interdite' })
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
  const role = req.utilisateur!.role
  if (role !== Role.admin && role !== Role.responsable) {
    res.status(403).json({ succes: false, message: 'Suppression réservée à admin/responsable' })
    return
  }
  const { id } = req.params
  try {
    const tache = await prisma.tache.findUnique({ where: { id } })
    if (!tache) {
      res.status(404).json({ succes: false, message: 'Tâche introuvable' })
      return
    }
    if (req.utilisateur!.role === Role.responsable) {
      const auteur = await prisma.utilisateur.findUnique({
        where: { id: req.utilisateur!.utilisateurId },
        select: { filiere: true },
      })
      if (auteur?.filiere !== tache.filiere) {
        res.status(403).json({ succes: false, message: 'Filière non autorisée' })
        return
      }
    }
    await prisma.tache.delete({ where: { id } })
    res.json({ succes: true, message: 'Tâche supprimée' })
  } catch (erreur) {
    console.error('Erreur DELETE /taches/:id:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})
