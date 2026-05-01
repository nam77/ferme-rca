import { View, Text, StyleSheet } from 'react-native'
import { COULEURS_PRIORITES, type Priorite as PrioriteCouleur } from '../constants/couleurs'
import type { Priorite } from '../types/tache.types'

const LIBELLES: Record<Priorite, string> = {
  haute: 'Haute',
  moyenne: 'Moyenne',
  basse: 'Basse',
}

type Props = { priorite: Priorite }

export const BadgePriorite = ({ priorite }: Props) => {
  const couleur = COULEURS_PRIORITES[priorite as PrioriteCouleur]
  return (
    <View style={[styles.badge, { backgroundColor: couleur + '22', borderColor: couleur }]}>
      <View style={[styles.point, { backgroundColor: couleur }]} />
      <Text style={[styles.texte, { color: couleur }]}>{LIBELLES[priorite]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  point: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  texte: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
})
