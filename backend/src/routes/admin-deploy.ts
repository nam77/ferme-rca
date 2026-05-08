import { Router, type Request, type Response, type NextFunction } from 'express'
import { spawnSync } from 'node:child_process'
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import { openSync as fsOpenSync, closeSync, readSync, statSync, mkdirSync, readFileSync } from 'node:fs'
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
const RUNNER_PATH = path.join(REPO_ROOT, 'scripts', 'detached-runner.sh')
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
  // Persistés sur disque (pour reprise après reload Express)
  proc_pid?: number
  log_file?: string
  log_offset?: number
  // Non sérialisé
  clients?: Set<Response>
  watchdog?: NodeJS.Timeout
  poller?: NodeJS.Timeout
}

type RunPublic = Omit<RunState, 'clients' | 'watchdog' | 'poller'>

const runs = new Map<string, RunState>()
let runEnCours: string | null = null
const HISTORIQUE_MAX = 50
const LOG_MAX_LIGNES = 5000
// Watchdog global : si le script n'a pas rendu la main au bout de ce délai,
// on lui envoie SIGTERM pour déclencher son rollback.
const RUN_TIMEOUT_MS = 45 * 60 * 1000
// Intervalle de polling du fichier log du bash (ms).
const POLL_INTERVAL_MS = 300

// ───────────────────────── Helpers ─────────────────────────

