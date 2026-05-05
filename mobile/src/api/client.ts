import axios, { type InternalAxiosRequestConfig } from 'axios'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const CLE_JETON = 'ferme_rca_jeton'

const URL_PAR_DEFAUT_DEV =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001'

/**
 * Détermine l'URL de l'API selon le contexte d'exécution.
 *
 * Ordre de priorité :
 *   1. `EXPO_PUBLIC_API_URL` injectée au build (cas production).
 *   2. Fallback `localhost` / `10.0.2.2` UNIQUEMENT pour le dev local
 *      (web sur localhost, iOS simulateur, ou Android emulator).
 *   3. En web sur un vrai domaine sans variable injectée : on émet une
 *      erreur console explicite. On retourne quand même le fallback dev
 *      pour que l'app ne crashe pas au boot, mais aucun appel ne pourra
 *      aboutir → le diagnostic est clair côté DevTools.
 *
 * Cause du bug initial (mai 2026) : sans cette détection, le frontend
 * web déployé sur agri-pilot.com tombait silencieusement sur
 * `http://localhost:3001` côté visiteur, donnant un Network Error
 * difficile à expliquer.
 */
function determinerUrlApi(): string {
  const urlEnv = process.env.EXPO_PUBLIC_API_URL
  if (urlEnv && urlEnv.trim().length > 0) {
    return urlEnv.trim()
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hote = window.location.hostname
    const enLocalhost = hote === 'localhost' || hote === '127.0.0.1'
    if (!enLocalhost) {
      console.error(
        '[client.ts] EXPO_PUBLIC_API_URL non définie au build web. ' +
          `Le frontend (origine ${window.location.origin}) ne pourra pas joindre le backend. ` +
          "Définir la variable AVANT 'npx expo export --platform web' " +
          '(ex : EXPO_PUBLIC_API_URL=https://api.agri-pilot.com).',
      )
    }
  }

  return URL_PAR_DEFAUT_DEV
}

export const URL_API = determinerUrlApi()

export const client = axios.create({
  baseURL: URL_API,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const jeton = await AsyncStorage.getItem(CLE_JETON)
  if (jeton) {
    config.headers.set('Authorization', `Bearer ${jeton}`)
  }
  return config
})
