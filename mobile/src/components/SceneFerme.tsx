import { useEffect, useMemo } from 'react'
import { View, StyleSheet, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
  type SharedValue,
} from 'react-native-reanimated'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES } from '@src/constants/theme'

// Durée totale de la progression (champ préparé -> semis -> pousse -> luxuriant).
export const DUREE_SCENE_MS = 5400

type Props = {
  // Progression externe (0..1). Si absente, la scène crée et lance la sienne.
  progression?: SharedValue<number>
  // Affiche les légendes narratives d'étape (intro). Masquées en fond d'écran.
  afficherLegendes?: boolean
  // Appelé une fois la progression interne terminée (ignoré si `progression` fournie).
  onFini?: () => void
}

// Vraies photos du champ de Yangana, du sol préparé jusqu'aux cultures
// luxuriantes : l'animation enchaîne ces étapes au fil de la progression.
const ETAPES: { src: number; debut: number; fin: number }[] = [
  { src: require('../../assets/scene/champ-1-prepare.jpg'), debut: 0, fin: 0 },
  { src: require('../../assets/scene/champ-2-semis.jpg'), debut: 0.22, fin: 0.5 },
  { src: require('../../assets/scene/champ-3-leve.jpg'), debut: 0.58, fin: 0.9 },
]

// ---------------------------------------------------------------------------
// Une couche photo qui se fond par-dessus la précédente au fil de la pousse.
// ---------------------------------------------------------------------------
type CoucheProps = {
  progression: SharedValue<number>
  src: number
  debut: number
  fin: number
}

const CoucheChamp = ({ progression, src, debut, fin }: CoucheProps) => {
  const style = useAnimatedStyle(() => ({
    opacity: debut === fin ? 1 : interpolate(progression.value, [debut, fin], [0, 1], Extrapolation.CLAMP),
  }))
  // width/height: '100%' est indispensable : sans dimensions explicites, une
  // Image react-native-web garde sa taille intrinsèque (elle ne couvrait que
  // le haut de l'écran) malgré absoluteFill. Avec 100%, elle remplit le
  // conteneur et resizeMode="cover" recadre pour occuper tout l'écran.
  return (
    <Animated.Image
      source={src}
      resizeMode="cover"
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }, style]}
    />
  )
}

// ---------------------------------------------------------------------------
// Une goutte de pluie qui tombe en boucle.
// ---------------------------------------------------------------------------
type GoutteProps = {
  gauche: number
  longueur: number
  delai: number
  duree: number
  chute: number
}

const GouttePluie = ({ gauche, longueur, delai, duree, chute }: GoutteProps) => {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withDelay(
      delai,
      withRepeat(withTiming(1, { duration: duree, easing: Easing.in(Easing.quad) }), -1, false),
    )
  }, [t, delai, duree])
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(t.value, [0, 1], [-40, chute]) }],
    opacity: interpolate(t.value, [0, 0.12, 0.85, 1], [0, 1, 1, 0]),
  }))
  return <Animated.View style={[styles.goutte, { left: gauche, height: longueur }, style]} />
}

type PluieProps = {
  progression: SharedValue<number>
  largeur: number
  hauteur: number
}

const Pluie = ({ progression, largeur, hauteur }: PluieProps) => {
  // La pluie arrive après la préparation, arrose, puis se dissipe.
  const styleGroupe = useAnimatedStyle(() => ({
    opacity: interpolate(progression.value, [0.14, 0.28, 0.58, 0.74], [0, 0.85, 0.85, 0], Extrapolation.CLAMP),
  }))
  const gouttes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        gauche: (i / 18) * largeur + (i % 3) * 9,
        longueur: 12 + (i % 4) * 4,
        delai: i * 80,
        duree: 850 + (i % 5) * 110,
        chute: hauteur,
      })),
    [largeur, hauteur],
  )
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styleGroupe]}>
      {gouttes.map((g, i) => (
        <GouttePluie key={`g${i}`} {...g} />
      ))}
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

// ---------------------------------------------------------------------------
// Décor animé bâti sur les vraies photos du champ : le sol préparé reçoit la
// pluie puis les cultures lèvent et verdissent. Un léger zoom continu (Ken
// Burns) garde l'image vivante. Réutilisé par l'intro (avec légendes) et les
// écrans d'authentification (fond, maintenu jusqu'à la connexion).
// ---------------------------------------------------------------------------
export const SceneFerme = ({ progression: progExterne, afficherLegendes = false, onFini }: Props) => {
  const { width, height } = useWindowDimensions()
  const progInterne = useSharedValue(0)
  const progression = progExterne ?? progInterne
  const respiration = useSharedValue(0)

  useEffect(() => {
    // Si aucune progression externe n'est fournie, la scène pilote la sienne.
    if (!progExterne) {
      progInterne.value = withTiming(
        1,
        { duration: DUREE_SCENE_MS, easing: Easing.inOut(Easing.cubic) },
        (fini) => {
          if (fini && onFini) runOnJS(onFini)()
        },
      )
    }
    // Respiration continue : léger zoom avant/arrière pour garder l'image vivante.
    respiration.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [progExterne, progInterne, respiration, onFini])

  // Zoom lent (Ken Burns) appliqué à toute la pile de photos.
  const styleZoom = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(respiration.value, [0, 1], [1.05, 1.12]) }],
  }))

  return (
    <View style={styles.conteneur} pointerEvents="none">
      {/* Pile de photos qui se fondent du champ préparé aux cultures luxuriantes */}
      <Animated.View style={[StyleSheet.absoluteFill, styleZoom]}>
        {ETAPES.map((e, i) => (
          <CoucheChamp key={`c${i}`} progression={progression} {...e} />
        ))}
      </Animated.View>

      {/* Voile dégradé en bas : lisibilité des textes par-dessus la photo */}
      <LinearGradient
        colors={['transparent', 'rgba(20,28,14,0.15)', 'rgba(20,28,14,0.55)']}
        style={styles.voile}
        pointerEvents="none"
      />

      {/* Pluie qui tombe puis se dissipe */}
      <Pluie progression={progression} largeur={width} hauteur={height} />

      {/* Légendes d'étape (intro uniquement) */}
      {afficherLegendes ? (
        <View style={styles.zoneLegende} pointerEvents="none">
          <LegendeEtape progression={progression} texte="La terre, préparée" debut={0} fin={0.3} />
          <LegendeEtape progression={progression} texte="Les cultures grandissent" debut={0.34} fin={0.62} />
          <LegendeEtape progression={progression} texte="Une terre nourricière" debut={0.66} fin={1.01} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  conteneur: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: COULEURS_TOKEN.soil,
  },
  voile: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  goutte: {
    position: 'absolute',
    top: 0,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(214,232,240,0.85)',
  },
  zoneLegende: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legende: {
    position: 'absolute',
    fontFamily: POLICES.serifItalique,
    fontSize: 24,
    color: COULEURS_TOKEN.cream,
    textAlign: 'center',
    paddingHorizontal: ESPACEMENTS.xl,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
})
