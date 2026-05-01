import { View, Text, StyleSheet } from 'react-native'
import { COULEURS } from '../constants/couleurs'

type Props = {
  pourcentage: number
  label?: string
  couleur?: string
}

export const BarreProgression = ({ pourcentage, label, couleur }: Props) => {
  const valeur = Math.max(0, Math.min(100, pourcentage))
  const accent = couleur ?? COULEURS.vert
  return (
    <View style={styles.conteneur}>
      {label ? (
        <View style={styles.entete}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.pourcent, { color: accent }]}>{valeur}%</Text>
        </View>
      ) : null}
      <View style={styles.piste}>
        <View style={[styles.remplissage, { width: `${valeur}%`, backgroundColor: accent }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  conteneur: { width: '100%' },
  entete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  label: { fontSize: 14, color: COULEURS.texte, fontWeight: '600' },
  pourcent: { fontSize: 18, fontWeight: '800' },
  piste: {
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  remplissage: {
    height: '100%',
    borderRadius: 6,
  },
})