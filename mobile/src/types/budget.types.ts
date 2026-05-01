export type Phase = 'phase_1_infrastructure' | 'phase_2_lancement' | 'phase_3_exploitation'

export type LigneBudget = {
  id: string
  phase: Phase
  categorie: string
  description: string | null
  montantPrevu: number
  montantReel: number
  devise: string
  creeLe: string
  modifieLe: string
}

export type BudgetGroupe = {
  groupes: Record<Phase, LigneBudget[]>
  totalParPhase: Record<Phase, { prevu: number; reel: number }>
  totalPrevu: number
  totalReel: number
}

export type EntreeMiseAJourBudget = {
  categorie?: string
  description?: string | null
  montantPrevu?: number
  montantReel?: number
  devise?: string
}
