import { useCallback, useEffect, useState } from 'react'
import { mettreAJourLigne, recupererBudget } from '../api/budget.api'
import type {
  BudgetGroupe,
  EntreeMiseAJourBudget,
  LigneBudget,
  Phase,
} from '../types/budget.types'

const PHASES: Phase[] = ['phase_1_infrastructure', 'phase_2_lancement', 'phase_3_exploitation']

const recalculerTotaux = (groupes: Record<Phase, LigneBudget[]>): BudgetGroupe => {
  const totalParPhase: Record<Phase, { prevu: number; reel: number }> = {
    phase_1_infrastructure: { prevu: 0, reel: 0 },
    phase_2_lancement: { prevu: 0, reel: 0 },
    phase_3_exploitation: { prevu: 0, reel: 0 },
  }
  let totalPrevu = 0
  let totalReel = 0
  for (const p of PHASES) {
    for (const l of groupes[p]) {
      totalParPhase[p].prevu += l.montantPrevu
      totalParPhase[p].reel += l.montantReel
    }
    totalPrevu += totalParPhase[p].prevu
    totalReel += totalParPhase[p].reel
  }
  return { groupes, totalParPhase, totalPrevu, totalReel }
}

export const useBudget = () => {
  const [budget, setBudget] = useState<BudgetGroupe | null>(null)
  const [enChargement, setEnChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    setEnChargement(true)
    setErreur(null)
    try {
      const r = await recupererBudget()
      setBudget(r)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setEnChargement(false)
    }
  }, [])

  useEffect(() => {
    recharger()
  }, [recharger])

  const mettreAJour = useCallback(async (id: string, entree: EntreeMiseAJourBudget) => {
    const ligne = await mettreAJourLigne(id, entree)
    setBudget((b) => {
      if (!b) return b
      const groupes = { ...b.groupes }
      for (const p of PHASES) {
        const idx = groupes[p].findIndex((l) => l.id === id)
        if (idx !== -1) {
          const copie = [...groupes[p]]
          copie[idx] = ligne
          groupes[p] = copie
          break
        }
      }
      return recalculerTotaux(groupes)
    })
    return ligne
  }, [])

  return { budget, enChargement, erreur, recharger, mettreAJour }
}
