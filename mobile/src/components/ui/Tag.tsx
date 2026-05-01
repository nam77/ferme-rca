import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { COULEURS_TOKEN, POLICES, RAYONS } from '../../constants/theme'

type Variante = 'green' | 'blue' | 'amber' | 'rouge' | 'neutre'

const PALETTES: Record<Variante, { fond: string; bordure: string; texte: string }> = {
  green: {
    fond: 'rgba(74,140,63,0.12)',
    bordure: 'rgba(74,140,63,0.30)',
    texte: COULEURS_TOKEN.mint,
  },
  blue: {
    fond: 'rgba(26,107,138,0.10)',
    bordure: 'rgba(26,107,138,0.30)',
    texte: COULEURS_TOKEN.water,
  },
  amber: {
    fond: 'rgba(201,169,110,0.15)',
    bordure: 'rgba(201,169,110,0.40)',
    texte: COULEURS_TOKEN.earth,
  },
  rouge: {
    fond: 'rgba(231,76,60,0.10)',
    bordure: 'rgba(231,76,60,0.35)',
    texte: COULEURS_TOKEN.rouge,
  },
  neutre: {
    fond: 'rgba(92,61,30,0.06)',
    bordure: COULEURS_TOKEN.bordure,
    texte: COULEURS_TOKEN.earth,
  },
}

type Props = {
  children: string
  variante?: Variante
  style?: StyleProp<ViewStyle>
}

export const Tag = ({ children, variante = 'neutre', style }: Props) => {
  const palette = PALETTES[variante]
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: palette.fond, borderColor: palette.bordure },
        style,
      ]}
    >
      <Text style={[styles.texte, { color: palette.texte }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 9,
    borderRadius: RAYONS.petit,
    borderWidth: 1,
  },
  texte: {
    fontFamily: POLICES.mono,
    fontSize: 11,
  },
})
