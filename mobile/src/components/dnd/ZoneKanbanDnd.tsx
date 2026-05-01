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
import { CarteTache } from '../CarteTache'
import {
  COULEURS,
  COULEURS_STATUTS,
  LIBELLES_STATUTS,
} from '../../constants/couleurs'
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
      <CarteTache tache={tache} onPress={onPress} />
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
        isOver && { backgroundColor: couleur + '15', borderColor: couleur },
      ]}
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
      >
        {taches.length === 0 ? (
          <View style={styles.vide}>
            <Text style={styles.videTexte}>Aucune tâche — glissez-en ici</Text>
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
            <CarteTache tache={tacheActive} />
          </View>
        ) : null}
      </DragOverlay>
    </DndContext>
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
    borderWidth: 2,
    borderColor: 'transparent',
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
  apercu: {
    width: 320,
    opacity: 0.95,
    transform: [{ rotate: '2deg' }],
  },
})
