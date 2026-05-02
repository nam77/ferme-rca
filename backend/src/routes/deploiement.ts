import { Router, type Request, type Response } from 'express'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { mkdir, writeFile, cp } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
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

/* ================================================================
   ORCHESTRATEUR — séquence de déploiement avec dossier dédié et
   journal d'étapes (poll côté frontend).

   Étapes :
   0. Création du dossier de travail
   1. Sauvegarde BDD (pg_dump → backup.sql)
   2. Build web Expo (mobile/dist → copie vers le dossier)
   3. Migration Prisma (prisma migrate deploy)
   4. Récap (résumé écrit dans le dossier)
   ================================================================ */

type EtapeStatut = 'en_attente' | 'en_cours' | 'reussi' | 'echec' | 'ignore'
type EtapeJournal = {
  numero: number
  titre: string
  statut: EtapeStatut
  debutMs: number | null
  finMs: number | null
  dureeMs: number | null
  message: string
  details: string
}
type EtatDeploiement = {
  id: string
  dossier: string
  debutMs: number
  finMs: number | null
  termine: boolean
  reussi: boolean
  options: { seed: boolean; build: boolean; migration: boolean }
  etapes: EtapeJournal[]
  journal: { ts: number; type: 'info' | 'succes' | 'erreur'; texte: string }[]
}
const DEPLOIEMENTS = new Map<string, EtatDeploiement>()

function nouvelleEtape(numero: number, titre: string): EtapeJournal {
  return { numero, titre, statut: 'en_attente', debutMs: null, finMs: null, dureeMs: null, message: '', details: '' }
}

function logEt(etat: EtatDeploiement, type: 'info' | 'succes' | 'erreur', texte: string) {
  etat.journal.push({ ts: Date.now(), type, texte })
}

async function executerEtape(
  etat: EtatDeploiement,
  etape: EtapeJournal,
  fn: () => Promise<{ message: string; details?: string }>,
): Promise<boolean> {
  etape.statut = 'en_cours'
  etape.debutMs = Date.now()
  logEt(etat, 'info', `▶ Étape ${etape.numero} — ${etape.titre} : démarrage`)
  try {
    const r = await fn()
    etape.statut = 'reussi'
    etape.finMs = Date.now()
    etape.dureeMs = etape.finMs - etape.debutMs
    etape.message = r.message
    etape.details = r.details ?? ''
    logEt(etat, 'succes', `✓ Étape ${etape.numero} — ${etape.titre} terminée avec succès (${etape.dureeMs} ms)`)
    return true
  } catch (e) {
    const err = e as Error & { stdout?: string; stderr?: string }
    etape.statut = 'echec'
    etape.finMs = Date.now()
    etape.dureeMs = etape.finMs - (etape.debutMs ?? 0)
    etape.message = err.message || 'Erreur inconnue'
    etape.details = (err.stderr || err.stdout || '').slice(-2000)
    logEt(etat, 'erreur', `✗ Étape ${etape.numero} — ${etape.titre} : ÉCHEC (${etape.message})`)
    return false
  }
}

