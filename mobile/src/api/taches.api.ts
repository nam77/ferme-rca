import { client } from './client'
import type { ReponseApi } from '../types/auth.types'
import type { EntreeCreationTache, Statut, Tache } from '../types/tache.types'

type FiltresTaches = {
  filiere?: string
  statut?: Statut
  responsable?: string
}

export const listerTaches = async (filtres: FiltresTaches = {}): Promise<Tache[]> => {
  const { data } = await client.get<ReponseApi<Tache[]>>('/api/taches', { params: filtres })
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Impossible de charger les tâches')
  }
  return data.donnees
}

export const creerTache = async (entree: EntreeCreationTache): Promise<Tache> => {
  const { data } = await client.post<ReponseApi<Tache>>('/api/taches', entree)
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Création impossible')
  }
  return data.donnees
}

export const changerStatutTache = async (id: string, nouveauStatut: Statut): Promise<Tache> => {
  const { data } = await client.patch<ReponseApi<Tache>>(`/api/taches/${id}/statut`, { nouveauStatut })
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Changement de statut impossible')
  }
  return data.donnees
}

export const supprimerTache = async (id: string): Promise<void> => {
  const { data } = await client.delete<ReponseApi<unknown>>(`/api/taches/${id}`)
  if (!data.succes) {
    throw new Error(data.message ?? 'Suppression impossible')
  }
}

// ─── Sous-tâches ───
import type { SousTache } from '../types/tache.types'

export const ajouterSousTache = async (
  tacheId: string,
  titre: string,
): Promise<SousTache> => {
  const { data } = await client.post<ReponseApi<SousTache>>(
    `/api/taches/${tacheId}/sous-taches`,
    { titre },
  )
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Ajout sous-tâche impossible')
  }
  return data.donnees
}

export const basculerSousTache = async (
  tacheId: string,
  sousId: string,
  faite: boolean,
): Promise<SousTache> => {
  const { data } = await client.patch<ReponseApi<SousTache>>(
    `/api/taches/${tacheId}/sous-taches/${sousId}`,
    { faite },
  )
  if (!data.succes || !data.donnees) {
    throw new Error(data.message ?? 'Mise à jour impossible')
  }
  return data.donnees
}

export const supprimerSousTache = async (
  tacheId: string,
  sousId: string,
): Promise<void> => {
  const { data } = await client.delete<ReponseApi<unknown>>(
    `/api/taches/${tacheId}/sous-taches/${sousId}`,
  )
  if (!data.succes) {
    throw new Error(data.message ?? 'Suppression impossible')
  }
}
