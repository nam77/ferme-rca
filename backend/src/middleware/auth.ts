import type { Request, Response, NextFunction } from 'express'
import { verifierJeton, type ContenuJeton } from '../lib/jeton.js'
import type { Role } from '../generated/prisma/enums.js'

declare global {
  namespace Express {
    interface Request {
      utilisateur?: ContenuJeton
    }
  }
}

export const verifierAuth = (req: Request, res: Response, next: NextFunction): void => {
  const entete = req.headers.authorization
  if (!entete || !entete.startsWith('Bearer ')) {
    res.status(401).json({ succes: false, message: 'Jeton manquant' })
    return
  }
  const jeton = entete.slice('Bearer '.length).trim()
  try {
    req.utilisateur = verifierJeton(jeton)
    next()
  } catch {
    res.status(401).json({ succes: false, message: 'Jeton invalide ou expiré' })
  }
}

// Décode le JWT s'il est présent, mais laisse passer les requêtes anonymes.
// Utilisé sur les routes lisibles publiquement (mode consultatif).
export const verifierAuthOptionnel = (req: Request, _res: Response, next: NextFunction): void => {
  const entete = req.headers.authorization
  if (entete && entete.startsWith('Bearer ')) {
    const jeton = entete.slice('Bearer '.length).trim()
    try {
      req.utilisateur = verifierJeton(jeton)
    } catch {
      // Jeton invalide → on ignore et on continue en anonyme.
    }
  }
  next()
}

// Bloque toute méthode mutante (POST/PUT/PATCH/DELETE) si pas authentifié.
// À chaîner après verifierAuthOptionnel sur les routeurs publics en lecture.
export const protegerMutations = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next()
    return
  }
  if (!req.utilisateur) {
    res.status(401).json({ succes: false, message: 'Authentification requise pour cette action' })
    return
  }
  next()
}

export const verifierRole = (...rolesAutorises: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.utilisateur) {
      res.status(401).json({ succes: false, message: 'Non authentifié' })
      return
    }
    if (!rolesAutorises.includes(req.utilisateur.role)) {
      res.status(403).json({ succes: false, message: 'Accès interdit pour ce rôle' })
      return
    }
    next()
  }
}
