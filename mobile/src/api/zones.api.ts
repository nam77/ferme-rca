import { client } from './client'
import type { ReponseApi } from '../types/auth.types'
import type { ZoneDetail, ZoneListe } from '../types/zone.types'

export const listerZones = async (): Promise<ZoneListe[]> => {
  const { data } = await client.get<ReponseApi<ZoneListe[]>>('/api/zones')
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Zones indisponibles')
  }
  return data.donnees
}

export const recupererZone = async (id: string): Promise<ZoneDetail> => {
  const { data } = await client.get<ReponseApi<ZoneDetail>>(`/api/zones/${id}`)
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Zone introuvable')
  }
  return data.donnees
}
