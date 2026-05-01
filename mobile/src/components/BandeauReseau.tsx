import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useReseau } from '../hooks/useReseau'
import { tailleQueue } from '../lib/queueOffline'
import { COULEURS } from '../constants/couleurs'

type Props = { enSynchronisation?: boolean }

export const BandeauReseau = ({ enSynchronisation = false }: Props) => {
  const { enLigne } = useReseau()
  const [enAttente, setEnAttente] = useState<number>(0)

  useEffect(() => {
    let annule = false
    const lire = async () => {
      const t = await tailleQueue()
      if (!annule) setEnAttente(t)
    }
    lire()
    const interval = setInterval(lire, 2000)
    return () => {
      annule = true
      clearInterval(interval)
    }
  }, [])

  if (enLigne && enAttente === 0 && !enSynchronisation) return null

  if (enSynchronisation) {
    return (
      <View style={[styles.bandeau, styles.bandeauSync]}>
        <ActivityIndicator size="small" color="#fff" />
        <Text style={styles.texte}>Synchronisation des actions en cours…</Text>
      </View>
    )
  }

  if (!enLigne) {
    return (
      <View style={[styles.bandeau, styles.bandeauHorsLigne]}>
        <Text style={styles.icone}>📡</Text>
        <Text style={styles.texte}>
          Hors ligne
          {enAttente > 0 ? ` · ${enAttente} action${enAttente > 1 ? 's' : ''} en attente` : ''}
        </Text>
      </View>
    )
  }

  // En ligne mais avec encore des actions en attente (cas rare)
  return (
    <View style={[styles.bandeau, styles.bandeauAttente]}>
      <Text style={styles.icone}>⏳</Text>
      <Text style={styles.texte}>
        {enAttente} action{enAttente > 1 ? 's' : ''} en attente de synchronisation
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  bandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  bandeauHorsLigne: { backgroundColor: COULEURS.orange },
  bandeauSync: { backgroundColor: '#1a6b8a' },
  bandeauAttente: { backgroundColor: '#7b6e3e' },
  icone: { fontSize: 14 },
  texte: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
})