const sansClients = (s: RunState): RunPublic => {
  const { clients: _c, watchdog: _w, poller: _p, ...rest } = s
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

// Persistance debouncée pour ne pas écrire à chaque ligne de log.
const persisterRunDebounce = (() => {
  const timers = new Map<string, NodeJS.Timeout>()
  return (s: RunState, ms = 500): void => {
    const existant = timers.get(s.runId)
    if (existant) clearTimeout(existant)
    const t = setTimeout(() => {
      timers.delete(s.runId)
      void persisterRun(s).catch((err) =>
        console.error('[deploy] persistance debounce', err),
      )
    }, ms)
    timers.set(s.runId, t)
  }
})()

const etapeEnCours = (s: RunState): Step | undefined =>
  s.steps.find((x) => x.status === 'running')

const estProcessusVivant = (pid?: number): boolean => {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

// Envoie un signal au groupe de processus du bash (PID négatif).
// Critique pour l'annulation : si on envoie SIGTERM uniquement au PID du
// bash, son trap ne sera exécuté qu'après la fin de la commande en cours
// (le `wait` implicite sur `npm run build` peut durer jusqu'au timeout
// de l'étape, soit 5-10 min). En l'envoyant au groupe entier, on tue
// `npm`/`tsc`/`expo` immédiatement, le bash sort de son wait, et son
// trap déclenche le rollback dans la seconde.
// Avec spawn detached:true, Node appelle setsid → le bash a son propre
// process group dont l'ID = son PID. Fallback sur kill direct du PID si
// le PG n'existe plus (proc déjà mort, etc.).
const tuerGroupe = (pid: number | undefined, signal: NodeJS.Signals): boolean => {
  if (!pid) return false
  try {
    process.kill(-pid, signal)
    return true
  } catch {
    try {
      process.kill(pid, signal)
      return true
    } catch {
      return false
    }
  }
}

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

// ─────────────────── Traitement des lignes du bash ─────────────────

const ajouterLog = (state: RunState, ligne: string): void => {
  const entry: LogLine = { ts: Date.now(), line: ligne }
  state.log.push(entry)
  if (state.log.length > LOG_MAX_LIGNES) state.log.shift()
  broadcast(state, 'log', entry)
}

const traiterLigne = (state: RunState, ligne: string): void => {
  if (ligne.startsWith('::STEP::')) {
    const id = ligne.slice('::STEP::'.length) as StepId
    const step = state.steps.find((s) => s.id === id)
    if (step) {
      const stale = etapeEnCours(state)
      if (stale && stale.id !== id) {
        stale.status = 'fail'
        stale.endedAt = Date.now()
      }
      step.status = 'running'
      step.startedAt = Date.now()
      state.currentStep = id
      broadcast(state, 'step', step)
      persisterRunDebounce(state)
    }
  } else if (ligne.startsWith('::OK::')) {
    const id = ligne.slice('::OK::'.length) as StepId
    const step = state.steps.find((s) => s.id === id)
    if (step) {
      step.status = 'ok'
      step.endedAt = Date.now()
      broadcast(state, 'step', step)
      persisterRunDebounce(state)
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
    ajouterLog(state, `✗ ${msg}`)
    persisterRunDebounce(state)
  } else {
    ajouterLog(state, ligne)
  }
}

// Lit le fichier log à partir de log_offset, traite chaque ligne complète,
// met à jour log_offset, et retourne true si du nouveau contenu a été lu.
const lireDeltaLog = (state: RunState): boolean => {
  if (!state.log_file) return false
  let stats
  try {
    stats = statSync(state.log_file)
  } catch {
    return false
  }
  const from = state.log_offset ?? 0
  if (stats.size <= from) return false

  const fd = fsOpenSync(state.log_file, 'r')
  const taille = stats.size - from
  const buffer = Buffer.alloc(taille)
  let lus = 0
  try {
    lus = readSync(fd, buffer, 0, taille, from)
  } finally {
    closeSync(fd)
  }
  const texte = buffer.subarray(0, lus).toString('utf-8')
  // On split en lignes complètes ; si le dernier morceau n'a pas de \n
  // final, on ne l'avance pas, on attendra le prochain poll.
  const dernierNL = texte.lastIndexOf('\n')
  if (dernierNL < 0) return false

  const completes = texte.slice(0, dernierNL)
  state.log_offset = from + Buffer.byteLength(completes, 'utf-8') + 1
  for (const ligne of completes.split('\n')) {
    if (ligne.length > 0) traiterLigne(state, ligne)
  }
  return true
}

const finir = async (state: RunState, codeSortie: number | null): Promise<void> => {
  if (state.status !== 'running') return
  state.endedAt = Date.now()
  if (state.watchdog) {
    clearTimeout(state.watchdog)
    state.watchdog = undefined
  }
  if (state.poller) {
    clearInterval(state.poller)
    state.poller = undefined
  }
  // Lecture finale au cas où des lignes seraient encore en attente
  try {
    lireDeltaLog(state)
  } catch {
    /* ignore */
  }

  // Détermination du statut final.
  // Si on n'a pas le code de sortie (cas reprise après reload), on déduit
  // depuis les marqueurs ::OK::done / ::OK::done-rollback.
  if (codeSortie === 0) {
    state.status = 'success'
  } else if (state.cancelDemande) {
    state.status = 'cancelled'
  } else if (codeSortie === null) {
    const finOk = state.steps.find((s) => s.id === 'done' && s.status === 'ok')
    const rbOk = state.steps.find((s) => s.id === 'done-rollback' && s.status === 'ok')
    if (finOk) state.status = 'success'
    else if (rbOk) state.status = 'failed'
    else state.status = 'failed'
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
  if (runEnCours === state.runId) runEnCours = null
  try {
    await persisterRun(state)
  } catch (err) {
    console.error('[deploy] échec persistance run', err)
  }
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

// Démarre le polling du fichier log du bash et la surveillance du PID.
// Utilisé à la fois pour un nouveau run et pour reprendre un run orphelin
// après un reload de l'Express (le bash a survécu grâce au detached spawn).
const attacherSuiviRun = (state: RunState): void => {
  if (state.poller) return
  state.poller = setInterval(() => {
    try {
      lireDeltaLog(state)
    } catch (err) {
      console.error('[deploy] lecture log', err)
    }
    if (!estProcessusVivant(state.proc_pid)) {
      // Le bash est terminé. On marque la fin sans connaître le code de
      // sortie : finir() le déduit des marqueurs.
      void finir(state, null)
    }
  }, POLL_INTERVAL_MS)
}

// ───────── Reprise des runs orphelins au boot du backend ─────────
// Scanne LOG_DIR. Pour chaque run encore en status 'running' :
// - si le PID est vivant : on rebranche le suivi (le bash continue à
//   écrire dans le log file, on reprend la lecture là où on s'était arrêté)
// - sinon : on marque le run en 'failed' avec un message explicite, pour
//   que l'historique soit propre et l'IHM ne reste pas bloquée.
const recupererRunsOrphelins = async (): Promise<void> => {
  try {
    await mkdir(LOG_DIR, { recursive: true })
    const fichiers = await readdir(LOG_DIR)
    for (const f of fichiers.filter((x) => x.endsWith('.json'))) {
      try {
        const brut = await readFile(path.join(LOG_DIR, f), 'utf-8')
        const data = JSON.parse(brut) as RunState
        if (data.status !== 'running') continue
        if (estProcessusVivant(data.proc_pid)) {
          // Bash a survécu au reload. On reprend.
          data.clients = new Set()
          runs.set(data.runId, data)
          runEnCours = data.runId
          ajouterLog(
            data,
            '[reprise] Backend Express redémarré — suivi du déploiement repris',
          )
          attacherSuiviRun(data)
          // Watchdog résiduel : reste du temps original
          const restant = Math.max(60_000, RUN_TIMEOUT_MS - (Date.now() - data.startedAt))
          data.watchdog = setTimeout(() => {
            if (data.status !== 'running') return
            ajouterLog(data, '[watchdog] timeout après reprise — SIGTERM au groupe')
            tuerGroupe(data.proc_pid, 'SIGTERM')
          }, restant)
          console.log(`[deploy] run orphelin repris : ${data.runId} (PID ${data.proc_pid})`)
        } else {
          // Bash est mort pendant que Express était down. On clôture proprement.
          data.status = 'failed'
          data.failureMessage =
            data.failureMessage ??
            'Backend redémarré pendant le déploiement — état perdu, vérifier manuellement la prod'
          data.endedAt = Date.now()
          for (const step of data.steps) {
            if (step.status === 'running') {
              step.status = 'fail'
              step.endedAt = Date.now()
            }
          }
          await persisterRun(data)
          console.warn(`[deploy] run orphelin marqué failed : ${data.runId}`)
        }
      } catch (err) {
        console.error(`[deploy] reprise impossible pour ${f}`, err)
      }
    }
  } catch (err) {
    console.error('[deploy] échec scan runs orphelins', err)
  }
}
// Auto-déclenchement au chargement du module (= au boot de l'Express).
void recupererRunsOrphelins()

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
    const logFile = path.join(LOG_DIR, `${runId}.log`)
    const pidFile = path.join(LOG_DIR, `${runId}.pid`)
    try {
      mkdirSync(LOG_DIR, { recursive: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      res.status(500).json({ succes: false, message: `mkdir LOG_DIR: ${msg}` })
      return
    }

    const state: RunState = {
      runId,
      startedAt: Date.now(),
      declencheurId: declencheur.utilisateurId,
      declencheurEmail: declencheur.email,
      status: 'running',
      steps: STEP_IDS.map((id) => ({ id, status: 'pending' })),
      log: [],
      log_file: logFile,
      log_offset: 0,
      clients: new Set(),
    }
    runs.set(runId, state)
    runEnCours = runId

    // On lance le bash via detached-runner.sh : double-fork + setsid →
    // le bash réel devient orphelin (PPID=1, init), invisible au
    // tree-kill que pm2 utilise quand il reload Express. Sans ça, le
    // pm2 reload de l'étape 5 du déploiement tue notre propre bash.
    const wrapper = spawnSync('bash', [RUNNER_PATH, SCRIPT_PATH, logFile, pidFile], {
      cwd: REPO_ROOT,
      env: { ...process.env },
    })
    if (wrapper.status !== 0) {
      const stderr = wrapper.stderr?.toString() ?? ''
      res.status(500).json({
        succes: false,
        message: `detached-runner a échoué (status ${wrapper.status}) : ${stderr}`,
      })
      return
    }

    // Lire le PID écrit par le wrapper. Le wrapper attend jusqu'à 0.5s
    // que le PID soit écrit avant de quitter, donc à ce point le fichier
    // doit exister. On retry quand même brièvement par sécurité.
    let pid = 0
    for (let i = 0; i < 20; i++) {
      try {
        const contenu = readFileSync(pidFile, 'utf-8').trim()
        if (contenu) {
          pid = parseInt(contenu, 10)
          if (pid > 0) break
        }
      } catch {
        /* pas encore créé */
      }
      // wait 50ms synchrone (acceptable, c'est la perf du démarrage)
      const debut = Date.now()
      while (Date.now() - debut < 50) {
        /* busy-wait court */
      }
    }
    if (pid <= 0) {
      res.status(500).json({
        succes: false,
        message: 'PID du bash non récupéré après le double-fork',
      })
      return
    }
    state.proc_pid = pid

    // Persiste immédiatement : si Express crashe juste après, on a la
    // trace du run (avec PID + log_file) pour la reprise.
    void persisterRun(state)

    // Watchdog
    state.watchdog = setTimeout(() => {
      if (state.status !== 'running') return
      ajouterLog(
        state,
        `[watchdog] Déploiement dépassant ${Math.round(RUN_TIMEOUT_MS / 60000)} min — SIGTERM envoyé au groupe pour déclencher le rollback`,
      )
      tuerGroupe(state.proc_pid, 'SIGTERM')
      setTimeout(() => {
        if (state.status === 'running' && estProcessusVivant(state.proc_pid)) {
          ajouterLog(state, '[watchdog] SIGTERM ignoré — SIGKILL forcé')
          tuerGroupe(state.proc_pid, 'SIGKILL')
        }
      }, 30_000)
    }, RUN_TIMEOUT_MS)

    // Démarre le polling du log file
    attacherSuiviRun(state)

    res.status(202).json({
      succes: true,
      donnees: { runId, startedAt: state.startedAt },
    })
  },
)

// ─────────── POST /api/admin/deploy/cancel/:runId ──────────
// Annule un run en cours en envoyant SIGTERM au bash (via PID stocké).
// Le script a un trap TERM qui déclenche son rollback automatique.
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
    if (!estProcessusVivant(state.proc_pid)) {
      // Process déjà mort : on clôture le run au lieu d'échouer.
      state.cancelDemande = true
      void finir(state, null)
      res.status(202).json({
        succes: true,
        donnees: { runId, message: 'Processus déjà inactif — run clôturé' },
      })
      return
    }

    state.cancelDemande = true
    ajouterLog(
      state,
      `[cancel] Annulation demandée par ${req.utilisateur?.email ?? 'admin'} — SIGTERM envoyé au groupe, rollback en cours`,
    )
    persisterRunDebounce(state, 0)

    if (!tuerGroupe(state.proc_pid, 'SIGTERM')) {
      res.status(500).json({ succes: false, message: 'kill SIGTERM échoué' })
      return
    }
    // Filet de sécurité : SIGKILL après 60s si le bash + son rollback
    // ne se sont pas terminés. 60s laisse le temps au rollback (git reset,
    // pm2 reload, redeploy Cloudflare) de finir proprement.
    setTimeout(() => {
      if (state.status === 'running' && estProcessusVivant(state.proc_pid)) {
        ajouterLog(
          state,
          '[cancel] Rollback dépassant 60s — SIGKILL forcé (état partiel possible)',
        )
        tuerGroupe(state.proc_pid, 'SIGKILL')
      }
    }, 60_000)

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
