import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
  type SharedValue,
} from 'react-native-reanimated'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '@src/constants/theme'

// Durée totale de la progression de l'eau (savane -> forêt -> champs).
const DUREE_MS = 5400

type Props = {
  onTermine: () => void
}

// ---------------------------------------------------------------------------
// Un végétal qui « pousse » quand le front de l'eau dépasse sa position.
// `seuil` = fraction de progression (0..1) à laquelle la plante commence à
// pousser ; elle atteint sa taille pleine 0,14 plus loin.
// ---------------------------------------------------------------------------
type PlanteProps = {
  progression: SharedValue<number>
  seuil: number
  emoji: string
  gauche: number // pourcentage horizontal (0..100)
  bas: number // distance depuis le sol, en px
  taille: number
}

const PlanteAnimee = ({ progression, seuil, emoji, gauche, bas, taille }: PlanteProps) => {
  const style = useAnimatedStyle(() => {
    const p = interpolate(
      progression.value,
      [seuil, seuil + 0.14],
      [0, 1],
      Extrapolation.CLAMP,
    )
    return {
      opacity: p,
      transform: [
        { translateY: (1 - p) * 18 },
        { scale: 0.3 + p * 0.7 },
      ],
    }
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.plante, { left: `${gauche}%`, bottom: bas }, style]}
    >
      <Text style={{ fontSize: taille }}>{emoji}</Text>
    </Animated.View>
  )
}

// ---------------------------------------------------------------------------
// Légende d'étape : apparaît puis disparaît sur une plage de progression.
// ---------------------------------------------------------------------------
type LegendeProps = {
  progression: SharedValue<number>
  texte: string
  debut: number
  fin: number
}

const LegendeEtape = ({ progression, texte, debut, fin }: LegendeProps) => {
  const milieu = (debut + fin) / 2
  const style = useAnimatedStyle(() => {
    const p = interpolate(
      progression.value,
      [debut, debut + 0.06, fin - 0.06, fin],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    )
    const y = interpolate(progression.value, [debut, milieu], [10, 0], Extrapolation.CLAMP)
    return { opacity: p, transform: [{ translateY: y }] }
  })
  return (
    <Animated.Text style={[styles.legende, style]} pointerEvents="none">
      {texte}
    </Animated.Text>
  )
}

// Position des végétaux le long du parcours de l'eau (gauche -> droite).
// Le `seuil` croît avec la position horizontale : la forêt et les champs
// lèvent au fur et à mesure que l'eau progresse.
const FORET: Omit<PlanteProps, 'progression'>[] = [
  { seuil: 0.14, emoji: '🌳', gauche: 6, bas: 150, taille: 40 },
  { seuil: 0.2, emoji: '🌴', gauche: 17, bas: 168, taille: 46 },
  { seuil: 0.27, emoji: '🌲', gauche: 28, bas: 152, taille: 38 },
  { seuil: 0.34, emoji: '🌳', gauche: 39, bas: 172, taille: 50 },
  { seuil: 0.42, emoji: '🌴', gauche: 51, bas: 150, taille: 42 },
  { seuil: 0.5, emoji: '🌲', gauche: 63, bas: 170, taille: 46 },
  { seuil: 0.58, emoji: '🌳', gauche: 75, bas: 154, taille: 40 },
  { seuil: 0.66, emoji: '🌴', gauche: 87, bas: 168, taille: 48 },
]

const CHAMPS: Omit<PlanteProps, 'progression'>[] = [
  { seuil: 0.32, emoji: '🌽', gauche: 4, bas: 70, taille: 34 },
  { seuil: 0.37, emoji: '🌿', gauche: 13, bas: 58, taille: 32 },
  { seuil: 0.43, emoji: '🌽', gauche: 23, bas: 72, taille: 36 },
  { seuil: 0.49, emoji: '🌿', gauche: 33, bas: 56, taille: 32 },
  { seuil: 0.55, emoji: '🌽', gauche: 44, bas: 70, taille: 34 },
  { seuil: 0.61, emoji: '🌿', gauche: 55, bas: 60, taille: 34 },
  { seuil: 0.67, emoji: '🌽', gauche: 66, bas: 72, taille: 36 },
  { seuil: 0.73, emoji: '🌿', gauche: 77, bas: 56, taille: 32 },
  { seuil: 0.79, emoji: '🌽', gauche: 88, bas: 70, taille: 34 },
]

