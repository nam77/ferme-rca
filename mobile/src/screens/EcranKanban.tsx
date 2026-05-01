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
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../store/authStore'
import { useTaches } from '../hooks/useTaches'
import { MenuActionsTache } from '../components/MenuActionsTache'
import { ModalCreationTache } from '../components/ModalCreationTache'
import { ZoneKanbanDnd } from '../components/dnd/ZoneKanbanDnd'
import {
  COULEURS_FILIERES,
  ICONES_FILIERES,
} from '../constants/couleurs'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../constants/theme'
import type { Filiere } from '../types/auth.types'
import type { Tache } from '../types/tache.types'

const FILIERES_TOUTES: { cle: Filiere | 'tous'; libelle: string; icone: string; couleur: string }[] = [
  { cle: 'tous', libelle: 'Tout', icone: '🌍', couleur: COULEURS_TOKEN.mint },
  { cle: 'pisciculture', libelle: 'Pisciculture', icone: ICONES_FILIERES.pisciculture, couleur: COULEURS_FILIERES.pisciculture },
  { cle: 'aviculture', libelle: 'Aviculture', icone: ICONES_FILIERES.aviculture, couleur: COULEURS_FILIERES.aviculture },
  { cle: 'porcins', libelle: 'Porcins', icone: ICONES_FILIERES.porcins, couleur: COULEURS_FILIERES.porcins },
  { cle: 'caprins', libelle: 'Caprins/Ovins', icone: ICONES_FILIERES.caprins, couleur: COULEURS_FILIERES.caprins },
  { cle: 'cultures', libelle: 'Cultures', icone: ICONES_FILIERES.cultures, couleur: COULEURS_FILIERES.cultures },
  { cle: 'infrastructure', libelle: 'Infra', icone: ICONES_FILIERES.infrastructure, couleur: COULEURS_FILIERES.infrastructure },
]

export const EcranKanban = () => {
  const utilisateur = useAuthStore((s) => s.utilisateur)
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
        <ActivityIndicator size="large" color={COULEURS_TOKEN.mint} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.conteneur} edges={['left', 'right']}>
      <View style={styles.entete}>
        <View style={styles.entetegauche}>
          <Text style={styles.numeroSection}>02 — OPÉRATIONS</Text>
          <Text style={styles.titre}>
            Kanban <Text style={styles.titreItalique}>— Tâches & opérations</Text>
          </Text>
          <Text style={styles.sousTitre}>
            Trois colonnes glisser-déposer. Filtrer par filière pour isoler une équipe.
          </Text>
        </View>

        <View style={styles.entetedroite}>
          <Pressable
            onPress={recharger}
            accessibilityLabel="Actualiser"
            accessibilityRole="button"
            style={({ pressed }) => [styles.boutonIcone, pressed && styles.boutonPresse]}
          >
            <Ionicons name="refresh" size={18} color={COULEURS_TOKEN.earth} />
          </Pressable>
          {peutCreer ? (
            <Pressable
              onPress={() => setModalCreationOuverte(true)}
              accessibilityLabel="Nouvelle tâche"
              accessibilityRole="button"
              style={({ pressed }) => [styles.boutonNouvelle, pressed && styles.boutonPresse]}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.boutonNouvelleTexte}>Nouvelle tâche</Text>
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
          const actif = filtre === f.cle
          return (
            <Pressable
              key={f.cle}
              onPress={() => setFiltre(f.cle)}
              accessibilityLabel={`Filtrer ${f.libelle}`}
              accessibilityRole="button"
              style={[
                styles.filtre,
                { borderColor: f.couleur + (actif ? 'FF' : '60') },
                actif && { backgroundColor: f.couleur },
              ]}
            >
              <Text style={styles.filtreIcone}>{f.icone}</Text>
              <Text style={[styles.filtreTexte, actif ? styles.filtreTexteActif : { color: f.couleur }]}>
                {f.libelle}
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
  conteneur: { flex: 1, backgroundColor: COULEURS_TOKEN.cream },
  chargement: {
    flex: 1,
    backgroundColor: COULEURS_TOKEN.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: ESPACEMENTS.xl,
    paddingTop: ESPACEMENTS.l,
    paddingBottom: ESPACEMENTS.m,
    gap: ESPACEMENTS.l,
    flexWrap: 'wrap',
  },
  entetegauche: { flex: 1, minWidth: 280 },
  entetedroite: { flexDirection: 'row', gap: ESPACEMENTS.s, alignItems: 'center' },
  numeroSection: {
    fontFamily: POLICES.mono,
    fontSize: 11,
    color: COULEURS_TOKEN.mint,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  titre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 28,
    color: COULEURS_TOKEN.soil,
    lineHeight: 34,
  },
  titreItalique: {
    fontFamily: POLICES.serifItalique,
    color: COULEURS_TOKEN.clay,
    fontSize: 24,
  },
  sousTitre: {
    fontFamily: POLICES.sans,
    fontSize: 13,
    color: COULEURS_TOKEN.earth,
    marginTop: 4,
  },
  boutonIcone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(92,61,30,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
  },
  boutonNouvelle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COULEURS_TOKEN.mint,
    paddingHorizontal: ESPACEMENTS.l,
    height: 40,
    borderRadius: RAYONS.moyen,
  },
  boutonNouvelleTexte: {
    color: '#fff',
    fontFamily: POLICES.sansMedium,
    fontSize: 14,
  },
  boutonPresse: { opacity: 0.85 },
  filtres: {
    paddingHorizontal: ESPACEMENTS.xl,
    paddingVertical: ESPACEMENTS.m,
    gap: ESPACEMENTS.s,
  },
  filtre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: ESPACEMENTS.m,
    paddingVertical: 8,
    borderRadius: RAYONS.pastille,
    borderWidth: 1.5,
    backgroundColor: COULEURS_TOKEN.carte,
    minHeight: 36,
  },
  filtreIcone: { fontSize: 14 },
  filtreTexte: {
    fontFamily: POLICES.monoMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  filtreTexteActif: { color: '#fff' },
  bandeauErreur: {
    backgroundColor: 'rgba(231,76,60,0.10)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(231,76,60,0.30)',
    padding: ESPACEMENTS.s,
  },
  bandeauErreurTexte: {
    color: COULEURS_TOKEN.rouge,
    fontFamily: POLICES.sans,
    fontSize: 13,
    textAlign: 'center',
  },
  bandeauSync: {
    backgroundColor: 'rgba(26,107,138,0.10)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(26,107,138,0.25)',
    padding: ESPACEMENTS.s,
  },
  bandeauSyncTexte: {
    color: COULEURS_TOKEN.water,
    fontFamily: POLICES.mono,
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
