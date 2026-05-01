import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../../constants/theme'

type Props = {
  numero?: string
  titre: string
  sousTitre?: string
  style?: StyleProp<ViewStyle>
}

export const EnteteSection = ({ numero, titre, sousTitre, style }: Props) => {
  return (
    <View style={[styles.entete, style]}>
      <View style={styles.ligne}>
        {numero ? (
          <View style={styles.numero}>
            <Text style={styles.numeroTexte}>{numero}</Text>
          </View>
        ) : null}
        <Text style={styles.titre}>{titre}</Text>
      </View>
      {sousTitre ? <Text style={styles.sousTitre}>{sousTitre}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  entete: {
    paddingBottom: ESPACEMENTS.l,
    borderBottomWidth: 2,
    borderBottomColor: COULEURS_TOKEN.bordure,
    marginBottom: ESPACEMENTS.xl,
  },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: ESPACEMENTS.m },
  numero: {
    paddingHorizontal: ESPACEMENTS.s + 2,
    paddingVertical: 4,
    borderRadius: RAYONS.petit,
    backgroundColor: 'rgba(74,140,63,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(74,140,63,0.30)',
  },
  numeroTexte: {
    fontFamily: POLICES.mono,
    fontSize: 11,
    color: COULEURS_TOKEN.mint,
    letterSpacing: 0.8,
  },
  titre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 24,
    color: COULEURS_TOKEN.soil,
    flex: 1,
  },
  sousTitre: {
    marginTop: ESPACEMENTS.s,
    fontFamily: POLICES.sans,
    fontSize: 14,
    color: COULEURS_TOKEN.earth,
  },
})
