import { IframePage } from '../components/IframePage'

// La vue interne du HTML reste 'kanban' (tableau 3 colonnes : à faire,
// en cours, terminé). Seul le nom de l'écran change : Activité.
export const EcranActivite = () => (
  <IframePage vue="kanban" titreFallback="Activité — Tâches & opérations" />
)
