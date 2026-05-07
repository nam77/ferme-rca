import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { routeurAuth } from './routes/auth.js'
import { routeurTaches } from './routes/taches.js'
import { routeurDashboard } from './routes/dashboard.js'
import { routeurBudget } from './routes/budget.js'
import { routeurZones } from './routes/zones.js'
import { routeurLots } from './routes/lots.js'
import { routeurParcelles } from './routes/parcelles.js'
import { routeurCRA } from './routes/cra.js'
import { routeurVentes } from './routes/ventes.js'
import { routeurDeploiement } from './routes/deploiement.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Journalisation simple : méthode + URL + statut + durée + corps si erreur 4xx/5xx
app.use((req: Request, res: Response, next: NextFunction) => {
  const debut = Date.now()
  const corpsReq = req.method !== 'GET' ? JSON.stringify(req.body).slice(0, 300) : ''
  res.on('finish', () => {
    const duree = Date.now() - debut
    const marqueur = res.statusCode >= 400 ? '⚠' : '✓'
    const ligne = `${marqueur} ${req.method} ${req.originalUrl} → ${res.statusCode} (${duree}ms)`
    if (res.statusCode >= 400 && corpsReq) {
      console.log(`${ligne}\n   corps: ${corpsReq}`)
    } else {
      console.log(ligne)
    }
  })
  next()
})

const limiteurAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { succes: false, message: 'Trop de tentatives, réessayez plus tard' },
})

app.get('/api/sante', (_req: Request, res: Response) => {
  res.json({
    succes: true,
    message: 'API Ferme RCA opérationnelle',
    heure: new Date().toISOString(),
  })
})

// Sert les photos uploadées (CRA, etc.) depuis backend/uploads/
// En prod, NGINX peut servir directement ce dossier (plus performant)
// mais Express le sert aussi pour le dev local et le fallback.
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.resolve(__dirname, '..', 'uploads')
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',
  fallthrough: true,
}))

app.use('/api/auth', limiteurAuth, routeurAuth)
app.use('/api/taches', routeurTaches)
app.use('/api/dashboard', routeurDashboard)
app.use('/api/budget', routeurBudget)
app.use('/api/zones', routeurZones)
app.use('/api/lots', routeurLots)
app.use('/api/parcelles', routeurParcelles)
app.use('/api/cra', routeurCRA)
app.use('/api/ventes', routeurVentes)
app.use('/api/deploiement', routeurDeploiement)

app.use((_req: Request, res: Response) => {
  res.status(404).json({ succes: false, message: 'Route inconnue' })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erreur non gérée:', err)
  res.status(500).json({ succes: false, message: 'Erreur serveur' })
})

app.listen(port, () => {
  console.log(`API Ferme RCA démarrée sur http://localhost:${port}`)
})
