export type Espece = 'poulet' | 'porc' | 'caprin' | 'ovin' | 'tilapia' | 'clarias'
export type SexeAnimal = 'male' | 'femelle' | 'mixte'
export type CategorieAge = 'jeune' | 'croissance' | 'adulte' | 'reforme'
export type TypeMouvementAnimal =
  | 'achat'
  | 'naissance'
  | 'vente'
  | 'mortalite'
  | 'consommation_interne'
  | 'reforme'
  | 'transfert_entree'
  | 'transfert_sortie'

export type ZoneMin = { id: string; nom: string }

export type AuteurMin = { id: string; prenom: string; nom: string }

export type LotResume = {
  id: string
  nom: string
  espece: Espece
  sexe: SexeAnimal | null
  categorieAge: CategorieAge
  dateNaissance: string | null
  notes: string | null
  actif: boolean
  zoneId: string | null
  zone: ZoneMin | null
  creeLe: string
  modifieLe: string
  effectif: number
  nombreMouvements: number
}

export type MouvementAnimal = {
  id: string
  type: TypeMouvementAnimal
  quantite: number
  dateMouvement: string
  coutTotal: string | null
  devise: string
  motif: string | null
  notes: string | null
  creeLe: string
  lotId: string
  auteurId: string
  auteur: AuteurMin | null
  mouvementLieId: string | null
}

export type LotDetail = LotResume & {
  mouvements: MouvementAnimal[]
}

export type EntreeCreationLot = {
  nom: string
  espece: Espece
  sexe?: SexeAnimal | null
  categorieAge?: CategorieAge
  zoneId?: string | null
  dateNaissance?: string | null
  notes?: string | null
}

export type EntreeMouvement = {
  type: TypeMouvementAnimal
  quantite: number
  dateMouvement?: string
  coutTotal?: number | null
  motif?: string | null
  notes?: string | null
}
