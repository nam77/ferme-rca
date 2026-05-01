import type { Filiere } from './auth.types'

export type Statut = 'a_faire' | 'en_cours' | 'termine'
export type Priorite = 'haute' | 'moyenne' | 'basse'

export type ResponsableMin = {
  id: string
  prenom: string
  nom: string
  email: string
}

export type SousTache = {
  id: string
  tacheId: string
  titre: string
  faite: boolean
  ordre: number
  creeLe: string
  modifieLe: string
}

export type Tache = {
  id: string
  titre: string
  description: string | null
  filiere: Filiere
  priorite: Priorite
  statut: Statut
  dateLimite: string | null
  dateDebut: string | null
  dateFinReelle: string | null
  responsableId: string | null
  responsable: ResponsableMin | null
  createurId: string
  createur: { id: string; prenom: string; nom: string } | null
  zoneId: string | null
  zone: { id: string; nom: string } | null
  sousTaches?: SousTache[]
  creeLe: string
  modifieLe: string
}

export type EntreeCreationTache = {
  titre: string
  description?: string
  filiere: Filiere
  priorite?: Priorite
  statut?: Statut
  dateLimite?: string | null
  responsableId?: string | null
}
