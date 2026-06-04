import { Pressable, Text, StyleSheet } from 'react-native'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES } from '../../constants/theme'

type Variante = 'mint' | 'terre'

type Props = {
  libelle: string
  onPress: () => void
  variante?: Variante
}

// Lien texte cliquable, commun aux formulaires (mot de passe oublié, retour…).
export const LienTexte = ({ libelle, onPress, variante = 'mint' }: Props) => (
  <Pressable
    onPress={onPress}
    accessibilityLabel={libelle}
    accessibilityRole="link"
    style={({ pressed }) => [styles.lien, pressed && styles.presse]}
  >
    <Text style={[styles.texte, variante === 'terre' && styles.texteTerre]}>{libelle}</Text>
  </Pressable>
)

const styles = StyleSheet.create({
  lien: {
    marginTop: ESPACEMENTS.l,
    alignSelf: 'center',
    paddingVertical: ESPACEMENTS.s,
    paddingHorizontal: ESPACEMENTS.m,
  },
  presse: { opacity: 0.6 },
  texte: {
    fontFamily: POLICES.sansMedium,
    fontSize: 14,
    color: COULEURS_TOKEN.mint,
  },
  texteTerre: {
    color: COULEURS_TOKEN.earth,
  },
})
