// Plan technique — vue en blocs étiquetés (équivalent du panel droit de
// presentation-de-la-ferme.png), avec hotspots cliquables pour ouvrir une zone.

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../constants/theme'
import {
  COULEURS_FILIERES,
  ICONES_FILIERES,
  type Filiere as FiliereCouleur,
} from '../constants/couleurs'
import type { ZoneListe } from '../types/zone.types'

type Props = {
  zones: ZoneListe[]
  onZonePress: (zone: ZoneListe) => void
}

const formatSurface = (m2: number | null): string => {
  if (m2 === null) return ''
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(1)} ha`
  return `${m2.toLocaleString('fr-FR')} m²`
}

export const PlanTechnique = ({ zones, onZonePress }: Props) => {
  return (
    <View style={styles.canvas}>
      <View style={styles.bordure}>
        {zones.map((z) => {
          const couleur = COULEURS_FILIERES[z.filiere as FiliereCouleur]
          const icone = ICONES_FILIERES[z.filiere as FiliereCouleur]
          // Position en % du canvas, taille fixe pour lisibilité
          const left = `${Math.max(2, Math.min(z.positionX - 8, 86))}%`
          const top = `${Math.max(2, Math.min(z.positionY - 6, 88))}%`
          return (
            <Pressable
              key={z.id}
              onPress={() => onZonePress(z)}
              accessibilityLabel={`Zone ${z.nom}`}
              accessibilityRole="button"
              // @ts-expect-error : RN Web supporte string %
              style={({ pressed }) => [
                styles.bloc,
                {
                  left,
                  top,
                  backgroundColor: couleur + '12',
                  borderColor: couleur,
                },
                pressed && styles.blocPresse,
              ]}
            >
              <View style={styles.blocLigne}>
                <Text style={styles.blocIcone}>{icone}</Text>
                <Text style={[styles.blocLibelle, { color: couleur }]} numberOfLines={2}>
                  {z.nom}
                </Text>
              </View>
              {z.surface ? (
                <Text style={styles.blocSurface}>{formatSurface(z.surface)}</Text>
              ) : null}
            </Pressable>
          )
        })}
        <View style={styles.compteurZones}>
          <Text style={styles.compteurZonesTexte}>{zones.length}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    aspectRatio: 1.2,
    backgroundColor: COULEURS_TOKEN.cream,
    borderRadius: RAYONS.grand,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
    overflow: 'hidden',
    position: 'relative',
  },
  bordure: {
    flex: 1,
    margin: ESPACEMENTS.s,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COULEURS_TOKEN.clay + '60',
    borderRadius: RAYONS.moyen,
    position: 'relative',
  },
  bloc: {
    position: 'absolute',
    paddingHorizontal: ESPACEMENTS.s,
    paddingVertical: 6,
    borderRadius: RAYONS.petit,
    borderWidth: 1.5,
    minWidth: 110,
    maxWidth: 160,
  },
  blocPresse: { opacity: 0.85 },
  blocLigne: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  blocIcone: { fontSize: 14 },
  blocLibelle: {
    flex: 1,
    fontFamily: POLICES.sansBold,
    fontSize: 11,
    lineHeight: 14,
  },
  blocSurface: {
    fontFamily: POLICES.mono,
    fontSize: 9,
    color: COULEURS_TOKEN.clay,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  compteurZones: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COULEURS_TOKEN.rouge,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compteurZonesTexte: {
    fontFamily: POLICES.sansBold,
    color: '#fff',
    fontSize: 12,
  },
})
