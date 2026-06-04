import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../../constants/theme'

type Props = TextInputProps & {
  // Libellé affiché au-dessus du champ.
  label: string
  // Texte d'aide optionnel sous le champ.
  aide?: string
}

// Champ de saisie étiqueté, avec mise en valeur de la bordure au focus.
// Brique commune à tous les formulaires (connexion, inscription, …).
export const ChampTexte = ({ label, aide, style, onFocus, onBlur, ...reste }: Props) => {
  const [actif, setActif] = useState(false)

  return (
    <View style={styles.bloc}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...reste}
        onFocus={(e) => {
          setActif(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setActif(false)
          onBlur?.(e)
        }}
        placeholderTextColor={COULEURS_TOKEN.clay}
        style={[styles.champ, actif && styles.champActif, style]}
      />
      {aide ? <Text style={styles.aide}>{aide}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  bloc: { width: '100%', marginBottom: ESPACEMENTS.l },
  label: {
    fontFamily: POLICES.sansMedium,
    fontSize: 14,
    color: COULEURS_TOKEN.earth,
    marginBottom: ESPACEMENTS.s,
  },
  champ: {
    height: 52,
    borderWidth: 1.5,
    borderColor: COULEURS_TOKEN.bordure,
    borderRadius: RAYONS.moyen,
    paddingHorizontal: ESPACEMENTS.l,
    fontFamily: POLICES.sans,
    fontSize: 16,
    color: COULEURS_TOKEN.soil,
    backgroundColor: COULEURS_TOKEN.cream,
  },
  champActif: {
    borderColor: COULEURS_TOKEN.mint,
    backgroundColor: COULEURS_TOKEN.carte,
  },
  aide: {
    marginTop: ESPACEMENTS.xs,
    fontFamily: POLICES.sans,
    fontSize: 12,
    color: COULEURS_TOKEN.earth,
  },
})
