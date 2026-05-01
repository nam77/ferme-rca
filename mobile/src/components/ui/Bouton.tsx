import { Pressable, Text, ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../../constants/theme'

type Variante = 'primaire' | 'secondaire' | 'fantome' | 'rouge'

const PALETTES: Record<Variante, { fond: string; texte: string; bordure?: string }> = {
  primaire: { fond: COULEURS_TOKEN.mint, texte: '#fff' },
  secondaire: {
    fond: COULEURS_TOKEN.carte,
    texte: COULEURS_TOKEN.soil,
    bordure: COULEURS_TOKEN.bordure,
  },
  fantome: {
    fond: 'transparent',
    texte: COULEURS_TOKEN.earth,
  },
  rouge: { fond: COULEURS_TOKEN.rouge, texte: '#fff' },
}

type Props = {
  libelle: string
  onPress: () => void
  variante?: Variante
  enCours?: boolean
  desactive?: boolean
  pleinement?: boolean
  style?: StyleProp<ViewStyle>
}

export const Bouton = ({
  libelle,
  onPress,
  variante = 'primaire',
  enCours = false,
  desactive = false,
  pleinement = false,
  style,
}: Props) => {
  const palette = PALETTES[variante]
  return (
    <Pressable
      onPress={onPress}
      disabled={enCours || desactive}
      accessibilityLabel={libelle}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.bouton,
        {
          backgroundColor: palette.fond,
          borderWidth: palette.bordure ? 1 : 0,
          borderColor: palette.bordure ?? 'transparent',
        },
        pleinement && styles.pleinement,
        pressed && !desactive && styles.presse,
        (enCours || desactive) && styles.desactive,
        style,
      ]}
    >
      {enCours ? (
        <ActivityIndicator color={palette.texte} />
      ) : (
        <Text style={[styles.libelle, { color: palette.texte }]}>{libelle}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bouton: {
    height: 48,
    paddingHorizontal: ESPACEMENTS.xl,
    borderRadius: RAYONS.moyen,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  pleinement: { width: '100%' },
  presse: { opacity: 0.85 },
  desactive: { opacity: 0.55 },
  libelle: {
    fontFamily: POLICES.sansMedium,
    fontSize: 15,
  },
})
