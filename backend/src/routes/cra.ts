import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'node:url'
import { prisma } from '../lib/prisma.js'
import { verifierAuth } from '../middleware/auth.js'
import { Filiere, Role, TypeJourCRA } from '../generated/prisma/enums.js'

export const routeurCRA = Router()

const enumZod = <T extends Record<string, string>>(e: T) =>
  z.enum(Object.values(e) as [string, ...string[]])

const schemaSaisie = z.object({
  utilisateurId: z.string().optional(),
  date: z.string(), // YYYY-MM-DD
  type: enumZod(TypeJourCRA).optional(),
  heures: z.number().min(0).max(24).optional(),
  notes: z.string().max(500).optional().nullable(),
  activite: z.string().max(2000).optional().nullable(),
  responsableCRAId: z.string().optional().nullable(),
  photoDebut: z.string().max(500).optional().nullable(),
  photoFin: z.string().max(500).optional().nullable(),
})

routeurCRA.use(verifierAuth)

// ─────────────────── Upload photos (multipart) ──────────────────────
// Stockage sur disque dans backend/uploads/photos-cra/. Fichier nommé
// avec un id aléatoire + extension d'origine. Limite 8 Mo (avant
// compression côté client typiquement à <500 Ko).
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dossierPhotos = path.resolve(__dirname, '..', '..', 'uploads', 'photos-cra')
fs.mkdirSync(dossierPhotos, { recursive: true })

const stockage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dossierPhotos),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '.jpg').toLowerCase()
    const id = crypto.randomBytes(12).toString('hex')
    cb(null, `${Date.now()}-${id}${ext}`)
  },
})

const televersement = multer({
  storage: stockage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 Mo
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.mimetype)) {
      cb(new Error('Format image non supporté (jpg/png/webp/heic uniquement)'))
      return
    }
    cb(null, true)
  },
})

routeurCRA.post('/photo', televersement.single('photo'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ succes: false, message: 'Aucun fichier reçu' })
    return
  }
  // URL relative — le frontend la stocke et l'utilise pour <img src=...>.
  const url = `/uploads/photos-cra/${req.file.filename}`
  res.json({ succes: true, donnees: { url, taille: req.file.size } })
})

// ─────────────── Inscription d'un salarié sans login ────────────────
// Le salarié n'a pas de compte propre — il est ajouté à la liste des
// utilisateurs pour pouvoir recevoir des saisies CRA. Email auto-généré
// (jamais utilisé), mot de passe aléatoire (impossible à connaître donc
// jamais utilisable pour se connecter).
const schemaInscriptionSalarie = z.object({
  prenom: z.string().min(1).max(60),
  nom: z.string().min(1).max(60),
  telephone: z.string().max(40).optional().nullable(),
  photoPieceIdentite: z.string().max(500).optional().nullable(),
  role: z.enum(Object.values(Role) as [string, ...string[]]).optional(),
  filiere: z.enum(Object.values(Filiere) as [string, ...string[]]).optional().nullable(),
})

// Modifier un salarié (admin/responsable uniquement)
const schemaMajSalarie = z.object({
  prenom: z.string().min(1).max(60).optional(),
  nom: z.string().min(1).max(60).optional(),
  telephone: z.string().max(40).optional().nullable(),
  role: z.enum(Object.values(Role) as [string, ...string[]]).optional(),
  filiere: z.enum(Object.values(Filiere) as [string, ...string[]]).optional().nullable(),
})

