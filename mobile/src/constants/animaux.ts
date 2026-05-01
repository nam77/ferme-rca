import type { Filiere } from './couleurs'
import type {
  CategorieAge,
  Espece,
  SexeAnimal,
  TypeMouvementAnimal,
} from '../types/lot.types'

export const ICONES_ESPECES: Record<Espece, string> = {
  poulet: '🐓',
  porc: '🐷',
  caprin: '🐐',
  ovin: '🐑',
  tilapia: '🐟',
  clarias: '🐠',
}

export const LIBELLES_ESPECES: Record<Espece, string> = {
  poulet: 'Poulets',
  porc: 'Porcs',
  caprin: 'Caprins',
  ovin: 'Ovins',
  tilapia: 'Tilapia',
  clarias: 'Clarias',
}

export const FILIERE_PAR_ESPECE: Record<Espece, Filiere> = {
  poulet: 'aviculture',
  porc: 'porcins',
  caprin: 'caprins',
  ovin: 'caprins',
  tilapia: 'pisciculture',
  clarias: 'pisciculture',
}

export const ESPECES_ORDRE: Espece[] = [
  'poulet',
  'porc',
  'caprin',
  'ovin',
  'tilapia',
  'clarias',
]

export const LIBELLES_SEXE: Record<SexeAnimal, string> = {
  male: 'Mâle',
  femelle: 'Femelle',
  mixte: 'Mixte',
}

export const ICONES_SEXE: Record<SexeAnimal, string> = {
  male: '♂',
  femelle: '♀',
  mixte: '⚥',
}

export const LIBELLES_CATEGORIE_AGE: Record<CategorieAge, string> = {
  jeune: 'Jeune',
  croissance: 'Croissance',
  adulte: 'Adulte',
  reforme: 'Réforme',
}

export const LIBELLES_TYPE_MOUVEMENT: Record<TypeMouvementAnimal, string> = {
  achat: 'Achat',
  naissance: 'Naissance',
  vente: 'Vente',
  mortalite: 'Mortalité',
  consommation_interne: 'Consommation interne',
  reforme: 'Réforme',
  transfert_entree: 'Transfert (entrée)',
  transfert_sortie: 'Transfert (sortie)',
}

export const ICONES_TYPE_MOUVEMENT: Record<TypeMouvementAnimal, string> = {
  achat: '🛒',
  naissance: '🐣',
  vente: '💰',
  mortalite: '⚰️',
  consommation_interne: '🍴',
  reforme: '🔚',
  transfert_entree: '↘️',
  transfert_sortie: '↗️',
}

export const TYPES_ENTREE: TypeMouvementAnimal[] = [
  'achat',
  'naissance',
  'transfert_entree',
]

export const TYPES_SORTIE: TypeMouvementAnimal[] = [
  'vente',
  'mortalite',
  'consommation_interne',
  'reforme',
  'transfert_sortie',
]

export const estEntree = (type: TypeMouvementAnimal): boolean =>
  TYPES_ENTREE.includes(type)
