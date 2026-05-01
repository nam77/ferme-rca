import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { COULEURS_TOKEN, ESPACEMENTS, RAYONS } from '../../constants/theme'

type Props = {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  bordureGauche?: string
}

export const Card = ({ children, style, bordureGauche }: Props) => {
  return (
    <View
      style={[
        styles.card,
        bordureGauche
          ? { borderLeftWidth: 4, borderLeftColor: bordureGauche, paddingLeft: ESPACEMENTS.l - 4 }
          : null,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COULEURS_TOKEN.carte,
    borderRadius: RAYONS.moyen,
    padding: ESPACEMENTS.l,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
    shadowColor: COULEURS_TOKEN.ombre,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
})
