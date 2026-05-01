import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { verifierAuth } from '../middleware/auth.js'
import {
  Espece,
  SexeAnimal,
  CategorieAge,
  TypeMouvementAnimal,
  Filiere,
  Role,
} from '../generated/prisma/enums.js'

export const routeurLots = Router()

const enumZod = <T extends Record<string, string>>(e: T) =>
  z.enum(Object.values(e) as [string, ...string[]])

const schemaCreationLot = z.object({
  nom: z.string().min(2).max(120),
  espece: enumZod(Espece),
  sexe: enumZod(SexeAnimal).optional().nullable(),
  categorieAge: enumZod(CategorieAge).optional(),
  zoneId: z.string().optional().nullable(),
  dateNaissance: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

const schemaMiseAJourLot = schemaCreationLot.partial().extend({
  actif: z.boolean().optional(),
})

const schemaCreationMouvement = z.object({
  type: enumZod(TypeMouvementAnimal),
  quantite: z.number().int().positive().max(10_000),
  dateMouvement: z.string().datetime().optional(),
  coutTotal: z.number().nonnegative().optional().nullable(),
  motif: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

const TYPES_ENTREE: TypeMouvementAnimal[] = [
  TypeMouvementAnimal.achat,
  TypeMouvementAnimal.naissance,
  TypeMouvementAnimal.transfert_entree,
]

const TYPES_SORTIE: TypeMouvementAnimal[] = [
  TypeMouvementAnimal.vente,
  TypeMouvementAnimal.mortalite,
  TypeMouvementAnimal.consommation_interne,
  TypeMouvementAnimal.reforme,
  TypeMouvementAnimal.transfert_sortie,
]

const filierePourEspece = (espece: Espece): Filiere => {
  switch (espece) {
    case Espece.poulet:
      return Filiere.aviculture
    case Espece.porc:
      return Filiere.porcins
    case Espece.caprin:
    case Espece.ovin:
      return Filiere.caprins
    case Espece.tilapia:
    case Espece.clarias:
      return Filiere.pisciculture
  }
}

const peutEcrireSurEspece = (
  role: Role,
  filiereUtilisateur: Filiere | null,
  espece: Espece,
): boolean => {
  if (role === Role.admin) return true
  if (role === Role.investisseur) return false
  const filiereCible = filierePourEspece(espece)
  if (role === Role.responsable) return filiereUtilisateur === filiereCible
  // Ouvriers : lecture seulement (pour cette première itération)
  return false
}

const calculerEffectif = (
  mouvements: { type: TypeMouvementAnimal; quantite: number }[],
): number => {
  return mouvements.reduce((acc, m) => {
    if (TYPES_ENTREE.includes(m.type)) return acc + m.quantite
    if (TYPES_SORTIE.includes(m.type)) return acc - m.quantite
    return acc
  }, 0)
}

const inclureMouvementsLeger = {
  mouvements: {
    select: { type: true, quantite: true },
  },
} as const

const inclureMouvementsComplets = {
  mouvements: {
    orderBy: { dateMouvement: 'desc' as const },
    include: {
      auteur: { select: { id: true, prenom: true, nom: true } },
    },
  },
  zone: { select: { id: true, nom: true } },
} as const

routeurLots.use(verifierAuth)

routeurLots.get('/', async (req: Request, res: Response) => {
  try {
    const filtreEspece = req.query.espece as string | undefined
    const inclureInactifs = req.query.inactifs === 'true'

    const lots = await prisma.lotAnimaux.findMany({
      where: {
        ...(filtreEspece ? { espece: filtreEspece as Espece } : {}),
        ...(inclureInactifs ? {} : { actif: true }),
      },
      orderBy: [{ espece: 'asc' }, { nom: 'asc' }],
      include: {
        ...inclureMouvementsLeger,
        zone: { select: { id: true, nom: true } },
      },
    })

    const lotsAvecEffectif = lots.map((l) => ({
      id: l.id,
      nom: l.nom,
      espece: l.espece,
      sexe: l.sexe,
      categorieAge: l.categorieAge,
      dateNaissance: l.dateNaissance,
      notes: l.notes,
      actif: l.actif,
      zoneId: l.zoneId,
      zone: l.zone,
      creeLe: l.creeLe,
      modifieLe: l.modifieLe,
      effectif: calculerEffectif(l.mouvements),
      nombreMouvements: l.mouvements.length,
    }))

    res.json({ succes: true, donnees: lotsAvecEffectif })
  } catch (erreur) {
    console.error('Erreur GET /lots:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurLots.get('/:id', async (req: Request, res: Response) => {
  try {
    const lot = await prisma.lotAnimaux.findUnique({
      where: { id: req.params.id },
      include: inclureMouvementsComplets,
    })
    if (!lot) {
      res.status(404).json({ succes: false, message: 'Lot introuvable' })
      return
    }
    res.json({
      succes: true,
      donnees: {
        ...lot,
        effectif: calculerEffectif(lot.mouvements),
      },
    })
  } catch (erreur) {
    console.error('Erreur GET /lots/:id:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurLots.post('/', async (req: Request, res: Response) => {
  const parsed = schemaCreationLot.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      succes: false,
      message: 'Données invalides',
      details: parsed.error.issues,
    })
    return
  }
  try {
    const auteur = await prisma.utilisateur.findUnique({
      where: { id: req.utilisateur!.utilisateurId },
      select: { role: true, filiere: true },
    })
    if (!auteur || !peutEcrireSurEspece(auteur.role, auteur.filiere, parsed.data.espece as Espece)) {
      res.status(403).json({ succes: false, message: 'Création interdite pour ce rôle ou cette filière' })
      return
    }
    const cree = await prisma.lotAnimaux.create({
      data: {
        nom: parsed.data.nom,
        espece: parsed.data.espece as Espece,
        sexe: parsed.data.sexe ? (parsed.data.sexe as SexeAnimal) : null,
        categorieAge: parsed.data.categorieAge ? (parsed.data.categorieAge as CategorieAge) : CategorieAge.adulte,
        zoneId: parsed.data.zoneId ?? null,
        dateNaissance: parsed.data.dateNaissance ? new Date(parsed.data.dateNaissance) : null,
        notes: parsed.data.notes ?? null,
      },
    })
    res.status(201).json({ succes: true, donnees: { ...cree, effectif: 0 } })
  } catch (erreur) {
    console.error('Erreur POST /lots:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurLots.patch('/:id', async (req: Request, res: Response) => {
  const parsed = schemaMiseAJourLot.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides' })
    return
  }
  try {
    const lot = await prisma.lotAnimaux.findUnique({ where: { id: req.params.id } })
    if (!lot) {
      res.status(404).json({ succes: false, message: 'Lot introuvable' })
      return
    }
    const auteur = await prisma.utilisateur.findUnique({
      where: { id: req.utilisateur!.utilisateurId },
      select: { role: true, filiere: true },
    })
    if (!auteur || !peutEcrireSurEspece(auteur.role, auteur.filiere, lot.espece)) {
      res.status(403).json({ succes: false, message: 'Édition interdite' })
      return
    }
    const data: Record<string, unknown> = {}
    if (parsed.data.nom !== undefined) data.nom = parsed.data.nom
    if (parsed.data.sexe !== undefined) data.sexe = parsed.data.sexe ?? null
    if (parsed.data.categorieAge !== undefined) data.categorieAge = parsed.data.categorieAge
    if (parsed.data.zoneId !== undefined) data.zoneId = parsed.data.zoneId
    if (parsed.data.dateNaissance !== undefined) {
      data.dateNaissance = parsed.data.dateNaissance ? new Date(parsed.data.dateNaissance) : null
    }
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes
    if (parsed.data.actif !== undefined) data.actif = parsed.data.actif

    const misAJour = await prisma.lotAnimaux.update({
      where: { id: req.params.id },
      data,
      include: inclureMouvementsLeger,
    })
    res.json({
      succes: true,
      donnees: { ...misAJour, effectif: calculerEffectif(misAJour.mouvements) },
    })
  } catch (erreur) {
    console.error('Erreur PATCH /lots/:id:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurLots.delete('/:id', async (req: Request, res: Response) => {
  if (req.utilisateur!.role !== Role.admin) {
    res.status(403).json({ succes: false, message: 'Suppression réservée à admin' })
    return
  }
  try {
    await prisma.lotAnimaux.delete({ where: { id: req.params.id } })
    res.json({ succes: true, message: 'Lot supprimé' })
  } catch (erreur) {
    console.error('Erreur DELETE /lots/:id:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurLots.post('/:id/mouvements', async (req: Request, res: Response) => {
  const parsed = schemaCreationMouvement.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      succes: false,
      message: 'Données invalides',
      details: parsed.error.issues,
    })
    return
  }
  try {
    const lot = await prisma.lotAnimaux.findUnique({
      where: { id: req.params.id },
      include: inclureMouvementsLeger,
    })
    if (!lot) {
      res.status(404).json({ succes: false, message: 'Lot introuvable' })
      return
    }
    const auteur = await prisma.utilisateur.findUnique({
      where: { id: req.utilisateur!.utilisateurId },
      select: { role: true, filiere: true },
    })
    if (!auteur || !peutEcrireSurEspece(auteur.role, auteur.filiere, lot.espece)) {
      res.status(403).json({ succes: false, message: 'Action interdite pour ce rôle ou cette filière' })
      return
    }

    const type = parsed.data.type as TypeMouvementAnimal
    const quantite = parsed.data.quantite

    // Vérification d'effectif sur les sorties : pas de stock négatif
    if (TYPES_SORTIE.includes(type)) {
      const effectifActuel = calculerEffectif(lot.mouvements)
      if (quantite > effectifActuel) {
        res.status(409).json({
          succes: false,
          message: `Effectif insuffisant : ${effectifActuel} disponible(s), ${quantite} demandé(s).`,
        })
        return
      }
    }

    const cree = await prisma.mouvementAnimal.create({
      data: {
        lotId: req.params.id,
        type,
        quantite,
        dateMouvement: parsed.data.dateMouvement
          ? new Date(parsed.data.dateMouvement)
          : new Date(),
        coutTotal: parsed.data.coutTotal ?? null,
        motif: parsed.data.motif ?? null,
        notes: parsed.data.notes ?? null,
        auteurId: req.utilisateur!.utilisateurId,
      },
      include: {
        auteur: { select: { id: true, prenom: true, nom: true } },
      },
    })
    const nouvelEffectif = TYPES_ENTREE.includes(type)
      ? calculerEffectif(lot.mouvements) + quantite
      : calculerEffectif(lot.mouvements) - quantite

    res.status(201).json({
      succes: true,
      donnees: { mouvement: cree, effectif: nouvelEffectif },
    })
  } catch (erreur) {
    console.error('Erreur POST /lots/:id/mouvements:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurLots.delete('/:id/mouvements/:mouvementId', async (req: Request, res: Response) => {
  if (req.utilisateur!.role !== Role.admin) {
    res.status(403).json({ succes: false, message: 'Annulation réservée à admin' })
    return
  }
  try {
    const mouvement = await prisma.mouvementAnimal.findUnique({
      where: { id: req.params.mouvementId },
    })
    if (!mouvement || mouvement.lotId !== req.params.id) {
      res.status(404).json({ succes: false, message: 'Mouvement introuvable' })
      return
    }
    await prisma.mouvementAnimal.delete({ where: { id: req.params.mouvementId } })
    res.json({ succes: true, message: 'Mouvement annulé' })
  } catch (erreur) {
    console.error('Erreur DELETE mouvement:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})
