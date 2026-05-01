import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useToastStore, type TypeToast } from '../store/toastStore'
import { COULEURS } from '../constants/couleurs'

const COULEURS_TYPE: Record<TypeToast, { fond: string; bordure: string; texte: string }> = {
  info: { fond: '#1a6b8a', bordure: '#13546d', texte: '#fff' },
  succes: { fond: COULEURS.vert, bordure: '#3b7034', texte: '#fff' },
  erreur: { fond: COULEURS.rouge, bordure: '#b53b30', texte: '#fff' },
  avertissement: { fond: COULEURS.orange, bordure: '#c77f0d', texte: '#fff' },
}

const ICONES_TYPE: Record<TypeToast, string> = {
  info: 'ℹ️',
  succes: '✓',
  erreur: '⚠',
  avertissement: '!',
}

export const Toaster = () => {
  const toasts = useToastStore((s) => s.toasts)
  const retirer = useToastStore((s) => s.retirer)
  const insets = useSafeAreaInsets()

  if (toasts.length === 0) return null

  return (
    <View
      pointerEvents="box-none"
      style={[styles.conteneur, { bottom: insets.bottom + 16 }]}
    >
      {toasts.map((t) => {
        const c = COULEURS_TYPE[t.type]
        return (
          <Pressable
            key={t.id}
            onPress={() => retirer(t.id)}
            accessibilityRole="alert"
            style={({ pressed }) => [
              styles.toast,
              { backgroundColor: c.fond, borderColor: c.bordure },
              pressed && styles.toastPresse,
            ]}
          >
            <Text style={[styles.icone, { color: c.texte }]}>{ICONES_TYPE[t.type]}</Text>
            <Text style={[styles.message, { color: c.texte }]} numberOfLines={3}>
              {t.message}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  conteneur: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  toastPresse: { opacity: 0.85 },
  icone: { fontSize: 18, fontWeight: '700' },
  message: { flex: 1, fontSize: 14, fontWeight: '500' },
})