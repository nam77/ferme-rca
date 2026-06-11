import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { prisma } from '../lib/prisma.js'
import { verifierAuth } from '../middleware/auth.js'
import { envoyerPushNouveauMessage } from '../lib/push.js'

export const routeurChat = Router()

// Toute la messagerie exige une session : « condition se connecter ».
routeurChat.use(verifierAuth)

// ─────────────────── Stockage des pièces jointes ────────────────────
// Disque : backend/uploads/chat/. Fichier renommé avec un id aléatoire +
// extension d'origine (le nom affiché est conservé séparément en base).
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dossierChat = path.resolve(__dirname, '..', '..', 'uploads', 'chat')
fs.mkdirSync(dossierChat, { recursive: true })

// Types acceptés : photos, vidéos, PDF, Word, Excel.
const TYPES_AUTORISES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  // Vidéos
  'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-matroska',
  // PDF
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
])

const stockage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dossierChat),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '').toLowerCase()
    const id = crypto.randomBytes(12).toString('hex')
    cb(null, `${Date.now()}-${id}${ext}`)
  },
})

const televersement = multer({
  storage: stockage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo (vidéos courtes incluses)
  fileFilter: (_req, file, cb) => {
    if (!TYPES_AUTORISES.has(file.mimetype)) {
      cb(new Error('Type de fichier non supporté (photo, vidéo, PDF, Word, Excel uniquement)'))
      return
    }
    cb(null, true)
  },
})

// Sélection commune pour renvoyer l'auteur sans données sensibles.
const selectionAuteur = { id: true, prenom: true, nom: true, role: true, filiere: true } as const

const formaterMessage = (m: {
  id: string
  contenu: string | null
  creeLe: Date
  pieceJointeUrl: string | null
  pieceJointeNom: string | null
  pieceJointeType: string | null
  pieceJointeTaille: number | null
  auteurId: string
  auteur: { id: string; prenom: string; nom: string; role: string; filiere: string | null }
}) => ({
  id: m.id,
  contenu: m.contenu,
  creeLe: m.creeLe.toISOString(),
  pieceJointe: m.pieceJointeUrl
    ? { url: m.pieceJointeUrl, nom: m.pieceJointeNom, type: m.pieceJointeType, taille: m.pieceJointeTaille }
    : null,
  auteur: {
    id: m.auteur.id,
    prenom: m.auteur.prenom,
    nom: m.auteur.nom,
    role: m.auteur.role,
    filiere: m.auteur.filiere,
  },
})

/**
 * GET /api/chat/messages
 * Query : apres? (ISO date) → ne renvoyer que les messages strictement
 *         postérieurs (polling incrémental). Sinon renvoie les 100 derniers.
 * Réponse triée du plus ancien au plus récent.
 */
