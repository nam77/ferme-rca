import { client } from './client'
import type { ReponseApi } from '../types/auth.types'
import type { BudgetGroupe, EntreeMiseAJourBudget, LigneBudget } from '../types/budget.types'

export const recupererBudget = async (): Promise<BudgetGroupe> => {
  const { data } = await client.get<ReponseApi<BudgetGroupe>>('/api/budget')
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Budget indisponible')
  }
  return data.donnees
}

export const mettreAJourLigne = async (id: string, entree: EntreeMiseAJourBudget): Promise<LigneBudget> => {
  const { data } = await client.patch<ReponseApi<LigneBudget>>(`/api/budget/${id}`, entree)
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Mise à jour impossible')
  }
  return data.donnees
}