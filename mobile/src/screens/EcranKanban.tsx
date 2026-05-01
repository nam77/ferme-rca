import { useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../store/authStore'
import { useTaches } from '../hooks/useTaches'
import { MenuActionsTache } from '../components/MenuActionsTache'
import { ModalCreationTache } from '../components/ModalCreationTache'
import { ZoneKanbanDnd } from '../components/dnd/ZoneKanbanDnd'
import {
  COULEURS,
  COULEURS_FILIERES,
  ICONES_FILIERES,
  LIBELLES_FILIERES,
  type Filiere as FiliereCouleur,
} from '../constants/couleurs'
import type { Filiere } from '../types/auth.types'
import type { Tache } from '../types/tache.types'

const FILIERES_TOUTES: (Filiere | 'tous')[] = [
  'tous',
  'pisciculture',
  'aviculture',
  'porcins',
  'caprins',
  'cultures',
  'infrastructure',
]

export const EcranKanban = () => {
  const utilisateur = useAuthStore((s) => s.utilisateur)
  const router = useRouter()
  const { taches, enChargement, erreur, recharger, deplacer, ajouter, supprimer, enSynchronisation } =
    useTaches()

  const [filtre, setFiltre] = useState<Filiere | 'tous'>('tous')
  const [tacheSelectionnee, setTacheSelectionnee] = useState<Tache | null>(null)
  const [modalCreationOuverte, setModalCreationOuverte] = useState(false)

  const peutCreer = utilisateur ? utilisateur.role !== 'investisseur' : false
  const peutSupprimer = utilisateur
    ? utilisateur.role === 'admin' || utilisateur.role === 'responsable'
    : false

  const filiereForcee = utilisateur?.role === 'responsable' ? utilisateur.filiere : null

  const tachesFiltrees = useMemo(() => {
    if (filtre === 'tous') return taches
    return taches.filter((t) => t.filiere === filtre)
  }, [taches, filtre])

  if (enChargement && taches.length === 0) {
    return (
      <View style={styles.chargement}>
        <ActivityIndicator size="large" color={COULEURS.vert} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.conteneur} edges={['top', 'left', 'right']}>
      <View style={styles.entete}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Retour"
          accessibilityRole="button"
          hitSlop={10}
          style={styles.retour}
        >
          <Text style={styles.retourTexte}>‹</Text>
        </Pressable>
        <Text style={styles.titre}>Kanban des tâches</Text>
        <View style={styles.actionsEntete}>
          <Pressable
            onPress={recharger}
            accessibilityLabel="Actualiser"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.boutonRefresh,
              pressed && styles.boutonAjoutPresse,
            ]}
          >
            <Text style={styles.boutonRefreshTexte}>↻</Text>
          </Pressable>
          {peutCreer ? (
            <Pressable
              onPress={() => setModalCreationOuverte(true)}
              accessibilityLabel="Créer une tâche"
              accessibilityRole="button"
              style={({ pressed }) => [styles.boutonAjout, pressed && styles.boutonAjoutPresse]}
            >
              <Text style={styles.boutonAjoutTexte}>+</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtres}
      >
        {FILIERES_TOUTES.map((f) => {
          const actif = filtre === f
          const couleur = f === 'tous' ? COULEURS.vert : COULEURS_FILIERES[f as FiliereCouleur]
          const libelle = f === 'tous' ? 'Tout' : LIBELLES_FILIERES[f as FiliereCouleur]
          const icone = f === 'tous' ? '🌍' : ICONES_FILIERES[f as FiliereCouleur]
          return (
            <Pressable
              key={f}
              onPress={() => setFiltre(f)}
              accessibilityLabel={`Filtrer ${libelle}`}
              accessibilityRole="button"
              style={[
                styles.filtre,
                { borderColor: couleur },
                actif && { backgroundColor: couleur },
              ]}
            >
              <Text style={styles.filtreIcone}>{icone}</Text>
              <Text style={[styles.filtreTexte, actif && styles.filtreTexteActif]}>
                {libelle}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {erreur ? (
        <View style={styles.bandeauErreur}>
          <Text style={styles.bandeauErreurTexte}>{erreur}</Text>
        </View>
      ) : null}

      {enSynchronisation ? (
        <View style={styles.bandeauSync}>
          <Text style={styles.bandeauSyncTexte}>Synchronisation des actions hors ligne…</Text>
        </View>
      ) : null}

      <ZoneKanbanDnd
        taches={tachesFiltrees}
        onTachePress={setTacheSelectionnee}
        onDeplacer={deplacer}
      />

      <MenuActionsTache
        tache={tacheSelectionnee}
        visible={tacheSelectionnee !== null}
        onFermer={() => setTacheSelectionnee(null)}
        onChangerStatut={(s) => {
          if (tacheSelectionnee) deplacer(tacheSelectionnee.id, s)
        }}
        onSupprimer={() => {
          if (tacheSelectionnee) supprimer(tacheSelectionnee.id)
        }}
        peutSupprimer={peutSupprimer}
      />

      <ModalCreationTache
        visible={modalCreationOuverte}
        filiereForcee={filiereForcee ?? undefined}
        onFermer={() => setModalCreationOuverte(false)}
        onCreer={async (entree) => {
          await ajouter(entree)
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS.fond },
  chargement: {
    flex: 1,
    backgroundColor: COULEURS.fond,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.bordure,
  },
  retour: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retourTexte: { fontSize: 28, color: COULEURS.texte, lineHeight: 30 },
  titre: { fontSize: 18, fontWeight: '700', color: COULEURS.texte },
  boutonAjout: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COULEURS.vert,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boutonAjoutPresse: { opacity: 0.85 },
  boutonAjoutTexte: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  actionsEntete: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boutonRefresh: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boutonRefreshTexte: { color: COULEURS.texte, fontSize: 22, lineHeight: 24, fontWeight: '600' },
  filtres: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filtre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: COULEURS.carte,
    minHeight: 36,
  },
  filtreIcone: { fontSize: 14 },
  filtreTexte: { fontSize: 13, fontWeight: '600', color: COULEURS.texte },
  filtreTexteActif: { color: '#fff' },
  bandeauErreur: {
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
    padding: 10,
  },
  bandeauErreurTexte: { color: COULEURS.rouge, fontSize: 13, textAlign: 'center' },
  bandeauSync: {
    backgroundColor: 'rgba(26,107,138,0.12)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(26,107,138,0.3)',
    padding: 8,
  },
  bandeauSyncTexte: { color: '#1a6b8a', fontSize: 12, textAlign: 'center', fontWeight: '600' },
})
