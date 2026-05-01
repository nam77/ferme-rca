import type { Filiere } from './auth.types'
import type { Priorite, Statut, Tache } from './tache.types'

export type CompteParStatut = Record<Statut, number>
export type CompteParFiliere = Record<Filiere, number>
export type CompteParPriorite = Record<Priorite, number>

export type Mouvement = {
  id: string
  ancienStatut: Statut
  nouveauStatut: Statut
  creeLe: string
  tache: { id: string; titre: string; filiere: Filiere } | null
  auteur: { id: string; prenom: string; nom: string } | null
}

export type Dashboard = {
  totalTaches: number
  tachesTerminees: number
  tachesEnRetard: number
  progressionGlobale: number
  tachesParStatut: CompteParStatut
  tachesParFiliere: CompteParFiliere
  tachesParPriorite: CompteParPriorite
  prochainesEcheances: Tache[]
  derniersMouvements: Mouvement[]
  genereLe: string
}
