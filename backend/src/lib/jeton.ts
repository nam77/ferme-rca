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
