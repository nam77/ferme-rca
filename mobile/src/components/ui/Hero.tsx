import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES } from '../../constants/theme'
import { Pastille } from './Pastille'

type Props = {
  tag?: string
  titre: string
  titreEmphase?: string
  sousTitre?: string
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export const Hero = ({ tag, titre, titreEmphase, sousTitre, children, style }: Props) => {
  return (
    <LinearGradient
      colors={[COULEURS_TOKEN.soil, COULEURS_TOKEN.earth, COULEURS_TOKEN.leaf]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.6, 1]}
      style={[styles.hero, style]}
    >
      {tag ? (
        <Pastille variante="paille" style={styles.tag}>
          {tag}
        </Pastille>
      ) : null}
      <Text style={styles.titre}>
        {titre}
        {titreEmphase ? <Text style={styles.titreEmphase}> {titreEmphase}</Text> : null}
      </Text>
      {sousTitre ? <Text style={styles.sousTitre}>{sousTitre}</Text> : null}
      {children ? <View style={styles.enfants}>{children}</View> : null}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: ESPACEMENTS.xl,
    paddingTop: ESPACEMENTS.xxl,
    paddingBottom: ESPACEMENTS.xxxl,
  },
  tag: { marginBottom: ESPACEMENTS.l },
  titre: {
    fontFamily: POLICES.serif,
    fontSize: 36,
    lineHeight: 42,
    color: COULEURS_TOKEN.cream,
  },
  titreEmphase: {
    fontFamily: POLICES.serifItalique,
    color: COULEURS_TOKEN.straw,
  },
  sousTitre: {
    marginTop: ESPACEMENTS.s,
    fontFamily: POLICES.sans,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(250,246,238,0.78)',
    maxWidth: 580,
  },
  enfants: { marginTop: ESPACEMENTS.l },
})
