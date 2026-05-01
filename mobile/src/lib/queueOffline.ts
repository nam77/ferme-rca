import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Statut } from '../types/tache.types'

const CLE = 'kanban_queue_actions'

export type ActionOffline = {
  id: string
  type: 'changer_statut'
  tacheId: string
  ancienStatut: Statut
  nouveauStatut: Statut
  timestamp: number
}

const lireBrut = async (): Promise<ActionOffline[]> => {
  const raw = await AsyncStorage.getItem(CLE)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const ecrire = async (queue: ActionOffline[]): Promise<void> => {
  await AsyncStorage.setItem(CLE, JSON.stringify(queue))
}

const genererId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const enfilerAction = async (
  entree: Omit<ActionOffline, 'id' | 'timestamp' | 'type'>,
): Promise<ActionOffline> => {
  const queue = await lireBrut()
  const action: ActionOffline = {
    id: genererId(),
    type: 'changer_statut',
    ...entree,
    timestamp: Date.now(),
  }
  queue.push(action)
  await ecrire(queue)
  return action
}

export const lireQueue = async (): Promise<ActionOffline[]> => lireBrut()

export const supprimerAction = async (id: string): Promise<void> => {
  const queue = await lireBrut()
  await ecrire(queue.filter((a) => a.id !== id))
}

export const viderQueue = async (): Promise<void> => {
  await AsyncStorage.removeItem(CLE)
}

export const tailleQueue = async (): Promise<number> => {
  const q = await lireBrut()
  return q.length
}
