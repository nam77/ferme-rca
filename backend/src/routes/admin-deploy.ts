import { Router, type Request, type Response, type NextFunction } from 'express'
import { spawn, type ChildProcess } from 'node:child_process'
import { createInterface } from 'node:readline'
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { verifierAuth, verifierRole } from '../middleware/auth.js'
import { Role } from '../generated/prisma/enums.js'
import { verifierJeton, type ContenuJeton } from '../lib/jeton.js'

export const routeurAdminDeploy = Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Compilé dans backend/dist/routes/, source dans backend/src/routes/
// Trois niveaux au-dessus = racine du repo dans les deux cas.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'deploy-server.sh')
const LOG_DIR = path.join(REPO_ROOT, 'backend', 'logs', 'deployments')

// Étapes attendues du script bash. L'ordre fait foi pour l'UI.
// Les deux dernières (rollback, done-rollback) sont des étapes
// conditionnelles : elles n'apparaissent en 'running' que si une étape
// précédente a échoué ou si le run a été annulé.
const STEP_IDS = [
  'backup-db',
  'git-pull',
  'backend-deps',
  'backend-build',
  'backend-reload',
  'frontend-deps',
  'frontend-build',
  'frontend-deploy',
  'tests-prod',
  'done',
  'rollback',
  'done-rollback',
] as const
type StepId = (typeof STEP_IDS)[number]

type StepStatus = 'pending' | 'running' | 'ok' | 'fail'
type Step = {
  id: StepId
  status: StepStatus
  startedAt?: number
  endedAt?: number
}
type LogLine = { ts: number; line: string }

type RunStatus = 'running' | 'success' | 'failed' | 'cancelled'
type RunState = {
  runId: string
  startedAt: number
  endedAt?: number
  declencheurId: string
  declencheurEmail: string
  status: RunStatus
  steps: Step[]
  currentStep?: StepId
  log: LogLine[]
  failureMessage?: string
  cancelDemande?: boolean
  // Non sérialisé
  clients?: Set<Response>
  proc?: ChildProcess
  watchdog?: NodeJS.Timeout
}

type RunPublic = Omit<RunState, 'clients' | 'proc' | 'watchdog'>

const runs = new Map<string, RunState>()
let runEnCours: string | null = null
const HISTORIQUE_MAX = 50
const LOG_MAX_LIGNES = 5000
// Watchdog global : si le script n'a pas rendu la main au bout de ce délai,
// on lui envoie SIGTERM pour déclencher son rollback. Le `tsc` figé d'hier
// aurait été tué après 45 min au lieu de rester zombie indéfiniment.
const RUN_TIMEOUT_MS = 45 * 60 * 1000

// ───────────────────────── Helpers ─────────────────────────

const sansClients = (s: RunState): RunPublic => {
  const { clients: _c, proc: _p, watchdog: _w, ...rest } = s
  return rest
}

const broadcast = (s: RunState, event: string, data: unknown): void => {
  if (!s.clients) return
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of s.clients) {
    try {
      client.write(payload)
    } catch {
      // Client tombé, sera nettoyé par le close handler
    }
  }
}

const persisterRun = async (s: RunState): Promise<void> => {
  await mkdir(LOG_DIR, { recursive: true })
  const fichier = path.join(LOG_DIR, `${s.runId}.json`)
  await writeFile(fichier, JSON.stringify(sansClients(s), null, 2), 'utf-8')
}

const etapeEnCours = (s: RunState): Step | undefined =>
  s.steps.find((x) => x.status === 'running')

// Middleware spécial pour SSE : EventSource ne supporte pas les headers
// custom donc on accepte aussi le JWT en query string (?jeton=...).
const verifierAuthQueryOuHeader = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const enteteAuth = req.headers.authorization
  let jeton: string | null = null
  if (enteteAuth && enteteAuth.startsWith('Bearer ')) {
    jeton = enteteAuth.slice('Bearer '.length).trim()
  } else if (typeof req.query.jeton === 'string') {
    jeton = req.query.jeton
  }
  if (!jeton) {
    res.status(401).json({ succes: false, message: 'Jeton manquant' })
    return
  }
  try {
    const contenu: ContenuJeton = verifierJeton(jeton)
    req.utilisateur = contenu
    next()
  } catch {
    res.status(401).json({ succes: false, message: 'Jeton invalide ou expiré' })
  }
}