routeurDeploiement.post('/orchestrer', async (req: Request, res: Response) => {
  const opts = req.body || {}
  const options = {
    seed: !!opts.seed,
    build: opts.build !== false, // par défaut on build
    migration: !!opts.migration,
  }

  const id = randomUUID()
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dossier = path.join(projetRoot, 'deploiements', `deploy-${ts}`)

  const etat: EtatDeploiement = {
    id,
    dossier,
    debutMs: Date.now(),
    finMs: null,
    termine: false,
    reussi: true,
    options,
    etapes: [
      nouvelleEtape(0, 'Création du dossier de travail'),
      nouvelleEtape(1, 'Sauvegarde de la base de données (pg_dump)'),
      ...(options.seed ? [nouvelleEtape(2, 'Réinitialisation des données (seed)')] : []),
      ...(options.build ? [nouvelleEtape(3, 'Build web (expo export)')] : []),
      ...(options.migration ? [nouvelleEtape(4, 'Migration Prisma (deploy)')] : []),
      nouvelleEtape(99, 'Récapitulatif final'),
    ],
    journal: [],
  }
  DEPLOIEMENTS.set(id, etat)
  // Réponse immédiate, exécution en arrière-plan
  res.json({ succes: true, donnees: { id, dossier } })

  // ─── Exécution séquentielle ───
  void (async () => {
    const trouverEtape = (n: number) => etat.etapes.find(e => e.numero === n)!
    let nbEchecs = 0

    // Étape 0 : créer le dossier
    const ok0 = await executerEtape(etat, trouverEtape(0), async () => {
      await mkdir(dossier, { recursive: true })
      await writeFile(path.join(dossier, 'INFO.txt'),
        `Déploiement Ferme Agropastorale RCA\n` +
        `Démarré : ${new Date().toISOString()}\n` +
        `ID : ${id}\n` +
        `Options : seed=${options.seed} build=${options.build} migration=${options.migration}\n`,
        'utf-8')
      return { message: `Dossier créé : ${dossier}`, details: '' }
    })
    if (!ok0) { etat.reussi = false; nbEchecs++; }

    // Étape 1 : pg_dump
    const ok1 = await executerEtape(etat, trouverEtape(1), async () => {
      const url = process.env.DATABASE_URL
      if (!url) throw new Error('DATABASE_URL non défini')
      const dest = path.join(dossier, 'backup.sql')
      await execAsync(
        `pg_dump --no-owner --no-acl --clean --if-exists "${url}" > "${dest}"`,
        { maxBuffer: 200 * 1024 * 1024, timeout: 180_000, shell: '/bin/bash' },
      )
      const stats = await import('node:fs').then(m => m.promises.stat(dest))
      const tailleMo = (stats.size / 1024 / 1024).toFixed(2)
      return { message: `backup.sql créé (${tailleMo} Mo)`, details: '' }
    })
    if (!ok1) { etat.reussi = false; nbEchecs++; }

    // Étape 2 : seed (optionnel)
    if (options.seed) {
      const ok2 = await executerEtape(etat, trouverEtape(2), async () => {
        const { stdout, stderr } = await execAsync('npm run seed', {
          cwd: backendRoot, timeout: 120_000, maxBuffer: 50 * 1024 * 1024,
        })
        await writeFile(path.join(dossier, 'seed.log'), stdout + '\n' + stderr, 'utf-8')
        return { message: 'Seed appliqué (log : seed.log)', details: stdout.slice(-500) }
      })
      if (!ok2) { etat.reussi = false; nbEchecs++; }
    }

    // Étape 3 : build web
    if (options.build) {
      const ok3 = await executerEtape(etat, trouverEtape(3), async () => {
        const mobileRoot = path.resolve(projetRoot, 'mobile')
        const { stdout, stderr } = await execAsync(
          'npx expo export --platform web --output-dir dist',
          { cwd: mobileRoot, timeout: 240_000, maxBuffer: 50 * 1024 * 1024 },
        )
        await writeFile(path.join(dossier, 'build.log'), stdout + '\n' + stderr, 'utf-8')
        // Copier le dist/ dans le dossier de déploiement
        const sourceDist = path.join(mobileRoot, 'dist')
        const destDist = path.join(dossier, 'web')
        await cp(sourceDist, destDist, { recursive: true })
        return { message: `Build copié dans web/`, details: stdout.slice(-500) }
      })
      if (!ok3) { etat.reussi = false; nbEchecs++; }
    }

    // Étape 4 : migration prisma
    if (options.migration) {
      const ok4 = await executerEtape(etat, trouverEtape(4), async () => {
        const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
          cwd: backendRoot, timeout: 60_000,
        })
        await writeFile(path.join(dossier, 'migration.log'), stdout + '\n' + stderr, 'utf-8')
        return { message: 'Migrations appliquées', details: stdout.slice(-500) }
      })
      if (!ok4) { etat.reussi = false; nbEchecs++; }
    }

    // Étape 99 : récap
    await executerEtape(etat, trouverEtape(99), async () => {
      etat.finMs = Date.now()
      const dureeS = ((etat.finMs - etat.debutMs) / 1000).toFixed(1)
      const recap = [
        `═══════════════════════════════════════════════`,
        `  DÉPLOIEMENT ${etat.reussi ? '✓ RÉUSSI' : '✗ AVEC ERREURS'}`,
        `═══════════════════════════════════════════════`,
        ``,
        `Démarré : ${new Date(etat.debutMs).toISOString()}`,
        `Terminé : ${new Date(etat.finMs).toISOString()}`,
        `Durée   : ${dureeS} s`,
        ``,
        `Étapes :`,
        ...etat.etapes.filter(e => e.numero !== 99).map(e =>
          ` ${e.statut === 'reussi' ? '✓' : e.statut === 'echec' ? '✗' : '·'}  ` +
          `Étape ${e.numero} — ${e.titre} (${e.dureeMs ?? 0} ms) — ${e.message}`,
        ),
        ``,
        `Échecs : ${nbEchecs}`,
        `Dossier : ${dossier}`,
      ].join('\n')
      await writeFile(path.join(dossier, 'RECAP.txt'), recap, 'utf-8')
      return { message: nbEchecs === 0 ? 'Déploiement terminé avec succès' : `Déploiement terminé avec ${nbEchecs} échec(s)`, details: '' }
    })

    etat.termine = true
    etat.finMs = Date.now()
    logEt(etat, etat.reussi ? 'succes' : 'erreur',
      etat.reussi ? `✓ Déploiement complet réussi` : `✗ Déploiement terminé avec ${nbEchecs} échec(s)`)
  })().catch((e) => {
    logEt(etat, 'erreur', `Erreur fatale orchestrateur : ${(e as Error).message}`)
    etat.termine = true
    etat.reussi = false
    etat.finMs = Date.now()
  })
})

routeurDeploiement.get('/etat/:id', (req: Request, res: Response) => {
  const etat = DEPLOIEMENTS.get(req.params.id)
  if (!etat) {
    res.status(404).json({ succes: false, message: 'Déploiement introuvable' })
    return
  }
  res.json({ succes: true, donnees: etat })
})

routeurDeploiement.get('/orchestres', (_req: Request, res: Response) => {
  const liste = Array.from(DEPLOIEMENTS.values())
    .sort((a, b) => b.debutMs - a.debutMs)
    .slice(0, 20)
    .map(e => ({
      id: e.id, dossier: e.dossier, debutMs: e.debutMs, finMs: e.finMs,
      termine: e.termine, reussi: e.reussi,
      nbEtapes: e.etapes.length,
      nbReussies: e.etapes.filter(et => et.statut === 'reussi').length,
    }))
  res.json({ succes: true, donnees: liste })
})
