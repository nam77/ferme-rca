import { client } from './client'
import type { ReponseApi } from '../types/auth.types'
import type { Dashboard } from '../types/dashboard.types'

export const recupererDashboard = async (): Promise<Dashboard> => {
  const { data } = await client.get<ReponseApi<Dashboard>>('/api/dashboard')
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Tableau de bord indisponible')
  }
  return data.donnees
}