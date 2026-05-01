import { View, StyleSheet } from 'react-native'
import Svg, { Defs, LinearGradient, Pattern, Rect, Stop, Path, G, Line, Circle } from 'react-native-svg'
import { HotspotZone } from './HotspotZone'
import { COULEURS } from '../constants/couleurs'
import type { ZoneListe } from '../types/zone.types'

type Props = {
  zones: ZoneListe[]
  onZonePress: (zone: ZoneListe) => void
}

export const PlanFerme = ({ zones, onZonePress }: Props) => {
  return (
    <View style={styles.conteneur}>
      <View style={styles.canvas}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id="herbe" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#cfe6c4" />
              <Stop offset="1" stopColor="#b9d6a8" />
            </LinearGradient>
            <LinearGradient id="champs" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#d4b876" />
              <Stop offset="1" stopColor="#bfa15e" />
            </LinearGradient>
            <LinearGradient id="eau" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#7cb8d0" />
              <Stop offset="1" stopColor="#5fa2bd" />
            </LinearGradient>
            <Pattern id="rangees" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
              <Path d="M0 1.5 L3 1.5" stroke="#a88f4d" strokeWidth="0.3" />
            </Pattern>
          </Defs>

          {/* Fond herbe sur toute la ferme */}
          <Rect x="0" y="0" width="100" height="100" fill="url(#herbe)" />

          {/* Bordure ferme */}
          <Rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="#7b6e3e" strokeWidth="0.4" strokeDasharray="1.5,1" />

          {/* Zones bâtiments (côté nord) */}
          <Rect x="13" y="11" width="14" height="14" rx="0.8" fill="#e8943a" opacity="0.18" stroke="#e8943a" strokeWidth="0.3" />
          <Rect x="33" y="11" width="14" height="14" rx="0.8" fill="#d4548a" opacity="0.18" stroke="#d4548a" strokeWidth="0.3" />

          {/* Parc caprins */}
          <Rect x="15" y="34" width="22" height="16" rx="1" fill="#7b6e3e" opacity="0.18" stroke="#7b6e3e" strokeWidth="0.3" />

          {/* Bassins piscicoles */}
          <Rect x="55" y="18" width="20" height="14" rx="2" fill="url(#eau)" stroke="#1a6b8a" strokeWidth="0.3" />
          <Rect x="78" y="18" width="14" height="14" rx="2" fill="url(#eau)" opacity="0.55" stroke="#1a6b8a" strokeWidth="0.3" strokeDasharray="0.8,0.6" />

          {/* Champs */}
          <Rect x="10" y="55" width="35" height="20" fill="url(#champs)" />
          <Rect x="10" y="55" width="35" height="20" fill="url(#rangees)" />
          <Rect x="40" y="55" width="35" height="20" fill="url(#champs)" />
          <Rect x="40" y="55" width="35" height="20" fill="url(#rangees)" />
          <Rect x="60" y="68" width="32" height="20" rx="1" fill="#4a8c3f" opacity="0.32" stroke="#4a8c3f" strokeWidth="0.3" />

          {/* Chemin central */}
          <Path d="M 50 0 L 50 100" stroke="#a88c5e" strokeWidth="1.2" strokeDasharray="1,1.2" opacity="0.55" />

          {/* Repère nord */}
          <G>
            <Circle cx="92" cy="6" r="3" fill="#fff" stroke="#5c3d1e" strokeWidth="0.3" />
            <Path d="M 92 8.5 L 92 3.5" stroke="#5c3d1e" strokeWidth="0.4" />
            <Path d="M 92 3.5 L 90.7 5 L 93.3 5 Z" fill="#5c3d1e" />
          </G>

          {/* Légende discrète : 8 ha */}
          <G>
            <Rect x="2" y="92" width="22" height="6" rx="1" fill="rgba(255,255,255,0.85)" />
            <Line x1="3.5" y1="95" x2="6.5" y2="95" stroke="#5c3d1e" strokeWidth="0.5" />
          </G>
        </Svg>

        {zones.map((z) => (
          <HotspotZone key={z.id} zone={z} onPress={() => onZonePress(z)} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  conteneur: {
    width: '100%',
    paddingHorizontal: 12,
  },
  canvas: {
    width: '100%',
    aspectRatio: 1.2,
    backgroundColor: '#cfe6c4',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    position: 'relative',
  },
})
