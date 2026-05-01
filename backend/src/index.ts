import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { routeurAuth } from './routes/auth.js'
import { routeurTaches } from './routes/taches.js'
import { routeurDashboard } from './routes/dashboard.js'
import { routeurBudget } from './routes/budget.js'
import { routeurZones } from './routes/zones.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)

app.use(cors())
app.use(express.json({ limit: '1mb' }))

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

app.use('/api/auth', limiteurAuth, routeurAuth)
app.use('/api/taches', routeurTaches)
app.use('/api/dashboard', routeurDashboard)
app.use('/api/budget', routeurBudget)
app.use('/api/zones', routeurZones)

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
