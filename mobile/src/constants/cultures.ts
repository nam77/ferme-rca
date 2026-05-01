import type {
  StatutParcelle,
  TypeCulture,
  TypeEvenementCulture,
} from '../types/culture.types'

export const ICONES_CULTURE: Record<TypeCulture, string> = {
  mais: '🌽',
  manioc: '🍠',
  arachide: '🥜',
  legumes: '🍅',
  brachiaria: '🌿',
  bananier: '🍌',
  jachere: '🟫',
}

export const LIBELLES_CULTURE: Record<TypeCulture, string> = {
  mais: 'Maïs',
  manioc: 'Manioc',
  arachide: 'Arachide',
  legumes: 'Légumes',
  brachiaria: 'Brachiaria',
  bananier: 'Bananiers',
  jachere: 'Jachère',
}

export const TYPES_CULTURE_ORDRE: TypeCulture[] = [
  'mais',
  'manioc',
  'arachide',
  'legumes',
  'brachiaria',
  'bananier',
  'jachere',
]

export const COULEURS_STATUT_PARCELLE: Record<StatutParcelle, string> = {
  preparation: '#7b6e3e',
  semis: '#e8943a',
  croissance: '#4a8c3f',
  recolte: '#1a6b8a',
  jachere: '#9e9e9e',
  abandonnee: '#e74c3c',
}

export const LIBELLES_STATUT_PARCELLE: Record<StatutParcelle, string> = {
  preparation: 'Préparation',
  semis: 'Semis',
  croissance: 'Croissance',
  recolte: 'Récolte',
  jachere: 'Jachère',
  abandonnee: 'Abandonnée',
}

export const ICONES_EVENEMENT_CULTURE: Record<TypeEvenementCulture, string> = {
  preparation_sol: '🚜',
  semis: '🌱',
  fertilisation: '💩',
  irrigation: '💧',
  traitement: '🧪',
  desherbage: '✂️',
  recolte: '🌾',
  observation: '👁️',
}

export const LIBELLES_EVENEMENT_CULTURE: Record<TypeEvenementCulture, string> = {
  preparation_sol: 'Préparation du sol',
  semis: 'Semis / plantation',
  fertilisation: 'Fertilisation',
  irrigation: 'Irrigation',
  traitement: 'Traitement phyto',
  desherbage: 'Désherbage',
  recolte: 'Récolte',
  observation: 'Observation',
}

export const TYPES_EVENEMENT_ORDRE: TypeEvenementCulture[] = [
  'preparation_sol',
  'semis',
  'fertilisation',
  'irrigation',
  'desherbage',
  'traitement',
  'recolte',
  'observation',
]
