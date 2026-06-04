import { useCallback, useEffect, useRef, useState } from 'react'
import { Text, Pressable, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
} from 'react-native-reanimated'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '@src/constants/theme'
import { SceneFerme, DUREE_SCENE_MS } from './SceneFerme'

type Props = {
  onTermine: () => void
}

export const IntroAnimee = ({ onTermine }: Props) => {
  const progression = useSharedValue(0)
  const opacite = useSharedValue(1)
  const [pret, setPret] = useState(false)
  const sorti = useRef(false)

  // Lance la progression de la pousse au montage (la scène en suit le rythme).
  useEffect(() => {
    progression.value = withTiming(
      1,
      { duration: DUREE_SCENE_MS, easing: Easing.inOut(Easing.cubic) },
      (fini) => {
        if (fini) runOnJS(setPret)(true)
      },
    )
  }, [progression])

  const sortir = useCallback(() => {
    if (sorti.current) return
    sorti.current = true
    opacite.value = withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) }, (fini) => {
      if (fini) runOnJS(onTermine)()
    })
  }, [opacite, onTermine])

  // Une fois la scène complète, laisse contempler puis enchaîne sur l'accueil.
  useEffect(() => {
    if (!pret) return
    const t = setTimeout(sortir, 1800)
    return () => clearTimeout(t)
  }, [pret, sortir])

  // Titre + bouton apparaissent vers la fin.
  const styleTitre = useAnimatedStyle(() => ({
    opacity: interpolate(progression.value, [0.6, 0.95], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progression.value, [0.6, 0.95], [16, 0], Extrapolation.CLAMP) },
    ],
  }))

  const styleEcran = useAnimatedStyle(() => ({ opacity: opacite.value }))

  return (
    <Animated.View style={[styles.conteneur, styleEcran]}>
      {/* Décor animé partagé (champ préparé -> pluie -> semis -> cultures luxuriantes) */}
      <SceneFerme progression={progression} afficherLegendes />

      {/* Titre + accès à l'application */}
      <Animated.View style={[styles.bloc, styleTitre]}>
        <Text style={styles.surTitre}>AGROPASTORALE RCA · 8 HECTARES</Text>
        <Text style={styles.titre}>
          Du sol préparé{'\n'}à la <Text style={styles.titreEmphase}>terre nourricière</Text>
        </Text>
        <Text style={styles.sousTitre}>
          La pluie nourrit le champ de Yangana et fait lever les cultures.
        </Text>
        <Pressable
          onPress={sortir}
          accessibilityLabel="Entrer dans l’application"
          accessibilityRole="button"
          style={({ pressed }) => [styles.bouton, pressed && styles.boutonPresse]}
        >
          <Text style={styles.boutonTexte}>Entrer →</Text>
        </Pressable>
      </Animated.View>

      {/* Passer l'intro à tout moment */}
      <Pressable
        onPress={sortir}
        accessibilityLabel="Passer l’introduction"
        accessibilityRole="button"
        style={styles.passer}
      >
        <Text style={styles.passerTexte}>Passer</Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  conteneur: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: COULEURS_TOKEN.soil,
    zIndex: 100,
  },
  bloc: {
    position: 'absolute',
    bottom: ESPACEMENTS.xxxl,
    left: ESPACEMENTS.xl,
    right: ESPACEMENTS.xl,
    alignItems: 'center',
  },
  surTitre: {
    fontFamily: POLICES.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    color: 'rgba(250,246,238,0.85)',
    marginBottom: ESPACEMENTS.s,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  titre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 30,
    lineHeight: 36,
    color: COULEURS_TOKEN.cream,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  titreEmphase: {
    fontFamily: POLICES.serifItalique,
    color: COULEURS_TOKEN.straw,
  },
  sousTitre: {
    fontFamily: POLICES.sans,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(250,246,238,0.9)',
    textAlign: 'center',
    marginTop: ESPACEMENTS.s,
    marginBottom: ESPACEMENTS.l,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  bouton: {
    backgroundColor: COULEURS_TOKEN.leaf,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: RAYONS.pastille,
    minHeight: 48,
    justifyContent: 'center',
  },
  boutonPresse: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  boutonTexte: {
    fontFamily: POLICES.sansBold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  passer: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: 'center',
  },
  passerTexte: {
    fontFamily: POLICES.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: COULEURS_TOKEN.cream,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
})
