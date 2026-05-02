import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { verifierAuth } from '../middleware/auth.js'
import { CategorieProduit, UniteProduit } from '../generated/prisma/enums.js'

export const routeurVentes = Router()

const enumZod = <T extends Record<string, string>>(e: T) =>
  z.enum(Object.values(e) as [string, ...string[]])

const schemaCreation = z.object({
  produit: z.string().min(1).max(200),
  categorie: enumZod(CategorieProduit),
  prixUnitaire: z.number().nonnegative(),
  quantite: z.number().positive(),
  unite: enumZod(UniteProduit).optional(),
  dateVente: z.string().datetime().optional(),
  client: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

const schemaMaj = schemaCreation.partial()

routeurVentes.use(verifierAuth)

/**
 * GET /api/ventes — toutes les ventes, optionnellement filtrées
 * ?categorie=...&du=YYYY-MM-DD&au=YYYY-MM-DD
 */
routeurVentes.get('/', async (req: Request, res: Response) => {
  try {
    const where: Record<string, unknown> = {}
    if (typeof req.query.categorie === 'string') {
      where.categorie = req.query.categorie
    }
    const dv: { gte?: Date; lte?: Date } = {}
    if (typeof req.query.du === 'string') dv.gte = new Date(req.query.du)
    if (typeof req.query.au === 'string') dv.lte = new Date(req.query.au + 'T23:59:59')
    if (dv.gte || dv.lte) where.dateVente = dv

    const ventes = await prisma.vente.findMany({
      where,
      orderBy: { dateVente: 'desc' },
      include: {
        enregistreur: { select: { id: true, prenom: true, nom: true } },
      },
    })

    // Agrégats utiles côté UI : total CA + ventilation par catégorie
    const totalCA = ventes.reduce((s, v) => s + Number(v.prixTotal), 0)
    const parCategorie: Record<string, number> = {}
    for (const v of ventes) {
      parCategorie[v.categorie] = (parCategorie[v.categorie] ?? 0) + Number(v.prixTotal)
    }

    res.json({ succes: true, donnees: { ventes, totalCA, parCategorie } })
  } catch (erreur) {
    console.error('Erreur GET /ventes:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurVentes.post('/', async (req: Request, res: Response) => {
  const parsed = schemaCreation.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides', details: parsed.error.issues })
    return
  }
  try {
    const prixTotal = Number(parsed.data.prixUnitaire) * Number(parsed.data.quantite)
    const cree = await prisma.vente.create({
      data: {
        produit: parsed.data.produit,
        categorie: parsed.data.categorie as CategorieProduit,
        prixUnitaire: parsed.data.prixUnitaire,
        quantite: parsed.data.quantite,
        unite: (parsed.data.unite as UniteProduit | undefined) ?? UniteProduit.unite,
        prixTotal,
        dateVente: parsed.data.dateVente ? new Date(parsed.data.dateVente) : new Date(),
        client: parsed.data.client ?? null,
        notes: parsed.data.notes ?? null,
        enregistreurId: req.utilisateur!.utilisateurId,
      },
      include: { enregistreur: { select: { id: true, prenom: true, nom: true } } },
    })
    res.status(201).json({ succes: true, donnees: cree })
  } catch (erreur) {
    console.error('Erreur POST /ventes:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurVentes.patch('/:id', async (req: Request, res: Response) => {
  const parsed = schemaMaj.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides' })
    return
  }
  try {
    const vente = await prisma.vente.findUnique({ where: { id: req.params.id } })
    if (!vente) {
      res.status(404).json({ succes: false, message: 'Vente introuvable' })
      return
    }
    const data: Record<string, unknown> = {}
    if (parsed.data.produit !== undefined) data.produit = parsed.data.produit
    if (parsed.data.categorie !== undefined) data.categorie = parsed.data.categorie
    if (parsed.data.prixUnitaire !== undefined) data.prixUnitaire = parsed.data.prixUnitaire
    if (parsed.data.quantite !== undefined) data.quantite = parsed.data.quantite
    if (parsed.data.unite !== undefined) data.unite = parsed.data.unite
    if (parsed.data.client !== undefined) data.client = parsed.data.client
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes
    if (parsed.data.dateVente !== undefined && parsed.data.dateVente) {
      data.dateVente = new Date(parsed.data.dateVente)
    }
    // Recalcule prixTotal si prix ou quantite change
    const nouveauPrix = parsed.data.prixUnitaire ?? Number(vente.prixUnitaire)
    const nouvelleQ = parsed.data.quantite ?? Number(vente.quantite)
    data.prixTotal = nouveauPrix * nouvelleQ

    const misAJour = await prisma.vente.update({ where: { id: req.params.id }, data })
    res.json({ succes: true, donnees: misAJour })
  } catch (erreur) {
    console.error('Erreur PATCH /ventes:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurVentes.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.vente.delete({ where: { id: req.params.id } })
    res.json({ succes: true, message: 'Vente supprimée' })
  } catch (erreur) {
    console.error('Erreur DELETE /ventes:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})
