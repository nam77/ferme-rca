import type { Filiere } from './auth.types'
import type { Tache } from './tache.types'

export type Photo = {
  id: string
  url: string
  legende: string | null
  creeLe: string
}

export type ZoneListe = {
  id: string
  nom: string
  filiere: Filiere
  surface: number | null
  description: string | null
  positionX: number
  positionY: number
  creeLe: string
  modifieLe: string
  photos: Photo[]
  _count: { taches: number }
}

export type ZoneDetail = Omit<ZoneListe, '_count'> & {
  taches: Tache[]
}
