import type { Statut, Tache } from '../../types/tache.types'

export type ProprietesZoneKanban = {
  taches: Tache[]
  onTachePress: (tache: Tache) => void
  onDeplacer: (idTache: string, nouveauStatut: Statut) => void
  onSupprimerTache?: (idTache: string) => void
}

export const STATUTS_ORDRE: Statut[] = ['a_faire', 'en_cours', 'termine']

export const ICONES_STATUT: Record<Statut, string> = {
  a_faire: '📋',
  en_cours: '⚙️',
  termine: '✅',
}
