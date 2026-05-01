import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../../constants/theme'

type Variante = 'paille' | 'feuille' | 'eau' | 'argile' | 'neutre'

const COULEURS_VARIANTE: Record<Variante, { fond: string; bordure: string; texte: string }> = {
  paille: {
    fond: 'rgba(201,169,110,0.15)',
    bordure: 'rgba(201,169,110,0.4)',
    texte: COULEURS_TOKEN.earth,
  },
  feuille: {
    fond: 'rgba(74,140,63,0.10)',
    bordure: 'rgba(74,140,63,0.35)',
    texte: COULEURS_TOKEN.mint,
  },
  eau: {
    fond: 'rgba(26,107,138,0.10)',
    bordure: 'rgba(26,107,138,0.35)',
    texte: COULEURS_TOKEN.water,
  },
  argile: {
    fond: 'rgba(139,94,60,0.12)',
    bordure: 'rgba(139,94,60,0.35)',
    texte: COULEURS_TOKEN.clay,
  },
  neutre: {
    fond: 'rgba(255,255,255,0.10)',
    bordure: 'rgba(255,255,255,0.20)',
    texte: COULEURS_TOKEN.wheat,
  },
}

type Props = {
  children: string
  variante?: Variante
  style?: StyleProp<ViewStyle>
  couleurPersonnalisee?: { fond: string; bordure: string; texte: string }
}

export const Pastille = ({ children, variante = 'paille', style, couleurPersonnalisee }: Props) => {
  const palette = couleurPersonnalisee ?? COULEURS_VARIANTE[variante]
  return (
    <View
      style={[
        styles.pastille,
        { backgroundColor: palette.fond, borderColor: palette.bordure },
        style,
      ]}
    >
      <Text style={[styles.texte, { color: palette.texte }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pastille: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: ESPACEMENTS.m,
    borderRadius: RAYONS.pastille,
    borderWidth: 1,
  },
  texte: {
    fontFamily: POLICES.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})
