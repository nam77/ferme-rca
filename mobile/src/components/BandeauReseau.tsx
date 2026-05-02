import { View, Text, StyleSheet } from 'react-native'
import { useReseau } from '../hooks/useReseau'
import { COULEURS } from '../constants/couleurs'

export const BandeauReseau = () => {
  const { enLigne } = useReseau()

  if (enLigne) return null

  return (
    <View style={styles.bandeau}>
      <Text style={styles.icone}>📡</Text>
      <Text style={styles.texte}>Hors ligne — vos modifications seront synchronisées au retour de la connexion.</Text>
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
    backgroundColor: COULEURS.orange,
  },
  icone: { fontSize: 14 },
  texte: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
})
