import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { verifierAuth } from '../middleware/auth.js'

export const routeurNotifications = Router()

// Enregistrer/supprimer un jeton exige une session.
routeurNotifications.use(verifierAuth)

const schemaJeton = z.object({
  jeton: z.string().min(1).max(255),
  plateforme: z.enum(['ios', 'android', 'web']).optional().nullable(),
})

/**
 * POST /api/notifications/jeton
 * Enregistre (ou réattribue) le jeton push Expo de l'appareil courant à
 * l'utilisateur connecté. Upsert sur le jeton : un appareil = une seule ligne,
 * réattribuée si l'appareil change de compte.
 */
routeurNotifications.post('/jeton', async (req: Request, res: Response) => {
  const parse = schemaJeton.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ succes: false, message: 'Jeton invalide' })
    return
  }
  const { jeton, plateforme } = parse.data
  try {
    const utilisateurId = req.utilisateur!.utilisateurId
    await prisma.jetonPush.upsert({
      where: { jeton },
      update: { utilisateurId, plateforme: plateforme ?? null },
      create: { jeton, utilisateurId, plateforme: plateforme ?? null },
    })
    res.json({ succes: true })
  } catch (erreur) {
    console.error('Erreur POST /notifications/jeton:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * DELETE /api/notifications/jeton — désenregistre le jeton (déconnexion).
 * Le jeton est passé dans le corps pour rester simple côté client.
 */
routeurNotifications.delete('/jeton', async (req: Request, res: Response) => {
  const parse = schemaJeton.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ succes: false, message: 'Jeton invalide' })
    return
  }
  try {
    await prisma.jetonPush.deleteMany({ where: { jeton: parse.data.jeton } })
    res.json({ succes: true })
  } catch (erreur) {
    console.error('Erreur DELETE /notifications/jeton:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})