routeurCRA.patch('/salarie/:id', async (req: Request, res: Response) => {
  const moi = req.utilisateur
  if (!moi || (moi.role !== 'admin' && moi.role !== 'gestionnaire' && moi.role !== 'responsable')) {
    res.status(403).json({ succes: false, message: 'Réservé aux admins, gestionnaires et responsables' })
    return
  }
  const parsed = schemaMajSalarie.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides', details: parsed.error.issues })
    return
  }
  try {
    const data: Record<string, unknown> = {}
    if (parsed.data.prenom !== undefined) data.prenom = parsed.data.prenom.trim()
    if (parsed.data.nom !== undefined) data.nom = parsed.data.nom.trim()
    if (parsed.data.telephone !== undefined) data.telephone = parsed.data.telephone?.trim() || null
    if (parsed.data.role !== undefined) data.role = parsed.data.role
    if (parsed.data.filiere !== undefined) data.filiere = parsed.data.filiere || null

    const salarie = await prisma.utilisateur.update({
      where: { id: req.params.id },
      data,
      select: { id: true, prenom: true, nom: true, telephone: true, role: true, filiere: true },
    })
    res.json({ succes: true, donnees: salarie })
  } catch (erreur) {
    console.error('Erreur PATCH /cra/salarie/:id:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

// Supprimer un salarié = soft-delete (actif=false). Préserve l'historique
// des saisies CRA tout en le retirant de la liste de pointage.
// Empêche la suppression de soi-même par sécurité.
routeurCRA.delete('/salarie/:id', async (req: Request, res: Response) => {
  const moi = req.utilisateur
  if (!moi || (moi.role !== 'admin' && moi.role !== 'gestionnaire' && moi.role !== 'responsable')) {
    res.status(403).json({ succes: false, message: 'Réservé aux admins, gestionnaires et responsables' })
    return
  }
  if (moi.utilisateurId === req.params.id) {
    res.status(400).json({ succes: false, message: 'Vous ne pouvez pas vous supprimer vous-même' })
    return
  }
  try {
    await prisma.utilisateur.update({
      where: { id: req.params.id },
      data: { actif: false },
    })
    res.json({ succes: true, message: 'Salarié archivé' })
  } catch (erreur) {
    console.error('Erreur DELETE /cra/salarie/:id:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

routeurCRA.post('/inscrire-salarie', async (req: Request, res: Response) => {
  // Seul un admin ou responsable peut ajouter un salarié à la liste de pointage
  const moi = req.utilisateur
  if (!moi || (moi.role !== 'admin' && moi.role !== 'gestionnaire' && moi.role !== 'responsable')) {
    res.status(403).json({ succes: false, message: 'Réservé aux admins, gestionnaires et responsables' })
    return
  }
  const parsed = schemaInscriptionSalarie.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides', details: parsed.error.issues })
    return
  }
  try {
    // Refus des doublons de nom (prénom + nom) parmi les salariés actifs.
    const prenom = parsed.data.prenom.trim()
    const nom = parsed.data.nom.trim()
    const memeNom = await prisma.utilisateur.findFirst({
      where: {
        actif: true,
        prenom: { equals: prenom, mode: 'insensitive' },
        nom: { equals: nom, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (memeNom) {
      res.status(409).json({ succes: false, message: `Un salarié nommé « ${prenom} ${nom} » existe déjà` })
      return
    }
    // Email synthétique : jamais utilisé pour login mais doit être unique
    const id = crypto.randomBytes(8).toString('hex')
    const email = `salarie-${id}@local.ferme.rca`
    const motDePasseAleatoire = crypto.randomBytes(24).toString('hex')
    const motDePasseHash = await bcrypt.hash(motDePasseAleatoire, 10)

    const salarie = await prisma.utilisateur.create({
      data: {
        prenom,
        nom,
        telephone: parsed.data.telephone?.trim() || null,
        photoPieceIdentite: parsed.data.photoPieceIdentite?.trim() || null,
        email,
        motDePasseHash,
        role: (parsed.data.role as Role | undefined) ?? Role.ouvrier,
        filiere: parsed.data.filiere ? (parsed.data.filiere as Filiere) : null,
        actif: true,
      },
      select: { id: true, prenom: true, nom: true, telephone: true, role: true, filiere: true },
    })
    res.status(201).json({ succes: true, donnees: salarie })
  } catch (erreur) {
    console.error('Erreur POST /cra/inscrire-salarie:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

// ───────────── Bulk-upsert de plusieurs jours pour un salarié ──────────
// Reçoit toutes les saisies du mois (ou seulement celles modifiées) en
// un seul appel pour minimiser les allers-retours. Convention :
//   presence: 0   → 0 h (case vide → suppression de la saisie si elle existe)
//   presence: 0.5 → 4 h
//   presence: 1   → 8 h
const schemaSaisieLot = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  presence: z.number().refine((v) => v === 0 || v === 0.5 || v === 1, {
    message: 'Présence doit être 0, 0.5 ou 1',
  }),
})
const schemaLot = z.object({
  utilisateurId: z.string(),
  saisies: z.array(schemaSaisieLot).max(40),
})

routeurCRA.post('/lot', async (req: Request, res: Response) => {
  const parsed = schemaLot.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides', details: parsed.error.issues })
    return
  }
  try {
    const { utilisateurId, saisies } = parsed.data
    const operations = saisies.map((s) => {
      const date = new Date(s.date + 'T00:00:00Z')
      const heures = s.presence === 1 ? 8 : s.presence === 0.5 ? 4 : 0
      if (s.presence === 0) {
        // Présence nulle → on supprime la saisie si elle existe (deleteMany ne lève pas si absente)
        return prisma.saisieJourCRA.deleteMany({
          where: { utilisateurId, date },
        })
      }
      return prisma.saisieJourCRA.upsert({
        where: { utilisateurId_date: { utilisateurId, date } },
        create: { utilisateurId, date, type: TypeJourCRA.travail, heures },
        update: { type: TypeJourCRA.travail, heures },
      })
    })
    await prisma.$transaction(operations)
    res.json({ succes: true, donnees: { saisiesTraitees: saisies.length } })
  } catch (erreur) {
    console.error('Erreur POST /cra/lot:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * GET /api/cra?mois=YYYY-MM&utilisateurId=...
 * Retourne les saisies du mois (pour l'utilisateur demandé, ou tous si admin et pas filtre).
 */
routeurCRA.get('/', async (req: Request, res: Response) => {
  try {
    const mois = (req.query.mois as string | undefined) || new Date().toISOString().slice(0, 7)
    const utilisateurId = req.query.utilisateurId as string | undefined

    const debut = new Date(`${mois}-01T00:00:00Z`)
    const finMois = new Date(debut)
    finMois.setUTCMonth(finMois.getUTCMonth() + 1)

    const where: Record<string, unknown> = {
      date: { gte: debut, lt: finMois },
    }
    if (utilisateurId) where.utilisateurId = utilisateurId

    const saisies = await prisma.saisieJourCRA.findMany({
      where,
      include: {
        utilisateur: { select: { id: true, prenom: true, nom: true, email: true, role: true } },
        responsableCRA: { select: { id: true, prenom: true, nom: true, role: true } },
      },
      orderBy: { date: 'asc' },
    })
    res.json({ succes: true, donnees: saisies })
  } catch (erreur) {
    console.error('Erreur GET /cra:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * GET /api/cra/utilisateurs — liste des utilisateurs actifs (pour le sélecteur côté UI)
 */
routeurCRA.get('/utilisateurs', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.utilisateur.findMany({
      where: { actif: true },
      select: { id: true, prenom: true, nom: true, telephone: true, photoPieceIdentite: true, role: true, filiere: true },
      orderBy: [{ prenom: 'asc' }],
    })
    res.json({ succes: true, donnees: users })
  } catch (erreur) {
    console.error('Erreur GET /cra/utilisateurs:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * POST /api/cra : upsert une saisie pour (utilisateurId, date)
 * Body : { utilisateurId?, date: 'YYYY-MM-DD', type, heures?, notes?,
 *         activite?, responsableCRAId?, photoDebut?, photoFin? }
 * Si utilisateurId absent → on prend req.utilisateur.utilisateurId
 */
routeurCRA.post('/', async (req: Request, res: Response) => {
  const parsed = schemaSaisie.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ succes: false, message: 'Données invalides', details: parsed.error.issues })
    return
  }
  try {
    const utilisateurId = parsed.data.utilisateurId || req.utilisateur!.utilisateurId
    const date = new Date(parsed.data.date + 'T00:00:00Z')
    const type = (parsed.data.type as TypeJourCRA | undefined) ?? TypeJourCRA.travail
    const heures = parsed.data.heures ?? (type === TypeJourCRA.travail ? 8 : 0)

    const champsCommuns = {
      type,
      heures,
      notes: parsed.data.notes ?? null,
      activite: parsed.data.activite ?? null,
      responsableCRAId: parsed.data.responsableCRAId ?? null,
      photoDebut: parsed.data.photoDebut ?? null,
      photoFin: parsed.data.photoFin ?? null,
    }

    const saisie = await prisma.saisieJourCRA.upsert({
      where: { utilisateurId_date: { utilisateurId, date } },
      create: {
        utilisateurId,
        date,
        ...champsCommuns,
      },
      update: champsCommuns,
      include: {
        utilisateur: { select: { id: true, prenom: true, nom: true } },
        responsableCRA: { select: { id: true, prenom: true, nom: true, role: true } },
      },
    })
    res.json({ succes: true, donnees: saisie })
  } catch (erreur) {
    console.error('Erreur POST /cra:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * DELETE /api/cra/:id — supprime une saisie
 */
routeurCRA.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.saisieJourCRA.delete({ where: { id: req.params.id } })
    res.json({ succes: true, message: 'Saisie supprimée' })
  } catch (erreur) {
    console.error('Erreur DELETE /cra:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * GET /api/cra/recap?mois=YYYY-MM
 * Recap par utilisateur : nombre de jours travaillés / absences / etc.
 */
routeurCRA.get('/recap', async (req: Request, res: Response) => {
  try {
    const mois = (req.query.mois as string | undefined) || new Date().toISOString().slice(0, 7)
    const debut = new Date(`${mois}-01T00:00:00Z`)
    const finMois = new Date(debut)
    finMois.setUTCMonth(finMois.getUTCMonth() + 1)

    const saisies = await prisma.saisieJourCRA.findMany({
      where: { date: { gte: debut, lt: finMois } },
      include: {
        utilisateur: { select: { id: true, prenom: true, nom: true, role: true } },
      },
    })

    // Agrégation par utilisateur
    type Agrege = {
      utilisateur: { id: string; prenom: string; nom: string; role: string }
      compteurs: Record<TypeJourCRA, number>
      heuresTotales: number
    }
    const par: Record<string, Agrege> = {}
    for (const s of saisies) {
      const k = s.utilisateurId
      if (!par[k]) {
        par[k] = {
          utilisateur: s.utilisateur,
          compteurs: {
            travail: 0, absence: 0, conge: 0, maladie: 0, formation: 0, ferie: 0,
          },
          heuresTotales: 0,
        }
      }
      par[k].compteurs[s.type] = (par[k].compteurs[s.type] || 0) + 1
      par[k].heuresTotales += s.heures
    }

    res.json({ succes: true, donnees: Object.values(par) })
  } catch (erreur) {
    console.error('Erreur GET /cra/recap:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * GET /api/cra/recap-semaine?mois=YYYY-MM
 * Récap par (utilisateur, semaine ISO) sur le mois demandé.
 * Renvoie : [{ utilisateur, semaines: [{ isoWeek, debut, fin, joursTravail, heures }] }]
 * Pour faciliter le rendu en tableau salariés × semaines.
 */
routeurCRA.get('/recap-semaine', async (req: Request, res: Response) => {
  try {
    const mois = (req.query.mois as string | undefined) || new Date().toISOString().slice(0, 7)
    const debut = new Date(`${mois}-01T00:00:00Z`)
    const finMois = new Date(debut)
    finMois.setUTCMonth(finMois.getUTCMonth() + 1)

    const saisies = await prisma.saisieJourCRA.findMany({
      where: { date: { gte: debut, lt: finMois } },
      include: {
        utilisateur: { select: { id: true, prenom: true, nom: true, role: true } },
      },
      orderBy: { date: 'asc' },
    })

    // Calcul du n° de semaine ISO 8601
    const isoWeek = (d: Date): { annee: number; semaine: number } => {
      const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
      const dayNum = date.getUTCDay() || 7
      date.setUTCDate(date.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
      const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
      return { annee: date.getUTCFullYear(), semaine: weekNum }
    }

    const lundiDeSemaine = (annee: number, semaine: number): Date => {
      const simple = new Date(Date.UTC(annee, 0, 1 + (semaine - 1) * 7))
      const dayOfWeek = simple.getUTCDay()
      const lundi = new Date(simple)
      lundi.setUTCDate(simple.getUTCDate() - ((dayOfWeek + 6) % 7))
      return lundi
    }

    type SemaineAgrege = {
      cle: string // YYYY-Wnn
      annee: number
      semaine: number
      debut: string // ISO
      fin: string   // ISO
      joursTravail: number
      heures: number
    }
    type UtilAgrege = {
      utilisateur: { id: string; prenom: string; nom: string; role: string }
      semaines: Record<string, SemaineAgrege>
    }

    const parUtil: Record<string, UtilAgrege> = {}
    for (const s of saisies) {
      const dDate = s.date instanceof Date ? s.date : new Date(s.date)
      const { annee, semaine } = isoWeek(dDate)
      const cleSem = `${annee}-W${String(semaine).padStart(2, '0')}`
      const k = s.utilisateurId
      if (!parUtil[k]) {
        parUtil[k] = { utilisateur: s.utilisateur, semaines: {} }
      }
      if (!parUtil[k].semaines[cleSem]) {
        const lundi = lundiDeSemaine(annee, semaine)
        const dimanche = new Date(lundi)
        dimanche.setUTCDate(lundi.getUTCDate() + 6)
        parUtil[k].semaines[cleSem] = {
          cle: cleSem,
          annee,
          semaine,
          debut: lundi.toISOString().slice(0, 10),
          fin: dimanche.toISOString().slice(0, 10),
          joursTravail: 0,
          heures: 0,
        }
      }
      if (s.type === TypeJourCRA.travail) parUtil[k].semaines[cleSem].joursTravail += 1
      parUtil[k].semaines[cleSem].heures += s.heures
    }

    const donnees = Object.values(parUtil).map((u) => ({
      utilisateur: u.utilisateur,
      semaines: Object.values(u.semaines).sort((a, b) => a.cle.localeCompare(b.cle)),
    }))

    res.json({ succes: true, donnees })
  } catch (erreur) {
    console.error('Erreur GET /cra/recap-semaine:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})