// ───────────────────── POST /api/admin/deploy ──────────────
routeurAdminDeploy.post(
  '/deploy',
  verifierAuth,
  verifierRole(Role.admin),
  (req: Request, res: Response): void => {
    if (runEnCours) {
      res.status(409).json({
        succes: false,
        message: 'Un déploiement est déjà en cours',
        donnees: { runId: runEnCours },
      })
      return
    }
    const declencheur = req.utilisateur
    if (!declencheur) {
      res.status(401).json({ succes: false, message: 'Auth requise' })
      return
    }

    const runId = `run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const state: RunState = {
      runId,
      startedAt: Date.now(),
      declencheurId: declencheur.utilisateurId,
      declencheurEmail: declencheur.email,
      status: 'running',
      steps: STEP_IDS.map((id) => ({ id, status: 'pending' })),
      log: [],
      clients: new Set(),
    }
    runs.set(runId, state)
    runEnCours = runId

    const ajouterLog = (ligne: string): void => {
      const entry: LogLine = { ts: Date.now(), line: ligne }
      state.log.push(entry)
      if (state.log.length > LOG_MAX_LIGNES) state.log.shift()
      broadcast(state, 'log', entry)
    }

    const proc = spawn('bash', [SCRIPT_PATH], {
      cwd: REPO_ROOT,
      env: { ...process.env },
      detached: false,
    })
    state.proc = proc

    // Watchdog : si le déploiement n'est pas terminé au bout de RUN_TIMEOUT_MS,
    // on envoie SIGTERM. Le script bash a un trap TERM qui déclenche son rollback.
    state.watchdog = setTimeout(() => {
      if (state.status !== 'running') return
      ajouterLog(
        `[watchdog] Déploiement dépassant ${Math.round(RUN_TIMEOUT_MS / 60000)} min — SIGTERM envoyé pour déclencher le rollback`,
      )
      try {
        proc.kill('SIGTERM')
      } catch {
        /* déjà mort */
      }
      // Si le bash ignore SIGTERM, on l'achève au SIGKILL après 30s.
      setTimeout(() => {
        if (state.status === 'running') {
          ajouterLog('[watchdog] SIGTERM ignoré — SIGKILL forcé')
          try {
            proc.kill('SIGKILL')
          } catch {
            /* déjà mort */
          }
        }
      }, 30_000)
    }, RUN_TIMEOUT_MS)

    const rlOut = createInterface({ input: proc.stdout })
    const rlErr = createInterface({ input: proc.stderr })

    rlOut.on('line', (ligne: string) => {
      if (ligne.startsWith('::STEP::')) {
        const id = ligne.slice('::STEP::'.length) as StepId
        const step = state.steps.find((s) => s.id === id)
        if (step) {
          // Si une étape précédente était encore "running" sans OK explicite
          const stale = etapeEnCours(state)
          if (stale && stale.id !== id) {
            stale.status = 'fail'
            stale.endedAt = Date.now()
          }
          step.status = 'running'
          step.startedAt = Date.now()
          state.currentStep = id
          broadcast(state, 'step', step)
        }
      } else if (ligne.startsWith('::OK::')) {
        const id = ligne.slice('::OK::'.length) as StepId
        const step = state.steps.find((s) => s.id === id)
        if (step) {
          step.status = 'ok'
          step.endedAt = Date.now()
          broadcast(state, 'step', step)
        }
      } else if (ligne.startsWith('::FAIL::')) {
        const msg = ligne.slice('::FAIL::'.length)
        state.failureMessage = msg
        const step = etapeEnCours(state)
        if (step) {
          step.status = 'fail'
          step.endedAt = Date.now()
          broadcast(state, 'step', step)
        }
        ajouterLog(`✗ ${msg}`)
      } else {
        ajouterLog(ligne)
      }
    })

    rlErr.on('line', (ligne: string) => ajouterLog(`[stderr] ${ligne}`))

    const finir = async (codeSortie: number | null): Promise<void> => {
      state.endedAt = Date.now()
      if (state.watchdog) {
        clearTimeout(state.watchdog)
        state.watchdog = undefined
      }
      if (codeSortie === 0) {
        state.status = 'success'
      } else if (state.cancelDemande) {
        state.status = 'cancelled'
      } else {
        state.status = 'failed'
      }
      if (state.status !== 'success') {
        const step = etapeEnCours(state)
        if (step) {
          step.status = 'fail'
          step.endedAt = Date.now()
        }
      }
      broadcast(state, 'end', sansClients(state))
      runEnCours = null
      try {
        await persisterRun(state)
      } catch (err) {
        console.error('[deploy] échec persistance run', err)
      }
      // Fermer les clients SSE peu après pour qu'ils reçoivent le 'end'
      setTimeout(() => {
        if (state.clients) {
          for (const c of state.clients) {
            try {
              c.end()
            } catch {
              /* déjà fermé */
            }
          }
          state.clients.clear()
        }
      }, 500)
    }

    proc.on('close', (code) => {
      void finir(code)
    })
    proc.on('error', (err) => {
      ajouterLog(`[error] spawn: ${err.message}`)
      void finir(-1)
    })

    res.status(202).json({
      succes: true,
      donnees: { runId, startedAt: state.startedAt },
    })
  },
)

// ─────────── POST /api/admin/deploy/cancel/:runId ──────────
// Annule un run en cours en envoyant SIGTERM au script bash. Le script a un
// trap TERM qui déclenche son rollback automatique avant de quitter.
// Si après 30s le processus n'a pas terminé, SIGKILL est envoyé.
routeurAdminDeploy.post(
  '/deploy/cancel/:runId',
  verifierAuth,
  verifierRole(Role.admin),
  (req: Request, res: Response): void => {
    const { runId } = req.params
    const state = runs.get(runId)
    if (!state) {
      res.status(404).json({ succes: false, message: 'Run inconnu' })
      return
    }
    if (state.status !== 'running') {
      res.status(409).json({
        succes: false,
        message: `Run déjà terminé (statut: ${state.status})`,
      })
      return
    }
    if (!state.proc || state.proc.killed) {
      res.status(409).json({
        succes: false,
        message: 'Processus déjà inactif côté serveur',
      })
      return
    }

    state.cancelDemande = true
    const entry: LogLine = {
      ts: Date.now(),
      line: `[cancel] Annulation demandée par ${req.utilisateur?.email ?? 'admin'} — SIGTERM envoyé, rollback en cours`,
    }
    state.log.push(entry)
    broadcast(state, 'log', entry)

    try {
      state.proc.kill('SIGTERM')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      res.status(500).json({ succes: false, message: `kill SIGTERM échoué: ${msg}` })
      return
    }
    // Filet de sécurité : si le bash ignore SIGTERM (rollback figé ?),
    // on force SIGKILL après 30s pour ne pas rester bloqué.
    setTimeout(() => {
      if (state.status === 'running' && state.proc && !state.proc.killed) {
        const force: LogLine = {
          ts: Date.now(),
          line: '[cancel] SIGTERM ignoré après 30s — SIGKILL forcé (rollback partiel possible)',
        }
        state.log.push(force)
        broadcast(state, 'log', force)
        try {
          state.proc.kill('SIGKILL')
        } catch {
          /* déjà mort */
        }
      }
    }, 30_000)

    res.status(202).json({ succes: true, donnees: { runId } })
  },
)

// ─────────── GET /api/admin/deploy/stream/:runId (SSE) ──────
routeurAdminDeploy.get(
  '/deploy/stream/:runId',
  verifierAuthQueryOuHeader,
  verifierRole(Role.admin),
  (req: Request, res: Response): void => {
    const { runId } = req.params
    const state = runs.get(runId)
    if (!state) {
      res.status(404).json({ succes: false, message: 'Run inconnu' })
      return
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Nginx : désactive le buffering pour ce SSE
      'X-Accel-Buffering': 'no',
    })
    // État initial
    res.write(`event: state\ndata: ${JSON.stringify(sansClients(state))}\n\n`)

    if (state.status !== 'running') {
      res.write(`event: end\ndata: ${JSON.stringify(sansClients(state))}\n\n`)
      res.end()
      return
    }

    state.clients?.add(res)

    // Heartbeat pour éviter le timeout des proxys
    const heartbeat = setInterval(() => {
      try {
        res.write(': hb\n\n')
      } catch {
        clearInterval(heartbeat)
      }
    }, 15_000)

    req.on('close', () => {
      clearInterval(heartbeat)
      state.clients?.delete(res)
    })
  },
)

// ────────── GET /api/admin/deploy/runs (historique) ─────────
routeurAdminDeploy.get(
  '/deploy/runs',
  verifierAuth,
  verifierRole(Role.admin),
  async (_req: Request, res: Response): Promise<void> => {
    const enMemoire = Array.from(runs.values()).map(sansClients)
    const persistes: RunPublic[] = []
    try {
      const fichiers = await readdir(LOG_DIR)
      const jsonOrdonnes = fichiers.filter((f) => f.endsWith('.json')).sort().reverse()
      for (const f of jsonOrdonnes.slice(0, HISTORIQUE_MAX * 2)) {
        try {
          const brut = await readFile(path.join(LOG_DIR, f), 'utf-8')
          const data = JSON.parse(brut) as RunPublic
          if (!enMemoire.some((r) => r.runId === data.runId)) {
            persistes.push(data)
          }
        } catch {
          /* fichier corrompu, on ignore */
        }
      }
    } catch {
      /* pas encore de logs */
    }
    const tous = [...enMemoire, ...persistes].sort((a, b) => b.startedAt - a.startedAt)
    res.json({ succes: true, donnees: tous.slice(0, HISTORIQUE_MAX) })
  },
)

// ────────── GET /api/admin/deploy/run/:runId (un run) ───────
routeurAdminDeploy.get(
  '/deploy/run/:runId',
  verifierAuth,
  verifierRole(Role.admin),
  async (req: Request, res: Response): Promise<void> => {
    const { runId } = req.params
    const enMemoire = runs.get(runId)
    if (enMemoire) {
      res.json({ succes: true, donnees: sansClients(enMemoire) })
      return
    }
    try {
      const brut = await readFile(path.join(LOG_DIR, `${runId}.json`), 'utf-8')
      res.json({ succes: true, donnees: JSON.parse(brut) })
    } catch {
      res.status(404).json({ succes: false, message: 'Run inconnu' })
    }
  },
)
