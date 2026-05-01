// Implémentation native (iOS + Android) — drag-and-drop via gesture-handler + reanimated.
// Mécanique : long-press 280ms active le drag, Pan déplace la carte,
// au release on calcule la colonne survolée à partir de la position absolue.

import { useCallback, useRef } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import { CarteTacheIso } from '../CarteTacheIso'
import {
  COULEURS,
  COULEURS_STATUTS,
  LIBELLES_STATUTS,
} from '../../constants/couleurs'
import type { Statut, Tache } from '../../types/tache.types'
import { ICONES_STATUT, STATUTS_ORDRE, type ProprietesZoneKanban } from './types'

type MesureColonne = {
  statut: Statut
  x: number
  y: number
  largeur: number
  hauteur: number
}

type ReferentielMesures = {
  enregistrer: (m: MesureColonne) => void
  determiner: (px: number, py: number) => Statut | null
}

type ProprietesCarteDraggable = {
  tache: Tache
  onPress: () => void
  onDrop: (statut: Statut) => void
  determinerColonne: (x: number, y: number) => Statut | null
}

const CarteDraggableNative = ({
  tache,
  onPress,
  onDrop,
  determinerColonne,
}: ProprietesCarteDraggable) => {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const enDrag = useSharedValue(false)
  const echelle = useSharedValue(1)

  const surDrop = useCallback(
    (statut: Statut | null) => {
      if (statut && statut !== tache.statut) {
        onDrop(statut)
      }
    },
    [onDrop, tache.statut],
  )

  const longPress = Gesture.LongPress()
    .minDuration(280)
    .maxDistance(20)
    .onStart(() => {
      enDrag.value = true
      echelle.value = withSpring(1.05)
    })

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (enDrag.value) {
        translateX.value = e.translationX
        translateY.value = e.translationY
      }
    })
    .onEnd((e) => {
      if (enDrag.value) {
        const statut = determinerColonne(e.absoluteX, e.absoluteY)
        runOnJS(surDrop)(statut)
      }
      translateX.value = withSpring(0)
      translateY.value = withSpring(0)
      echelle.value = withSpring(1)
      enDrag.value = false
    })
    .onFinalize(() => {
      translateX.value = withSpring(0)
      translateY.value = withSpring(0)
      echelle.value = withSpring(1)
      enDrag.value = false
    })

  const composed = Gesture.Simultaneous(longPress, pan)

  const styleAnime = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: echelle.value },
    ],
    opacity: enDrag.value ? 0.92 : 1,
    zIndex: enDrag.value ? 50 : 1,
    elevation: enDrag.value ? 12 : 2,
  }))

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={styleAnime}>
        <CarteTacheIso tache={tache} onPress={onPress} />
      </Animated.View>
    </GestureDetector>
  )
}

type ProprietesColonneNative = {
  statut: Statut
  taches: Tache[]
  onTachePress: (t: Tache) => void
  onDeplacer: (id: string, statut: Statut) => void
  referentiel: ReferentielMesures
}

const ColonneNative = ({
  statut,
  taches,
  onTachePress,
  onDeplacer,
  referentiel,
}: ProprietesColonneNative) => {
  const couleur = COULEURS_STATUTS[statut]
  const ref = useRef<View>(null)

  const mesurer = useCallback(() => {
    const cible = ref.current
    if (!cible) return
    cible.measureInWindow((x, y, largeur, hauteur) => {
      referentiel.enregistrer({ statut, x, y, largeur, hauteur })
    })
  }, [statut, referentiel])

  return (
    <View
      ref={ref}
      onLayout={mesurer}
      collapsable={false}
      style={styles.colonne}
    >
      <View style={[styles.entete, { borderTopColor: couleur }]}>
        <Text style={styles.titre}>
          {ICONES_STATUT[statut]} {LIBELLES_STATUTS[statut]}
        </Text>
        <View style={[styles.compteur, { backgroundColor: couleur }]}>
          <Text style={styles.compteurTexte}>{taches.length}</Text>
        </View>
      </View>
      <ScrollView
        style={styles.liste}
        contentContainerStyle={styles.listeContenu}
        showsVerticalScrollIndicator={false}
        onScroll={mesurer}
        onContentSizeChange={mesurer}
        scrollEventThrottle={250}
      >
        {taches.length === 0 ? (
          <View style={styles.vide}>
            <Text style={styles.videTexte}>
              Aucune tâche — déposez-en ici
            </Text>
          </View>
        ) : (
          taches.map((t) => (
            <CarteDraggableNative
              key={t.id}
              tache={t}
              onPress={() => onTachePress(t)}
              onDrop={(s) => onDeplacer(t.id, s)}
              determinerColonne={referentiel.determiner}
            />
          ))
        )}
      </ScrollView>
    </View>
  )
}

export const ZoneKanbanDnd = ({
  taches,
  onTachePress,
  onDeplacer,
}: ProprietesZoneKanban) => {
  const mesures = useRef<Map<Statut, MesureColonne>>(new Map())

  const referentiel: ReferentielMesures = {
    enregistrer: (m) => {
      mesures.current.set(m.statut, m)
    },
    determiner: (px, py) => {
      for (const m of mesures.current.values()) {
        if (
          px >= m.x &&
          px <= m.x + m.largeur &&
          py >= m.y &&
          py <= m.y + m.hauteur
        ) {
          return m.statut
        }
      }
      return null
    },
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      style={styles.zone}
      contentContainerStyle={styles.zoneContenu}
    >
      {STATUTS_ORDRE.map((statut) => (
        <ColonneNative
          key={statut}
          statut={statut}
          taches={taches.filter((t) => t.statut === statut)}
          onTachePress={onTachePress}
          onDeplacer={onDeplacer}
          referentiel={referentiel}
        />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  zone: { flex: 1 },
  zoneContenu: { padding: 12 },
  colonne: {
    width: 320,
    marginRight: 12,
    backgroundColor: 'rgba(0,0,0,0.025)',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 480,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COULEURS.carte,
    borderTopWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.bordure,
  },
  titre: { fontSize: 16, fontWeight: '700', color: COULEURS.texte },
  compteur: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compteurTexte: { color: '#fff', fontSize: 13, fontWeight: '700' },
  liste: { flex: 1 },
  listeContenu: { padding: 10, paddingBottom: 24 },
  vide: { padding: 24, alignItems: 'center' },
  videTexte: {
    fontSize: 13,
    color: COULEURS.texteSecondaire,
    fontStyle: 'italic',
    textAlign: 'center',
  },
})
