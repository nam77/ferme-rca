import { client } from './client'
import type { ReponseApi } from '../types/auth.types'
import type {
  EntreeCreationLot,
  EntreeMouvement,
  Espece,
  LotDetail,
  LotResume,
  MouvementAnimal,
} from '../types/lot.types'

export const listerLots = async (filtres: { espece?: Espece } = {}): Promise<LotResume[]> => {
  const { data } = await client.get<ReponseApi<LotResume[]>>('/api/lots', { params: filtres })
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Impossible de charger les lots')
  }
  return data.donnees
}

export const obtenirLot = async (id: string): Promise<LotDetail> => {
  const { data } = await client.get<ReponseApi<LotDetail>>(`/api/lots/${id}`)
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Lot introuvable')
  }
  return data.donnees
}

export const creerLot = async (entree: EntreeCreationLot): Promise<LotResume> => {
  const { data } = await client.post<ReponseApi<LotResume>>('/api/lots', entree)
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Création impossible')
  }
  return data.donnees
}

export const ajouterMouvement = async (
  lotId: string,
  entree: EntreeMouvement,
): Promise<{ mouvement: MouvementAnimal; effectif: number }> => {
  const { data } = await client.post<
    ReponseApi<{ mouvement: MouvementAnimal; effectif: number }>
  >(`/api/lots/${lotId}/mouvements`, entree)
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Mouvement impossible')
  }
  return data.donnees
}
