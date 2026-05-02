// EcranFerme : reproduction iso de la page Ferme via iframe sur le HTML
// de référence (mobile/public/ferme-app.html). Sur native, message de
// repli (le HTML est riche en SVG animés peu adaptés à RN sans WebView).

import { View, Text, StyleSheet, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../constants/theme'

export const EcranFerme = () => {
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.conteneur} edges={['left', 'right']}>
        {/*
          On utilise un élément DOM natif <iframe> via createElement-like
          syntax de React Native Web.
        */}
        <View style={styles.iframeWrap}>
          {React.createElement('iframe', {
            src: '/ferme-app.html',
            style: {
              width: '100%',
              height: '100%',
              border: 0,
              display: 'block',
            },
            title: 'Plan de la ferme',
          })}
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.conteneur} edges={['left', 'right']}>
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitre}>Plan de la ferme</Text>
        <Text style={styles.fallbackTexte}>
          La vue détaillée du plan de la ferme (illustration + plan technique
          + cycle d'économie circulaire) est disponible sur la version web.
        </Text>
      </View>
    </SafeAreaView>
  )
}

import React from 'react'

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS_TOKEN.cream },
  iframeWrap: {
    flex: 1,
    backgroundColor: COULEURS_TOKEN.cream,
  },
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
    marginBottom: ESPACEMENTS.l,
  },
  fallbackPastille: {
    paddingHorizontal: ESPACEMENTS.m,
    paddingVertical: ESPACEMENTS.s,
    borderRadius: RAYONS.pastille,
    backgroundColor: 'rgba(74,140,63,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(74,140,63,0.30)',
  },
})
