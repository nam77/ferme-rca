# Skill API Express - À remplir

# Skill : API Express + Prisma — Ferme RCA

## Structure standard d'une route
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { verifierAuth } from '../middleware/auth'
import { z } from 'zod'

const routeur = Router()

routeur.get('/', verifierAuth, async (req, res) => {
  try {
    const donnees = await prisma.tache.findMany({
      include: { responsable: { select: { nom: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ succes: true, donnees })
  } catch (erreur) {
    console.error('Erreur:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

## Format de réponse uniforme
// Succès
res.json({ succes: true, donnees: [...], message: 'OK' })
// Erreur validation
res.status(400).json({ succes: false, message: 'Données invalides' })
// Non autorisé
res.status(401).json({ succes: false, message: 'Non autorisé' })
// Erreur serveur
res.status(500).json({ succes: false, message: 'Erreur serveur' })

## Validation Zod obligatoire sur tous les POST/PUT
const schemaTache = z.object({
  titre: z.string().min(3).max(100),
  filiere: z.enum(['pisciculture','aviculture','porcins','caprins','cultures','infrastructure']),
  priorite: z.enum(['haute','moyenne','basse']),
  statut: z.enum(['a_faire','en_cours','termine']),
  dateFin: z.string().datetime().optional()
})

## Middleware JWT
export const verifierAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ succes: false, message: 'Token manquant' })
  try {
    req.utilisateur = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ succes: false, message: 'Token invalide ou expiré' })
  }
}

## Bonnes pratiques Prisma
- Singleton : export const prisma = new PrismaClient() dans /lib/prisma.ts
- Toujours inclure les relations nécessaires (include: {})
- Transactions pour opérations multiples
- Logs Prisma en dev uniquement (log: ['query', 'error'])
      