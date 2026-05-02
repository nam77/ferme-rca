// Wrapper iframe / WebView sur le HTML AGROPILOT (mobile/public/agropilot-app.html)
// pour afficher chaque vue (kanban, activites, dashboard, budget, ferme)
// pixel-perfect.
// - Web : <iframe src="/agropilot-app.html?view=...&embed=1"/>
// - iOS/Android : WebView pointant vers le HTML servi par Expo Web
//   (côté terrain RCA, l'app native consommera la même page web).

import React from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import Constants from 'expo-constants'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES } from '../constants/theme'

type Props = {
  vue: 'kanban' | 'activites' | 'dashboard' | 'budget' | 'ferme'
  titreFallback: string
}

// Sur native, on pointe vers le HTML servi par le bundler Expo Web.
// Pour la prod, EXPO_PUBLIC_HTML_URL peut être défini pour pointer vers
// le déploiement web final.
const URL_HTML_NATIF = (() => {
  const fromEnv = process.env.EXPO_PUBLIC_HTML_URL
  if (fromEnv) return fromEnv
  // Tente de déduire l'host depuis Expo (debugger host)
  const host =
    (Constants.expoConfig?.hostUri ?? '').split(':')[0] || 'localhost'
  return `http://${host}:8081/agropilot-app.html`
})()

export const IframePage = ({ vue, titreFallback }: Props) => {
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.conteneur} edges={['left', 'right']}>
        <View style={styles.wrap}>
          {React.createElement('iframe', {
            src: `/agropilot-app.html?view=${vue}&embed=1`,
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

  // Native (iOS / Android) : WebView vers le HTML hébergé.
  const url = `${URL_HTML_NATIF}?view=${vue}&embed=1`
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
