import { client } from './client'
import type { ReponseApi } from '../types/auth.types'
import type {
  EntreeCreationParcelle,
  EntreeEvenement,
  EvenementCulture,
  ParcelleDetail,
  ParcelleResume,
  TypeCulture,
} from '../types/culture.types'

export const listerParcelles = async (
  filtres: { typeCulture?: TypeCulture } = {},
): Promise<ParcelleResume[]> => {
  const { data } = await client.get<ReponseApi<ParcelleResume[]>>('/api/parcelles', {
    params: filtres,
  })
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Impossible de charger les parcelles')
  }
  return data.donnees
}

export const obtenirParcelle = async (id: string): Promise<ParcelleDetail> => {
  const { data } = await client.get<ReponseApi<ParcelleDetail>>(`/api/parcelles/${id}`)
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Parcelle introuvable')
  }
  return data.donnees
}

export const creerParcelle = async (
  entree: EntreeCreationParcelle,
): Promise<ParcelleResume> => {
  const { data } = await client.post<ReponseApi<ParcelleResume>>('/api/parcelles', entree)
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Création impossible')
  }
  return data.donnees
}

export const ajouterEvenement = async (
  parcelleId: string,
  entree: EntreeEvenement,
): Promise<EvenementCulture> => {
  const { data } = await client.post<ReponseApi<EvenementCulture>>(
    `/api/parcelles/${parcelleId}/evenements`,
    entree,
  )
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Événement impossible')
  }
  return data.donnees
}
