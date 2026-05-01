import { View, Text, Pressable, StyleSheet } from 'react-native'
import {
  COULEURS,
  COULEURS_FILIERES,
  ICONES_FILIERES,
  type Filiere as FiliereCouleur,
} from '../constants/couleurs'
import type { ZoneListe } from '../types/zone.types'

type Props = {
  zone: ZoneListe
  onPress: () => void
}

export const HotspotZone = ({ zone, onPress }: Props) => {
  const couleur = COULEURS_FILIERES[zone.filiere as FiliereCouleur]
  const icone = ICONES_FILIERES[zone.filiere as FiliereCouleur]

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Zone ${zone.nom}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.conteneur,
        {
          left: `${zone.positionX}%`,
          top: `${zone.positionY}%`,
        },
        pressed && styles.pressee,
      ]}
    >
      <View style={[styles.pastille, { backgroundColor: couleur }]}>
        <Text style={styles.icone}>{icone}</Text>
      </View>
      <View style={[styles.etiquette, { borderColor: couleur }]}>
        <Text style={styles.etiquetteTexte} numberOfLines={1}>
          {zone.nom}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  conteneur: {
    position: 'absolute',
    transform: [{ translateX: -28 }, { translateY: -28 }],
    alignItems: 'center',
  },
  pressee: { opacity: 0.85, transform: [{ translateX: -28 }, { translateY: -28 }, { scale: 1.05 }] },
  pastille: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  icone: { fontSize: 28 },
  etiquette: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 140,
  },
  etiquetteTexte: { fontSize: 11, fontWeight: '600', color: COULEURS.texte },
})