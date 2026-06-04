import { View, Text, StyleSheet } from 'react-native'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../../constants/theme'

type Props = {
  message: string
}

// Bandeau d'erreur (fond rosé) commun aux formulaires.
export const MessageErreur = ({ message }: Props) => (
  <View style={styles.bloc}>
    <Text style={styles.texte}>{message}</Text>
  </View>
)

const styles = StyleSheet.create({
  bloc: {
    width: '100%',
    backgroundColor: 'rgba(231,76,60,0.10)',
    borderRadius: RAYONS.moyen,
    paddingVertical: ESPACEMENTS.s,
    paddingHorizontal: ESPACEMENTS.m,
    marginBottom: ESPACEMENTS.m,
  },
  texte: {
    fontFamily: POLICES.sansMedium,
    color: COULEURS_TOKEN.rouge,
    fontSize: 14,
    textAlign: 'center',
  },
})
