import 'dotenv/config'
import jwt, { type SignOptions } from 'jsonwebtoken'
import type { Role } from '../generated/prisma/enums.js'

const SECRET = process.env.JWT_SECRET
const DUREE = (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn']

if (!SECRET) {
  throw new Error('JWT_SECRET manquant dans .env')
}

export type ContenuJeton = {
  utilisateurId: string
  email: string
  role: Role
}

export const signerJeton = (contenu: ContenuJeton): string => {
  return jwt.sign(contenu, SECRET, { expiresIn: DUREE })
}

export const verifierJeton = (jeton: string): ContenuJeton => {
  return jwt.verify(jeton, SECRET) as ContenuJeton
}

// ───────────── Jeton de réinitialisation de mot de passe ─────────────
// Signé avec une clé dérivée du hash actuel du mot de passe : le jeton
// devient automatiquement invalide dès que le mot de passe change (usage
// unique de fait). Expire en 1 h.
const cleReset = (motDePasseHash: string): string => `${SECRET}|reset|${motDePasseHash}`

export const signerJetonReset = (utilisateurId: string, motDePasseHash: string): string => {
  return jwt.sign({ utilisateurId, type: 'reset' }, cleReset(motDePasseHash), { expiresIn: '1h' })
}

// Lecture NON vérifiée du payload (pour retrouver l'utilisateur avant de
// pouvoir recalculer la clé de vérification).
export const lireUtilisateurIdReset = (jeton: string): string | null => {
  const decode = jwt.decode(jeton) as { utilisateurId?: string } | null
  return decode?.utilisateurId ?? null
}

export const verifierJetonReset = (jeton: string, motDePasseHash: string): string => {
  const payload = jwt.verify(jeton, cleReset(motDePasseHash)) as {
    utilisateurId: string
    type?: string
  }
  if (payload.type !== 'reset') throw new Error('Type de jeton invalide')
  return payload.utilisateurId
}
