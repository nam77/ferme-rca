import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'

/**
 * Comportement d'affichage quand une notification arrive alors que l'app est
 * au premier plan : on montre quand même la bannière + son (sinon l'utilisateur
 * sur un autre écran ne verrait rien).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/** Canal Android « messages » : son + vibration + voyant (gyrophare système). */
export const configurerCanalAndroid = async (): Promise<void> => {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messagerie d’équipe',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 300, 150, 300, 150, 600],
    lightColor: '#D62828',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  })
}

/** Récupère le projectId EAS nécessaire à l'émission d'un jeton push Expo. */
const lireProjectId = (): string | undefined => {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  )
}

/**
 * Demande la permission et renvoie le jeton push Expo de l'appareil
 * (ExpoPushToken[...]), ou null si indisponible (web, émulateur sans services,
 * permission refusée, projectId manquant). Best-effort, ne lève jamais.
 */
export const obtenirJetonPush = async (): Promise<string | null> => {
  try {
    // Le web et les émulateurs sans Google/Apple ne délivrent pas de jeton.
    if (Platform.OS === 'web' || !Device.isDevice) return null

    await configurerCanalAndroid()

    const { status: statutExistant } = await Notifications.getPermissionsAsync()
    let statut = statutExistant
    if (statut !== 'granted') {
      const demande = await Notifications.requestPermissionsAsync()
      statut = demande.status
    }
    if (statut !== 'granted') {
      console.warn('[push] permission notifications refusée')
      return null
    }

    const projectId = lireProjectId()
    if (!projectId) {
      console.warn(
        '[push] projectId EAS introuvable : exécuter `eas init` puis renseigner ' +
          'expo.extra.eas.projectId dans app.json pour activer les jetons push.',
      )
      return null
    }

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId })
    return data
  } catch (erreur) {
    console.warn('[push] obtention du jeton impossible:', erreur)
    return null
  }
}
