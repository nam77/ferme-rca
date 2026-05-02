import { Router, type Request, type Response } from 'express'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { prisma } from '../lib/prisma.js'
import { verifierAuth } from '../middleware/auth.js'
import { Role } from '../generated/prisma/enums.js'

const execAsync = promisify(exec)
export const routeurDeploiement = Router()

routeurDeploiement.use(verifierAuth)

// Garde admin
routeurDeploiement.use((req, res, next) => {
  if (req.utilisateur?.role !== Role.admin) {
    res.status(403).json({ succes: false, message: 'Accès réservé à l\'administrateur' })
    return
  }
  next()
})

// Racine du projet déduite du cwd au démarrage du backend (= /home/.../ferme-rca/backend)
const backendRoot = process.cwd()
const projetRoot = path.resolve(backendRoot, '..')

/**
 * GET /api/deploiement/statut — état général du système.
 * Sûr à exposer en lecture, juste destiné à l'admin.
 */
routeurDeploiement.get('/statut', async (_req: Request, res: Response) => {
  try {
    const [
      nbUtilisateurs, nbTaches, nbLots, nbMouvements,
      nbParcelles, nbEvenements, nbBudget, nbVentes, nbSaisiesCRA,
    ] = await Promise.all([
      prisma.utilisateur.count(),
      prisma.tache.count(),
      prisma.lotAnimaux.count(),
      prisma.mouvementAnimal.count(),
      prisma.parcelle.count(),
      prisma.evenementCulture.count(),
      prisma.budgetLigne.count(),
      prisma.vente.count(),
      prisma.saisieJourCRA.count(),
    ])

    res.json({
      succes: true,
      donnees: {
        serveur: {
          uptime: Math.round(process.uptime()),
          nodeVersion: process.version,
          plateforme: process.platform,
          memoireMo: Math.round(process.memoryUsage().rss / 1024 / 1024),
          environnement: process.env.NODE_ENV || 'development',
          port: Number(process.env.PORT ?? 3001),
        },
        bdd: {
          urlMasquee: maskerDatabaseUrl(process.env.DATABASE_URL || ''),
          tables: {
            utilisateurs: nbUtilisateurs,
            taches: nbTaches,
            lots: nbLots,
            mouvementsAnimaux: nbMouvements,
            parcelles: nbParcelles,
            evenementsCulture: nbEvenements,
            lignesBudget: nbBudget,
            ventes: nbVentes,
            saisiesCRA: nbSaisiesCRA,
          },
        },
      },
    })
  } catch (erreur) {
    console.error('Erreur GET /deploiement/statut:', erreur)
    res.status(500).json({ succes: false, message: 'Erreur serveur' })
  }
})

/**
 * POST /api/deploiement/seed — relance le seed de la BDD.
 * Détruit et recrée toutes les données NON utilisateur (taches, lots,
 * parcelles, budget, ventes, CRA). Les comptes utilisateurs sont
 * conservés (upsert).
 */
routeurDeploiement.post('/seed', async (_req: Request, res: Response) => {
  try {
    const { stdout, stderr } = await execAsync('npm run seed', {
      cwd: backendRoot,
      timeout: 120_000,
    })
    res.json({ succes: true, donnees: { stdout: stdout.slice(-4000), stderr: stderr.slice(-1000) } })
  } catch (erreur) {
    const e = erreur as { stdout?: string; stderr?: string; message?: string }
    res.status(500).json({
      succes: false,
      message: e.message || 'Échec du seed',
      stdout: (e.stdout || '').slice(-4000),
      stderr: (e.stderr || '').slice(-1000),
    })
  }
})

/**
 * POST /api/deploiement/migration — applique les migrations Prisma
 * en production (équivalent de `prisma migrate deploy`).
 */
routeurDeploiement.post('/migration', async (_req: Request, res: Response) => {
  try {
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
      cwd: backendRoot,
      timeout: 60_000,
    })
    res.json({ succes: true, donnees: { stdout: stdout.slice(-4000), stderr: stderr.slice(-1000) } })
  } catch (erreur) {
    const e = erreur as { stdout?: string; stderr?: string; message?: string }
    res.status(500).json({
      succes: false,
      message: e.message || 'Échec de la migration',
      stdout: (e.stdout || '').slice(-4000),
      stderr: (e.stderr || '').slice(-1000),
    })
  }
})

/**
 * GET /api/deploiement/backup — dump SQL complet de la BDD.
 * Renvoie le contenu pg_dump en text/plain téléchargeable.
 */
routeurDeploiement.get('/backup', async (_req: Request, res: Response) => {
  try {
    const url = process.env.DATABASE_URL
    if (!url) {
      res.status(500).json({ succes: false, message: 'DATABASE_URL non défini' })
      return
    }
    const { stdout } = await execAsync(
      `pg_dump --no-owner --no-acl --clean --if-exists "${url}"`,
      { maxBuffer: 200 * 1024 * 1024, timeout: 120_000 },
    )
    const datestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="ferme-rca-backup-${datestamp}.sql"`)
    res.send(stdout)
  } catch (erreur) {
    const e = erreur as { message?: string }
    console.error('Erreur backup:', e)
    res.status(500).json({ succes: false, message: e.message || 'Échec du backup' })
  }
})

/**
 * POST /api/deploiement/build-web — relance le build Expo Web.
 * Utile pour rafraîchir mobile/dist/ après modification du HTML.
 */
routeurDeploiement.post('/build-web', async (_req: Request, res: Response) => {
  try {
    const mobileRoot = path.resolve(projetRoot, 'mobile')
    const { stdout, stderr } = await execAsync(
      'npx expo export --platform web --output-dir dist',
      { cwd: mobileRoot, timeout: 240_000, maxBuffer: 50 * 1024 * 1024 },
    )
    res.json({ succes: true, donnees: { stdout: stdout.slice(-4000), stderr: stderr.slice(-1000) } })
  } catch (erreur) {
    const e = erreur as { stdout?: string; stderr?: string; message?: string }
    res.status(500).json({
      succes: false,
      message: e.message || 'Échec du build',
      stdout: (e.stdout || '').slice(-4000),
      stderr: (e.stderr || '').slice(-1000),
    })
  }
})

function maskerDatabaseUrl(url: string): string {
  // Cache le mot de passe : postgresql://user:****@host:port/db
  return url.replace(/:[^:@]*@/, ':****@')
}
