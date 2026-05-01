// Charte chromatique de la Ferme Agropastorale RCA.
// CONSTANTES IMMUABLES — toute modification requiert validation explicite.

export const COULEURS_FILIERES = {
  pisciculture: '#1a6b8a',
  aviculture: '#e8943a',
  porcins: '#d4548a',
  caprins: '#7b6e3e',
  cultures: '#4a8c3f',
  infrastructure: '#6b6b6b',
  habitat: '#5c3d1e',
} as const

export type Filiere = keyof typeof COULEURS_FILIERES

export const COULEURS_STATUTS = {
  a_faire: '#e74c3c',
  en_cours: '#f39c12',
  termine: '#27ae60',
} as const

export type Statut = keyof typeof COULEURS_STATUTS

export const COULEURS_PRIORITES = {
  haute: '#e74c3c',
  moyenne: '#f39c12',
  basse: '#27ae60',
} as const

export type Priorite = keyof typeof COULEURS_PRIORITES

export const ICONES_FILIERES: Record<Filiere, string> = {
  pisciculture: '🐟',
  aviculture: '🐓',
  porcins: '🐷',
  caprins: '🐐',
  cultures: '🌾',
  infrastructure: '🏗️',
  habitat: '🏠',
}

export const LIBELLES_FILIERES: Record<Filiere, string> = {
  pisciculture: 'Pisciculture',
  aviculture: 'Aviculture',
  porcins: 'Porcins',
  caprins: 'Caprins/Ovins',
  cultures: 'Cultures',
  infrastructure: 'Infrastructure',
  habitat: 'Habitat/Stock',
}

export const LIBELLES_STATUTS: Record<Statut, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  termine: 'Terminé',
}

export const COULEURS = {
  fond: '#faf6ee',
  texte: '#2d1f0e',
  texteSecondaire: '#5c3d1e',
  bordure: 'rgba(92,61,30,0.15)',
  ombre: 'rgba(45,31,14,0.1)',
  vert: '#4a8c3f',
  rouge: '#e74c3c',
  orange: '#f39c12',
  carte: '#ffffff',
  hors_ligne: '#f39c12',
} as const