routeurChat.get('/messages', async (req: Request, res: Response) => {
  try {
    const apres = typeof req.query.apres === 'string' ? new Date(req.query.apres) : null
    const apresValide = apres && !Number.isNaN(apres.getTime()) ? apres : null

    if (apresValide) {
      const messages = await prisma.messageEquipe.findMany({
        where: { creeLe: { gt: apresValide } },
        include: { auteur: { select: selectionAuteur } },
        orderBy: { creeLe: 'asc' },
        take: 200,
      })
      res.json({ succes: true, donnees: messages.map(formaterMessage) })
      return
    }

    // Premier chargement : les 100 plus récents, renvoyés en ordre chronologique.
    const messages = await prisma.messageEquipe.findMany({
      include: { auteur: { select: selectionAuteur } },
      orderBy: { creeLe: 'desc' },
      take: 100,
    })
    res.json({ succes: true, donnees: messages.reverse().map(formaterMessage) })
  } catch (erreur) {
    console.error('Erreur GET /chat/messages:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * POST /api/chat/televersement — upload d'une pièce jointe (multipart, champ « fichier »).
 * Renvoie { url, nom, type, taille } à joindre ensuite au message.
 */
routeurChat.post('/televersement', (req: Request, res: Response) => {
  // On gère l'erreur multer ici pour renvoyer un message clair (type/taille)
  // plutôt que le 500 générique du gestionnaire global.
  televersement.single('fichier')(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Téléversement refusé'
      res.status(400).json({ succes: false, message })
      return
    }
    if (!req.file) {
      res.status(400).json({ succes: false, message: 'Aucun fichier reçu' })
      return
    }
    const url = `/uploads/chat/${req.file.filename}`
    res.json({
      succes: true,
      donnees: {
        url,
        nom: req.file.originalname || 'fichier',
        type: req.file.mimetype,
        taille: req.file.size,
      },
    })
  })
})

const schemaMessage = z.object({
  contenu: z.string().max(4000).optional().nullable(),
  pieceJointe: z
    .object({
      url: z.string().max(500),
      nom: z.string().max(255).optional().nullable(),
      type: z.string().max(120).optional().nullable(),
      taille: z.number().int().nonnegative().optional().nullable(),
    })
    .optional()
    .nullable(),
})

/**
 * POST /api/chat/messages — poster un message (texte et/ou pièce jointe).
 * Au moins l'un des deux est requis.
 */
routeurChat.post('/messages', async (req: Request, res: Response) => {
  const parse = schemaMessage.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ succes: false, message: 'Données invalides' })
    return
  }
  const { contenu, pieceJointe } = parse.data
  const texte = contenu?.trim() || null
  if (!texte && !pieceJointe) {
    res.status(400).json({ succes: false, message: 'Message vide' })
    return
  }
  try {
    const auteurId = req.utilisateur!.utilisateurId
    const message = await prisma.messageEquipe.create({
      data: {
        contenu: texte,
        auteurId,
        pieceJointeUrl: pieceJointe?.url ?? null,
        pieceJointeNom: pieceJointe?.nom ?? null,
        pieceJointeType: pieceJointe?.type ?? null,
        pieceJointeTaille: pieceJointe?.taille ?? null,
      },
      include: { auteur: { select: selectionAuteur } },
    })
    res.status(201).json({ succes: true, donnees: formaterMessage(message) })

    // Notification push aux coéquipiers (best-effort, hors du chemin de réponse).
    const apercu = texte
      ? texte.length > 140 ? `${texte.slice(0, 137)}…` : texte
      : pieceJointe?.type?.startsWith('image/')
        ? '📷 Photo'
        : pieceJointe?.type?.startsWith('video/')
          ? '🎬 Vidéo'
          : '📎 Pièce jointe'
    void envoyerPushNouveauMessage({
      auteurId: message.auteur.id,
      auteurNom: `${message.auteur.prenom} ${message.auteur.nom}`.trim() || 'Équipe',
      apercu,
    })
  } catch (erreur) {
    console.error('Erreur POST /chat/messages:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * DELETE /api/chat/messages/:id — supprimer un message.
 * Autorisé à l'auteur du message ou à un admin.
 */
routeurChat.delete('/messages/:id', async (req: Request, res: Response) => {
  try {
    const message = await prisma.messageEquipe.findUnique({ where: { id: req.params.id } })
    if (!message) {
      res.status(404).json({ succes: false, message: 'Message introuvable' })
      return
    }
    const moi = req.utilisateur!
    if (message.auteurId !== moi.utilisateurId && moi.role !== 'admin') {
      res.status(403).json({ succes: false, message: 'Suppression non autorisée' })
      return
    }
    // Suppression du fichier joint sur disque (best-effort).
    if (message.pieceJointeUrl) {
      const nomFichier = path.basename(message.pieceJointeUrl)
      fs.promises.unlink(path.join(dossierChat, nomFichier)).catch(() => {})
    }
    await prisma.messageEquipe.delete({ where: { id: message.id } })
    res.json({ succes: true })
  } catch (erreur) {
    console.error('Erreur DELETE /chat/messages:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})
