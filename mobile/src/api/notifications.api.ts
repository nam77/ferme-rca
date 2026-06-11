import { client } from './client'
import type { ReponseApi } from '../types/auth.types'

export type PlateformePush = 'ios' | 'android' | 'web'

// Jeton push de l'appareil mémorisé localement : permet de le désenregistrer
// à la déconnexion (tant que le JWT est encore valide).
export const CLE_JETON_PUSH = 'ferme_rca_jeton_push'

/** Enregistre le jeton push Expo de l'appareil auprès du backend. */
export const enregistrerJetonPush = async (
  jeton: string,
  plateforme: PlateformePush,
): Promise<void> => {
  const { data } = await client.post<ReponseApi<never>>('/api/notifications/jeton', {
    jeton,
    plateforme,
  })
  if (!data.succes) {
    throw new Error(data.message ?? "Échec de l'enregistrement du jeton push")
  }
}

/** Désenregistre le jeton push (à la déconnexion). Best-effort. */
export const supprimerJetonPush = async (jeton: string): Promise<void> => {
  await client.delete<ReponseApi<never>>('/api/notifications/jeton', {
    data: { jeton },
  })
}
