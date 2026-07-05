// Wrapper iframe / WebView sur le HTML AGROPILOT (mobile/public/agropilot-app.html)
// pour afficher chaque vue (kanban, cultures, cheptel, dashboard, budget, ferme)
// pixel-perfect.
// - Web : <iframe src="/agropilot-app.html?view=...&embed=1"/>
// - iOS/Android : WebView pointant vers le HTML servi par Expo Web
//
// Le jeton JWT et l'utilisateur du store auth RN sont passés en query
// params pour que l'iframe utilise la même session.

import React, { useMemo } from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import Constants from 'expo-constants'
import { useAuthStore } from '../store/authStore'
import { URL_API } from '../api/client'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES } from '../constants/theme'

type Props = {
  vue:
    | 'kanban' | 'cultures' | 'cheptel'
    | 'dashboard' | 'budget' | 'ferme' | 'cra' | 'deploiement'
    | 'utilisateurs'
    | 'messagerie'
    | 'projet'
  titreFallback: string
}

// Base host servi par Expo Web en dev (ou EXPO_PUBLIC_HTML_URL en prod).
// EXPO_PUBLIC_HTML_URL peut pointer vers un fichier précis (agropilot-app.html)
// ou vers la racine ; on extrait la racine pour pouvoir servir d'autres pages
// statiques comme /projet.html.
const ORIGINE_HTML = (() => {
  const fromEnv = process.env.EXPO_PUBLIC_HTML_URL
  if (fromEnv) {
    // Si l'env pointe vers un fichier .html, on retire le nom du fichier
    return fromEnv.replace(/\/[^/]+\.html?$/, '')
  }
  const host =
    (Constants.expoConfig?.hostUri ?? '').split(':')[0] || 'localhost'
  return `http://${host}:8081`
})()

// Nom physique du fichier statique pour chaque vue.
// Important : éviter de nommer un fichier comme une route Expo (ex. 'projet.html'
// vs route /projet) — Cloudflare Pages réécrit /projet.html → /projet et déclenche
// alors la route Expo qui ré-iframe /projet.html → boucle infinie.
const fichierPourVue = (vue: Props['vue']): string =>
  vue === 'projet' ? 'yimbassa.html' : 'agropilot-app.html'

// Encode en base64 URL-safe (ASCII uniquement)
const b64Url = (s: string): string => {
  try {
    const b = typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(s)))
      : Buffer.from(s, 'utf-8').toString('base64')
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch {
    return ''
  }
}

export const IframePage = ({ vue, titreFallback }: Props) => {
  const jeton = useAuthStore((s) => s.jeton)
  const utilisateur = useAuthStore((s) => s.utilisateur)

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ view: vue, embed: '1' })
    // Transmet l'URL réelle de l'API (résolue par client.ts depuis
    // EXPO_PUBLIC_API_URL en prod, fallback localhost:3001 en dev)
    // pour que le HTML embarqué ne devine plus via window.location.
    if (URL_API) params.set('api', URL_API)
    if (jeton) params.set('jeton', jeton)
    if (utilisateur) {
      params.set(
        'user',
        b64Url(
          JSON.stringify({
            id: utilisateur.id,
            name: `${utilisateur.prenom} ${utilisateur.nom}`,
            email: utilisateur.email,
            role: utilisateur.role,
            filiere: utilisateur.filiere,
          }),
        ),
      )
    }
    return params.toString()
  }, [vue, jeton, utilisateur])

  const fichier = fichierPourVue(vue)

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.conteneur} edges={['left', 'right']}>
        <View style={styles.wrap}>
          {React.createElement('iframe', {
            src: `/${fichier}?${queryString}`,
            style: {
              width: '100%',
              height: '100%',
              border: 0,
              display: 'block',
            },
            title: titreFallback,
          })}
        </View>
      </SafeAreaView>
    )
  }

  const url = `${ORIGINE_HTML}/${fichier}?${queryString}`
  return (
    <SafeAreaView style={styles.conteneur} edges={['left', 'right']}>
      <View style={styles.wrap}>
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          mixedContentMode="always"
          allowsInlineMediaPlayback
          renderError={(e) => (
            <View style={styles.fallback}>
              <Text style={styles.fallbackTitre}>{titreFallback}</Text>
              <Text style={styles.fallbackTexte}>
                Impossible de charger l&apos;application web embarquée.
                {'\n'}({e})
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS_TOKEN.cream },
  wrap: { flex: 1, backgroundColor: COULEURS_TOKEN.cream },
  webview: { flex: 1, backgroundColor: COULEURS_TOKEN.cream },
  fallback: {
    flex: 1,
    padding: ESPACEMENTS.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackTitre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 24,
    color: COULEURS_TOKEN.soil,
    marginBottom: ESPACEMENTS.s,
  },
  fallbackTexte: {
    fontFamily: POLICES.sans,
    fontSize: 14,
    color: COULEURS_TOKEN.earth,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 20,
  },
})
