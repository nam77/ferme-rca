// Wrapper iframe / WebView sur le HTML AGROPILOT (mobile/public/agropilot-app.html)
// pour afficher chaque vue (kanban, activites, dashboard, budget, ferme)
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
import { COULEURS_TOKEN, ESPACEMENTS, POLICES } from '../constants/theme'

type Props = {
  vue: 'kanban' | 'activites' | 'dashboard' | 'budget' | 'ferme'
  titreFallback: string
}

const URL_HTML_NATIF = (() => {
  const fromEnv = process.env.EXPO_PUBLIC_HTML_URL
  if (fromEnv) return fromEnv
  const host =
    (Constants.expoConfig?.hostUri ?? '').split(':')[0] || 'localhost'
  return `http://${host}:8081/agropilot-app.html`
})()

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

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.conteneur} edges={['left', 'right']}>
        <View style={styles.wrap}>
          {React.createElement('iframe', {
            src: `/agropilot-app.html?${queryString}`,
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

  const url = `${URL_HTML_NATIF}?${queryString}`
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
                Impossible de charger l'application web embarquée.
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
