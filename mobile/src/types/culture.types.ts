export type TypeCulture =
  | 'mais'
  | 'manioc'
  | 'arachide'
  | 'legumes'
  | 'brachiaria'
  | 'bananier'
  | 'jachere'

export type StatutParcelle =
  | 'preparation'
  | 'semis'
  | 'croissance'
  | 'recolte'
  | 'jachere'
  | 'abandonnee'

export type TypeEvenementCulture =
  | 'preparation_sol'
  | 'semis'
  | 'fertilisation'
  | 'irrigation'
  | 'traitement'
  | 'desherbage'
  | 'recolte'
  | 'observation'

export type ZoneMin = { id: string; nom: string }
export type AuteurMin = { id: string; prenom: string; nom: string }

export type ParcelleResume = {
  id: string
  nom: string
  typeCulture: TypeCulture
  surfaceHa: number
  dateSemis: string | null
  dateRecoltePrev: string | null
  rendementPrevuKg: number | null
  rendementReelKg: number | null
  statut: StatutParcelle
  notes: string | null
  actif: boolean
  zoneId: string | null
  zone: ZoneMin | null
  creeLe: string
  modifieLe: string
  totalRecolteKg: number
  coutTotal: number
  nombreEvenements: number
}

export type EvenementCulture = {
  id: string
  type: TypeEvenementCulture
  dateEvenement: string
  description: string | null
  coutTotal: string | null
  devise: string
  quantiteKg: number | null
  notes: string | null
  creeLe: string
  parcelleId: string
  auteurId: string
  auteur: AuteurMin | null
}

export type ParcelleDetail = ParcelleResume & {
  evenements: EvenementCulture[]
}

export type EntreeCreationParcelle = {
  nom: string
  typeCulture: TypeCulture
  surfaceHa: number
  dateSemis?: string | null
  dateRecoltePrev?: string | null
  rendementPrevuKg?: number | null
  rendementReelKg?: number | null
  statut?: StatutParcelle
  zoneId?: string | null
  notes?: string | null
}

export type EntreeEvenement = {
  type: TypeEvenementCulture
  dateEvenement?: string
  description?: string | null
  coutTotal?: number | null
  quantiteKg?: number | null
  notes?: string | null
}
