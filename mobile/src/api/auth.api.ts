import { client } from './client'
import type { Filiere, ReponseApi, ReponseConnexion, Utilisateur } from '../types/auth.types'

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

export type DonneesInscription = {
  email: string
  motDePasse: string
  prenom: string
  nom: string
  filiere?: Filiere
}

export const sInscrire = async (donnees: DonneesInscription): Promise<ReponseConnexion> => {
  const { data } = await client.post<ReponseApi<ReponseConnexion>>('/api/auth/inscription', donnees)
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? "Échec de l'inscription")
  }
  return data.donnees
}

export const demanderReinitialisation = async (email: string): Promise<string> => {
  const { data } = await client.post<ReponseApi<never>>('/api/auth/mot-de-passe-oublie', {
    email,
  })
  if (!data.succes) {
    throw new Error(data.message ?? 'Échec de la demande')
  }
  return data.message ?? 'Demande envoyée.'
}

export const reinitialiserAvecToken = async (
  token: string,
  nouveauMotDePasse: string,
): Promise<string> => {
  const { data } = await client.post<ReponseApi<never>>('/api/auth/reinitialiser-mot-de-passe', {
    token,
    nouveauMotDePasse,
  })
  if (!data.succes) {
    throw new Error(data.message ?? 'Échec de la réinitialisation')
  }
  return data.message ?? 'Mot de passe réinitialisé.'
}

export const recupererProfil = async (): Promise<Utilisateur> => {
  const { data } = await client.get<ReponseApi<Utilisateur>>('/api/auth/moi')
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Profil indisponible')
  }
  return data.donnees
}
