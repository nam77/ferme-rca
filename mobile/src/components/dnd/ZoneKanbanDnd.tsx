// Implémentation web (par défaut) — drag-and-drop via @dnd-kit/core
// La version native est dans ZoneKanbanDnd.native.tsx (sélectionnée auto par Metro).

import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CarteTacheIso } from '../CarteTacheIso'
import {
  COULEURS_STATUTS,
  LIBELLES_STATUTS,
} from '../../constants/couleurs'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../../constants/theme'
import type { Statut, Tache } from '../../types/tache.types'
import { ICONES_STATUT, STATUTS_ORDRE, type ProprietesZoneKanban } from './types'

type ProprietesCarteDraggable = {
  tache: Tache
  onPress: () => void
}

const CarteDraggable = ({ tache, onPress }: ProprietesCarteDraggable) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tache.id,
  })

  const styleWrapper = {
    opacity: isDragging ? 0.35 : 1,
    cursor: 'grab',
    touchAction: 'none',
  } as unknown as Record<string, string | number>

  return (
    <View
      ref={setNodeRef as unknown as React.Ref<View>}
      {...(attributes as object)}
      {...(listeners as object)}
      style={styleWrapper}
    >
      <CarteTacheIso tache={tache} onPress={onPress} />
    </View>
  )
}

type ProprietesColonneDroppable = {
  statut: Statut
  taches: Tache[]
  onTachePress: (t: Tache) => void
}

const ColonneDroppable = ({
  statut,
  taches,
  onTachePress,
}: ProprietesColonneDroppable) => {
  const { setNodeRef, isOver } = useDroppable({ id: statut })
  const couleur = COULEURS_STATUTS[statut]

  return (
    <View
      ref={setNodeRef as unknown as React.Ref<View>}
      style={[
        styles.colonne,
        isOver && { backgroundColor: couleur + '10', borderColor: couleur + '60' },
      ]}
    >
      <View style={styles.entete}>
        <View style={styles.entetePuce}>
          <View style={[styles.entetePuceDot, { backgroundColor: couleur }]} />
          <Text style={styles.entetTitre}>
            {LIBELLES_STATUTS[statut]}
          </Text>
        </View>
        <View style={styles.compteur}>
          <Text style={styles.compteurTexte}>{taches.length}</Text>
        </View>
      </View>
      <ScrollView
        style={styles.liste}
        contentContainerStyle={styles.listeContenu}
        showsVerticalScrollIndicator={false}
      >
        {taches.length === 0 ? (
          <View style={styles.vide}>
            <Text style={styles.videTexte}>
              {ICONES_STATUT[statut]}  Aucune tâche{'\n'}Glissez-en une ici
            </Text>
          </View>
        ) : (
          taches.map((t) => (
            <CarteDraggable
              key={t.id}
              tache={t}
              onPress={() => onTachePress(t)}
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
  const [tacheActive, setTacheActive] = useState<Tache | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const surDebutDrag = (e: DragStartEvent) => {
    const t = taches.find((x) => x.id === e.active.id)
    if (t) setTacheActive(t)
  }

  const surFinDrag = (e: DragEndEvent) => {
    setTacheActive(null)
    if (!e.over) return
    const nouveauStatut = e.over.id as Statut
    const idTache = String(e.active.id)
    const tache = taches.find((x) => x.id === idTache)
    if (tache && tache.statut !== nouveauStatut) {
      onDeplacer(idTache, nouveauStatut)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={surDebutDrag}
      onDragEnd={surFinDrag}
      onDragCancel={() => setTacheActive(null)}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={styles.zone}
        contentContainerStyle={styles.zoneContenu}
      >
        {STATUTS_ORDRE.map((statut) => (
          <ColonneDroppable
            key={statut}
            statut={statut}
            taches={taches.filter((t) => t.statut === statut)}
            onTachePress={onTachePress}
          />
        ))}
      </ScrollView>
      <DragOverlay>
        {tacheActive ? (
          <View style={styles.apercu}>
            <CarteTacheIso tache={tacheActive} />
          </View>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

const styles = StyleSheet.create({
  zone: { flex: 1 },
  zoneContenu: { padding: ESPACEMENTS.l, gap: ESPACEMENTS.m },
  colonne: {
    width: 320,
    marginRight: ESPACEMENTS.m,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: RAYONS.grand,
    overflow: 'hidden',
    minHeight: 520,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ESPACEMENTS.l,
    paddingVertical: ESPACEMENTS.m,
    backgroundColor: COULEURS_TOKEN.carte,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS_TOKEN.bordure,
  },
  entetePuce: { flexDirection: 'row', alignItems: 'center', gap: ESPACEMENTS.s },
  entetePuceDot: { width: 8, height: 8, borderRadius: 4 },
  entetTitre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 15,
    color: COULEURS_TOKEN.soil,
  },
  compteur: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(92,61,30,0.10)',
  },
  compteurTexte: {
    fontFamily: POLICES.monoMedium,
    color: COULEURS_TOKEN.earth,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  liste: { flex: 1 },
  listeContenu: { padding: ESPACEMENTS.m, paddingBottom: ESPACEMENTS.xl },
  vide: { padding: ESPACEMENTS.xl, alignItems: 'center' },
  videTexte: {
    fontFamily: POLICES.sans,
    fontSize: 12.5,
    color: COULEURS_TOKEN.clay,
    textAlign: 'center',
    lineHeight: 18,
  },
  apercu: {
    width: 300,
    opacity: 0.95,
    transform: [{ rotate: '2deg' }],
  },
})
