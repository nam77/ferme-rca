import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { verifierAuthOptionnel, protegerMutations } from '../middleware/auth.js'
import { Statut } from '../generated/prisma/enums.js'

export const routeurDashboard = Router()

routeurDashboard.use(verifierAuthOptionnel, protegerMutations)

routeurDashboard.get('/', async (_req: Request, res: Response) => {
  try {
    const maintenant = new Date()

    const [
      groupesParStatut,
      groupesParFiliere,
      groupesParPriorite,
      enRetardCompte,
      prochainesEcheances,
      derniersMouvements,
      totalTaches,
      tachesTerminees,
    ] = await Promise.all([
      prisma.tache.groupBy({
        by: ['statut'],
        _count: { _all: true },
      }),
      prisma.tache.groupBy({
        by: ['filiere'],
        _count: { _all: true },
      }),
      prisma.tache.groupBy({
        by: ['priorite'],
        _count: { _all: true },
      }),
      prisma.tache.count({
        where: {
          dateLimite: { lt: maintenant },
          statut: { not: Statut.termine },
        },
      }),
      prisma.tache.findMany({
        where: {
          dateLimite: { gte: maintenant },
          statut: { not: Statut.termine },
        },
        orderBy: { dateLimite: 'asc' },
        take: 5,
        include: {
          responsable: { select: { id: true, prenom: true, nom: true } },
        },
      }),
      prisma.mouvement.findMany({
        orderBy: { creeLe: 'desc' },
        take: 10,
        include: {
          tache: { select: { id: true, titre: true, filiere: true } },
          auteur: { select: { id: true, prenom: true, nom: true } },
        },
      }),
      prisma.tache.count(),
      prisma.tache.count({ where: { statut: Statut.termine } }),
    ])

    const tachesParStatut: Record<string, number> = {
      a_faire: 0,
      en_cours: 0,
      termine: 0,
    }
    for (const g of groupesParStatut) {
      tachesParStatut[g.statut] = g._count._all
    }

    const tachesParFiliere: Record<string, number> = {
      pisciculture: 0,
      aviculture: 0,
      porcins: 0,
      caprins: 0,
      cultures: 0,
      infrastructure: 0,
    }
    for (const g of groupesParFiliere) {
      tachesParFiliere[g.filiere] = g._count._all
    }

    const tachesParPriorite: Record<string, number> = {
      haute: 0,
      moyenne: 0,
      basse: 0,
    }
    for (const g of groupesParPriorite) {
      tachesParPriorite[g.priorite] = g._count._all
    }

    const progressionGlobale = totalTaches === 0 ? 0 : Math.round((tachesTerminees / totalTaches) * 100)

    res.json({
      succes: true,
      donnees: {
        totalTaches,
        tachesTerminees,
        tachesEnRetard: enRetardCompte,
        progressionGlobale,
        tachesParStatut,
        tachesParFiliere,
        tachesParPriorite,
        prochainesEcheances,
        derniersMouvements,
        genereLe: maintenant.toISOString(),
      },
    })
  } catch (erreur) {
    console.error('Erreur GET /dashboard:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})
