// Wrapper iframe sur le HTML AGROPILOT (mobile/public/agropilot-app.html)
// pour afficher chaque vue (kanban, activites, dashboard, budget, ferme)
// pixel-perfect. Sur native : message de repli.

import React from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES } from '../constants/theme'

type Props = {
  vue: 'kanban' | 'activites' | 'dashboard' | 'budget' | 'ferme'
  titreFallback: string
}

export const IframePage = ({ vue, titreFallback }: Props) => {
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.conteneur} edges={['left', 'right']}>
        <View style={styles.iframeWrap}>
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

  return (
    <SafeAreaView style={styles.conteneur} edges={['left', 'right']}>
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitre}>{titreFallback}</Text>
        <Text style={styles.fallbackTexte}>
          Cette vue est disponible sur la version web. Une version native
          dédiée arrive plus tard.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS_TOKEN.cream },
  iframeWrap: { flex: 1, backgroundColor: COULEURS_TOKEN.cream },
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
