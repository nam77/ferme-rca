import { useEffect } from 'react'
import { Platform } from 'react-native'
import { useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '@src/store/authStore'
import { obtenirJetonPush } from '@src/notifications/push'
import {
  CLE_JETON_PUSH,
  enregistrerJetonPush,
  type PlateformePush,
} from '@src/api/notifications.api'

const plateformeCourante = (): PlateformePush =>
  Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web'

/**
 * Enregistre l'appareil pour les notifications push quand un utilisateur est
 * connecté, et ouvre la messagerie quand on tape une notification de message.
 * Le désenregistrement à la déconnexion est géré dans authStore (le JWT doit
 * encore être présent pour appeler l'API).
 */
export const usePush = (): void => {
  const utilisateur = useAuthStore((s) => s.utilisateur)
  const router = useRouter()

  // Enregistrement à la connexion.
  useEffect(() => {
    if (!utilisateur) return
    let annule = false
    obtenirJetonPush().then(async (jeton) => {
      if (annule || !jeton) return
      try {
        await enregistrerJetonPush(jeton, plateformeCourante())
        await AsyncStorage.setItem(CLE_JETON_PUSH, jeton)
      } catch (e) {
        console.warn('[push] enregistrement échoué:', e instanceof Error ? e.message : e)
      }
    })
    return () => {
      annule = true
    }
  }, [utilisateur])

  // Tap sur une notification de message → ouvrir la messagerie.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((reponse) => {
      const data = reponse.notification.request.content.data as { type?: string } | undefined
      if (data?.type === 'message') router.push('/messagerie' as never)
    })
    return () => sub.remove()
  }, [router])
}