export const IntroAnimee = ({ onTermine }: Props) => {
  const { width } = useWindowDimensions()
  const progression = useSharedValue(0)
  const opacite = useSharedValue(1)
  const miroitement = useSharedValue(0)
  const [pret, setPret] = useState(false)
  const sorti = useRef(false)

  // Lance la progression de l'eau au montage.
  useEffect(() => {
    progression.value = withTiming(
      1,
      { duration: DUREE_MS, easing: Easing.inOut(Easing.cubic) },
      (fini) => {
        if (fini) runOnJS(setPret)(true)
      },
    )
    // Miroitement continu de la surface de l'eau.
    miroitement.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    )
  }, [progression, miroitement])

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

  // Front de l'eau qui avance de gauche à droite.
  const styleEau = useAnimatedStyle(() => ({
    width: progression.value * width,
  }))

  // Reflet qui glisse à la surface (impression de courant).
  const styleReflet = useAnimatedStyle(() => ({
    opacity: interpolate(miroitement.value, [0, 0.5, 1], [0.15, 0.5, 0.15]),
    transform: [{ translateX: interpolate(miroitement.value, [0, 1], [-30, 30]) }],
  }))

  // Le sol passe du fauve (savane) au vert (terres irriguées).
  const styleVerdure = useAnimatedStyle(() => ({
    opacity: interpolate(progression.value, [0.1, 0.7], [0, 1], Extrapolation.CLAMP),
  }))

  // Le ciel s'adoucit quand la vie revient.
  const styleCielFrais = useAnimatedStyle(() => ({
    opacity: interpolate(progression.value, [0.2, 0.8], [0, 1], Extrapolation.CLAMP),
  }))

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
      {/* Ciel : savane sèche puis ciel frais en surimpression */}
      <LinearGradient
        colors={['#e7c98a', '#f0dba6', '#f7eccf']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, styleCielFrais]}>
        <LinearGradient colors={['#6fb6d6', '#a8d8b9', '#dcefc4']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Soleil */}
      <View style={styles.soleil} />

      {/* Collines lointaines */}
      <View style={styles.collines} />

      {/* Sol : savane fauve, puis verdure irriguée par-dessus */}
      <View style={styles.sol} />
      <Animated.View style={[styles.solVert, styleVerdure]} />

      {/* La rivière qui coule de gauche à droite */}
      <View style={styles.litRiviere}>
        <Animated.View style={[styles.eau, styleEau]}>
          <LinearGradient
            colors={['#1a6b8a', '#3a9dc4', '#7ec8e3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[styles.reflet, styleReflet]} />
        </Animated.View>
      </View>

      {/* Forêt (arrière-plan) et champs (avant-plan) qui poussent */}
      {FORET.map((p, i) => (
        <PlanteAnimee key={`f${i}`} progression={progression} {...p} />
      ))}
      {CHAMPS.map((p, i) => (
        <PlanteAnimee key={`c${i}`} progression={progression} {...p} />
      ))}

      {/* Légendes d'étape */}
      <View style={styles.zoneLegende} pointerEvents="none">
        <LegendeEtape progression={progression} texte="La savane, en saison sèche…" debut={0} fin={0.26} />
        <LegendeEtape progression={progression} texte="L’eau coule" debut={0.24} fin={0.52} />
        <LegendeEtape progression={progression} texte="La forêt reprend" debut={0.5} fin={0.74} />
        <LegendeEtape progression={progression} texte="Le maïs et le manioc lèvent" debut={0.72} fin={1.01} />
      </View>

      {/* Titre + accès à l'application */}
      <Animated.View style={[styles.bloc, styleTitre]}>
        <Text style={styles.surTitre}>AGROPASTORALE RCA · 8 HECTARES</Text>
        <Text style={styles.titre}>
          De la savane{'\n'}à la <Text style={styles.titreEmphase}>terre nourricière</Text>
        </Text>
        <Text style={styles.sousTitre}>
          L’eau qui circule régénère la forêt et fait lever les cultures.
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
    backgroundColor: COULEURS_TOKEN.wheat,
    zIndex: 100,
  },
  soleil: {
    position: 'absolute',
    top: 70,
    right: 48,
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#fcefb4',
    shadowColor: '#fbe27a',
    shadowOpacity: 0.9,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  collines: {
    position: 'absolute',
    bottom: 196,
    left: -40,
    right: -40,
    height: 160,
    borderTopLeftRadius: 220,
    borderTopRightRadius: 260,
    backgroundColor: 'rgba(124,150,86,0.35)',
  },
  sol: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: '#d9bd7d',
  },
  solVert: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: '#4a8c3f',
  },
  litRiviere: {
    position: 'absolute',
    bottom: 104,
    left: 0,
    right: 0,
    height: 40,
    justifyContent: 'center',
  },
  eau: {
    height: 40,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    shadowColor: COULEURS_TOKEN.water,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  reflet: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  plante: {
    position: 'absolute',
  },
  zoneLegende: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legende: {
    position: 'absolute',
    fontFamily: POLICES.serifItalique,
    fontSize: 24,
    color: COULEURS_TOKEN.soil,
    textAlign: 'center',
    paddingHorizontal: ESPACEMENTS.xl,
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
    color: COULEURS_TOKEN.earth,
    marginBottom: ESPACEMENTS.s,
  },
  titre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 30,
    lineHeight: 36,
    color: COULEURS_TOKEN.soil,
    textAlign: 'center',
  },
  titreEmphase: {
    fontFamily: POLICES.serifItalique,
    color: COULEURS_TOKEN.leaf,
  },
  sousTitre: {
    fontFamily: POLICES.sans,
    fontSize: 14,
    lineHeight: 20,
    color: COULEURS_TOKEN.earth,
    textAlign: 'center',
    marginTop: ESPACEMENTS.s,
    marginBottom: ESPACEMENTS.l,
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
    color: COULEURS_TOKEN.earth,
  },
})
