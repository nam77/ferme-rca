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

export default function LayoutRoot() {
  const initialiser = useAuthStore((s) => s.initialiser)
  const pretInitial = useAuthStore((s) => s.pretInitial)
  const utilisateur = useAuthStore((s) => s.utilisateur)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    initialiser()
  }, [initialiser])

  useEffect(() => {
    if (!pretInitial) return
    const surConnexion = segments[0] === 'connexion'
    if (!utilisateur && !surConnexion) {
      router.replace('/connexion')
    } else if (utilisateur && surConnexion) {
      router.replace('/')
    }
  }, [pretInitial, utilisateur, segments, router])

  if (!pretInitial) {
    return (
      <View style={styles.chargement}>
        <ActivityIndicator size="large" color={COULEURS.vert} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <View style={styles.colonne}>
          <BandeauReseau />
          <View style={styles.flex}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="connexion" />
              <Stack.Screen name="kanban" />
              <Stack.Screen name="dashboard" />
              <Stack.Screen name="budget" />
              <Stack.Screen name="ferme" />
              <Stack.Screen name="cheptel/index" />
              <Stack.Screen name="cheptel/[id]" />
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