import { client } from './client'
import type { ReponseApi, ReponseConnexion, Utilisateur } from '../types/auth.types'

export const seConnecter = async (email: string, motDePasse: string): Promise<ReponseConnexion> => {
  const { data } = await client.post<ReponseApi<ReponseConnexion>>('/api/auth/connexion', {
    email,
    motDePasse,
  })
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Échec de la connexion')
  }
  return data.donnees
}

export const recupererProfil = async (): Promise<Utilisateur> => {
  const { data } = await client.get<ReponseApi<Utilisateur>>('/api/auth/moi')
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Profil indisponible')
  }
  return data.donnees
}
