// Plan technique — schéma rectangulaire structuré de la ferme.
// Reproduit le panel droit de presentation-de-la-ferme.png : un grand rectangle
// avec lignes pointillées, subdivisé en zones étiquetées par filière.

import { View, Text, Pressable, StyleSheet } from 'react-native'
import Svg, { Rect, Line, G } from 'react-native-svg'
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

// Layout en grille technique : positions et tailles des blocs sur 100×100
type Mise = { x: number; y: number; w: number; h: number }

const fallbackMise = (idx: number, total: number): Mise => {
  const cols = Math.ceil(Math.sqrt(total))
  const rows = Math.ceil(total / cols)
  const w = 96 / cols
  const h = 92 / rows
  const c = idx % cols
  const r = Math.floor(idx / cols)
  return { x: 2 + c * w, y: 4 + r * h, w: w - 1, h: h - 1 }
}

export const PlanTechnique = ({ zones, onZonePress }: Props) => {
  return (
    <View style={styles.canvas}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        {/* Cadre extérieur (limite de la ferme) */}
        <Rect
          x="1"
          y="1"
          width="98"
          height="98"
          fill={COULEURS_TOKEN.cream}
          stroke={COULEURS_TOKEN.clay}
          strokeWidth="0.4"
          strokeDasharray="2,1"
          rx="1"
        />
        {/* Grille technique */}
        <G opacity="0.35">
          {[20, 40, 60, 80].map((p) => (
            <Line
              key={`v${p}`}
              x1={p}
              y1="1"
              x2={p}
              y2="99"
              stroke={COULEURS_TOKEN.clay}
              strokeWidth="0.15"
              strokeDasharray="0.6,0.6"
            />
          ))}
          {[20, 40, 60, 80].map((p) => (
            <Line
              key={`h${p}`}
              x1="1"
              y1={p}
              x2="99"
              y2={p}
              stroke={COULEURS_TOKEN.clay}
              strokeWidth="0.15"
              strokeDasharray="0.6,0.6"
            />
          ))}
        </G>
      </Svg>

      {/* Blocs zones positionnés en absolute (RN web traduit les % en CSS) */}
      {zones.map((z, idx) => {
        const couleur = COULEURS_FILIERES[z.filiere as FiliereCouleur]
        const icone = ICONES_FILIERES[z.filiere as FiliereCouleur]
        const m = fallbackMise(idx, zones.length)
        const styleAbs = {
          left: `${m.x}%`,
          top: `${m.y}%`,
          width: `${m.w}%`,
          height: `${m.h}%`,
        } as unknown as Record<string, string | number>
        return (
          <Pressable
            key={z.id}
            onPress={() => onZonePress(z)}
            accessibilityLabel={`Zone ${z.nom}`}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.bloc,
              styleAbs,
              {
                backgroundColor: couleur + '15',
                borderColor: couleur,
              },
              pressed && styles.blocPresse,
            ]}
          >
            <Text style={styles.blocIcone}>{icone}</Text>
            <Text
              style={[styles.blocLibelle, { color: couleur }]}
              numberOfLines={2}
            >
              {z.nom}
            </Text>
            {z.surface ? (
              <Text style={styles.blocSurface}>{formatSurface(z.surface)}</Text>
            ) : null}
          </Pressable>
        )
      })}

      {/* Compteur en bas à droite */}
      <View style={styles.compteurZones}>
        <Text style={styles.compteurZonesTexte}>{zones.length}</Text>
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
  bloc: {
    position: 'absolute',
    paddingHorizontal: ESPACEMENTS.s,
    paddingVertical: ESPACEMENTS.s - 2,
    borderRadius: RAYONS.petit,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'flex-start',
    margin: 2,
  },
  blocPresse: { opacity: 0.85 },
  blocIcone: { fontSize: 14, marginBottom: 2 },
  blocLibelle: {
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COULEURS_TOKEN.rouge,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compteurZonesTexte: {
    fontFamily: POLICES.sansBold,
    color: '#fff',
    fontSize: 11,
  },
})
