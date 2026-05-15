import { useEffect } from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'
import { useAuthStore } from '@src/store/authStore'
import { COULEURS } from '@src/constants/couleurs'
import { Toaster } from '@src/components/Toaster'
import { BandeauReseau } from '@src/components/BandeauReseau'
import { BarreNavigation } from '@src/components/ui'
import { usePolices } from '@src/hooks/usePolices'

export default function LayoutRoot() {
  const initialiser = useAuthStore((s) => s.initialiser)
  const pretInitial = useAuthStore((s) => s.pretInitial)
  const utilisateur = useAuthStore((s) => s.utilisateur)
  const router = useRouter()
  const segments = useSegments()
  const policesPretes = usePolices()

  useEffect(() => {
    initialiser()
  }, [initialiser])

  useEffect(() => {
    if (!pretInitial) return
    const segmentAuth = segments[0]
    const surEcranAuth =
      segmentAuth === 'connexion' ||
      segmentAuth === 'inscription' ||
      segmentAuth === 'mot-de-passe-oublie'
    if (utilisateur && surEcranAuth) {
      router.replace('/')
    }
  }, [pretInitial, utilisateur, segments, router])

  if (!pretInitial || !policesPretes) {
    return (
      <View style={styles.chargement}>
        <ActivityIndicator size="large" color={COULEURS.vert} />
      </View>
    )
  }

  const ECRANS_AUTH = ['connexion', 'inscription', 'mot-de-passe-oublie']
  const surEcranAuth = ECRANS_AUTH.includes(segments[0] ?? '')
  const afficherNav = !surEcranAuth

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <View style={styles.colonne}>
          <BandeauReseau />
          {afficherNav ? <BarreNavigation /> : null}
          <View style={styles.flex}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="connexion" />
              <Stack.Screen name="inscription" />
              <Stack.Screen name="mot-de-passe-oublie" />
              <Stack.Screen name="activite" />
              <Stack.Screen name="cultures" />
              <Stack.Screen name="dashboard" />
              <Stack.Screen name="budget" />
              <Stack.Screen name="ferme" />
              <Stack.Screen name="projet" />
              <Stack.Screen name="cheptel" />
              <Stack.Screen name="cra" />
              <Stack.Screen name="deploiement" />
            </Stack>
          </View>
        </View>
        <Toaster />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  chargement: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COULEURS.fond,
  },
  colonne: { flex: 1 },
  flex: { flex: 1 },
})