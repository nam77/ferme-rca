import { IframePage } from '../components/IframePage'

// La vue interne du HTML reste 'kanban' (tableau 3 colonnes : à faire,
// en cours, terminé). Seul le nom de l'écran change : Tâches & opérations.
export const EcranActivite = () => (
  <IframePage vue="kanban" titreFallback="Tâches & opérations — Qui fait quoi, quand, comment" />
)
