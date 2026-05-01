import { View, Text, StyleSheet } from 'react-native'
import { COULEURS } from '../constants/couleurs'

type Props = {
  icone: string
  label: string
  valeur: string | number
  couleur?: string
  sousTexte?: string
}

export const CarteKPI = ({ icone, label, valeur, couleur, sousTexte }: Props) => {
  const accent = couleur ?? COULEURS.vert
  return (
    <View style={[styles.carte, { borderTopColor: accent }]}>
      <Text style={styles.icone}>{icone}</Text>
      <Text style={[styles.valeur, { color: accent }]}>{valeur}</Text>
      <Text style={styles.label}>{label}</Text>
      {sousTexte ? <Text style={styles.sousTexte}>{sousTexte}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  carte: {
    flex: 1,
    minWidth: 140,
    backgroundColor: COULEURS.carte,
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftColor: COULEURS.bordure,
    borderRightColor: COULEURS.bordure,
    borderBottomColor: COULEURS.bordure,
  },
  icone: { fontSize: 22, marginBottom: 4 },
  valeur: { fontSize: 32, fontWeight: '800', marginVertical: 2 },
  label: {
    fontSize: 13,
    color: COULEURS.texte,
    fontWeight: '600',
  },
  sousTexte: { fontSize: 11, color: COULEURS.texteSecondaire, marginTop: 4 },
})
