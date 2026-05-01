import { useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTaches } from '../hooks/useTaches'
import {
  basculerSousTache,
  ajouterSousTache as ajouterSousTacheAPI,
  changerStatutTache,
} from '../api/taches.api'
import { useToastStore } from '../store/toastStore'
import {
  COULEURS_FILIERES,
  ICONES_FILIERES,
  LIBELLES_FILIERES,
  type Filiere as FiliereCouleur,
} from '../constants/couleurs'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../constants/theme'
import type { Filiere } from '../types/auth.types'
import type { Statut, SousTache, Tache } from '../types/tache.types'

const formatDateLongue = (iso: string | null): string | null => {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

const ETIQUETTES_STATUT: Record<Statut, { texte: string; fond: string; bordure: string; texteCouleur: string }> = {
  a_faire: {
    texte: 'À faire',
    fond: 'rgba(26,107,138,0.10)',
    bordure: 'rgba(26,107,138,0.35)',
    texteCouleur: COULEURS_TOKEN.water,
  },
  en_cours: {
    texte: 'En cours',
    fond: 'rgba(232,148,58,0.12)',
    bordure: 'rgba(232,148,58,0.40)',
    texteCouleur: COULEURS_TOKEN.aviculture,
  },
  termine: {
    texte: 'Bouclé',
    fond: 'rgba(74,140,63,0.10)',
    bordure: 'rgba(74,140,63,0.35)',
    texteCouleur: COULEURS_TOKEN.mint,
  },
}

type FiltreStatut = 'tous' | Statut

const STATUTS_FILTRES: { cle: FiltreStatut; libelle: string }[] = [
  { cle: 'tous', libelle: 'Tous les statuts' },
  { cle: 'a_faire', libelle: 'À faire' },
  { cle: 'en_cours', libelle: 'En cours' },
  { cle: 'termine', libelle: 'Bouclé' },
]

type FiltreFiliere = 'toutes' | Filiere

const FILIERES_FILTRES: { cle: FiltreFiliere; libelle: string }[] = [
  { cle: 'toutes', libelle: 'Toutes les filières' },
  { cle: 'pisciculture', libelle: 'Pisciculture' },
  { cle: 'aviculture', libelle: 'Aviculture' },
  { cle: 'porcins', libelle: 'Porcins' },
  { cle: 'caprins', libelle: 'Caprins/Ovins' },
  { cle: 'cultures', libelle: 'Cultures' },
  { cle: 'infrastructure', libelle: 'Infrastructure' },
  { cle: 'habitat', libelle: 'Habitat/Stock' },
]

type CarteActiviteProps = {
  tache: Tache
  onCompleter: () => void
  onBasculerSous: (sousId: string, faite: boolean) => void
}

const CarteActivite = ({ tache, onCompleter, onBasculerSous }: CarteActiviteProps) => {
  const couleurFiliere = COULEURS_FILIERES[tache.filiere as FiliereCouleur]
  const iconeFiliere = ICONES_FILIERES[tache.filiere as FiliereCouleur]
  const libelleFiliere = LIBELLES_FILIERES[tache.filiere as FiliereCouleur]
  const statutEtiq = ETIQUETTES_STATUT[tache.statut]
  const dateLongue = formatDateLongue(tache.dateLimite)
  const sousTaches: SousTache[] = tache.sousTaches ?? []
  const total = sousTaches.length
  const faites = sousTaches.filter((s) => s.faite).length

  return (
    <View style={styles.carteActivite}>
      <View style={styles.carteHaut}>
        <View
          style={[
            styles.tagFiliere,
            { backgroundColor: couleurFiliere + '15', borderColor: couleurFiliere + '60' },
          ]}
        >
          <Text style={styles.tagFiliereIcone}>{iconeFiliere}</Text>
          <Text style={[styles.tagFiliereTexte, { color: couleurFiliere }]}>
            {libelleFiliere.toUpperCase()}
          </Text>
        </View>
        <View
          style={[
            styles.tagStatut,
            { backgroundColor: statutEtiq.fond, borderColor: statutEtiq.bordure },
          ]}
        >
          <Text style={[styles.tagStatutTexte, { color: statutEtiq.texteCouleur }]}>
            {statutEtiq.texte}
          </Text>
        </View>
      </View>

      <Text style={styles.titreCarte} numberOfLines={3}>
        {tache.titre}
      </Text>

      {dateLongue ? (
        <Text style={styles.sousTitreDate}>📅 {dateLongue}</Text>
      ) : null}

      {tache.description ? (
        <Text style={styles.description}>{tache.description}</Text>
      ) : null}

      {sousTaches.length > 0 ? (
        <View style={styles.checklist}>
          <Text style={styles.checklistEntete}>
            CHECKLIST {faites}/{total}
          </Text>
          {sousTaches.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => onBasculerSous(s.id, !s.faite)}
              accessibilityLabel={`${s.faite ? 'Décocher' : 'Cocher'} : ${s.titre}`}
              accessibilityRole="checkbox"
              style={({ pressed }) => [
                styles.lignerChecklist,
                pressed && styles.lignerChecklistPressee,
              ]}
            >
              <View style={[styles.bulle, s.faite && styles.bullePleine]}>
                {s.faite ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : null}
              </View>
              <Text
                style={[
                  styles.lignerChecklistTexte,
                  s.faite && styles.lignerChecklistTexteFaite,
                ]}
              >
                {s.titre}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {tache.statut !== 'termine' ? (
        <Pressable
          onPress={onCompleter}
          accessibilityLabel="Marquer l'activité comme terminée"
          accessibilityRole="button"
          style={({ pressed }) => [styles.boutonCompleter, pressed && styles.boutonPresse]}
        >
          <Ionicons name="checkmark-circle" size={16} color="#fff" />
          <Text style={styles.boutonCompleterTexte}>Compléter activité</Text>
        </Pressable>
      ) : (
        <View style={styles.boutonBoucle}>
          <Ionicons name="checkmark-done-circle" size={16} color={COULEURS_TOKEN.mint} />
          <Text style={styles.boutonBoucleTexte}>Activité bouclée</Text>
        </View>
      )}
    </View>
  )
}

export const EcranActivite = () => {
  const { taches, enChargement, recharger } = useTaches()
  const afficherToast = useToastStore((s) => s.afficher)
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('tous')
  const [filtreFiliere, setFiltreFiliere] = useState<FiltreFiliere>('toutes')
  const [recherche, setRecherche] = useState('')

  const tachesFiltrees = useMemo(() => {
    return taches.filter((t) => {
      if (filtreStatut !== 'tous' && t.statut !== filtreStatut) return false
      if (filtreFiliere !== 'toutes' && t.filiere !== filtreFiliere) return false
      if (recherche.trim()) {
        const r = recherche.trim().toLowerCase()
        if (!t.titre.toLowerCase().includes(r) && !(t.description ?? '').toLowerCase().includes(r)) {
          return false
        }
      }
      return true
    })
  }, [taches, filtreStatut, filtreFiliere, recherche])

  const basculerSous = async (tacheId: string, sousId: string, faite: boolean) => {
    try {
      await basculerSousTache(tacheId, sousId, faite)
      await recharger()
    } catch (e) {
      afficherToast(e instanceof Error ? e.message : 'Mise à jour impossible', 'erreur')
    }
  }

  const completer = async (tache: Tache) => {
    try {
      await changerStatutTache(tache.id, 'termine')
      afficherToast('Activité bouclée.', 'succes')
      await recharger()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      afficherToast(
        err.response?.data?.message ??
          (e instanceof Error ? e.message : 'Action impossible'),
        'erreur',
      )
    }
  }

  if (enChargement && taches.length === 0) {
    return (
      <View style={styles.chargement}>
        <ActivityIndicator size="large" color={COULEURS_TOKEN.mint} />
      </View>
    )
  }

  const statutLibelle = STATUTS_FILTRES.find((s) => s.cle === filtreStatut)?.libelle ?? ''
  const filiereLibelle = FILIERES_FILTRES.find((f) => f.cle === filtreFiliere)?.libelle ?? ''

  return (
    <SafeAreaView style={styles.conteneur} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.entete}>
          <View style={styles.entetegauche}>
            <Text style={styles.titre}>
              Activités <Text style={styles.titreItalique}>— Qui fait quoi, quand, comment</Text>
            </Text>
            <Text style={styles.sousTitre}>
              Procédures détaillées par activité avec sous-tâches à cocher.
            </Text>
          </View>
        </View>

        <View style={styles.barreFiltres}>
          <View style={styles.filtreRecherche}>
            <Ionicons name="search" size={14} color={COULEURS_TOKEN.clay} />
            <TextInput
              value={recherche}
              onChangeText={setRecherche}
              placeholder="Rechercher une activité…"
              placeholderTextColor={COULEURS_TOKEN.clay}
              style={styles.filtreRechercheInput}
              accessibilityLabel="Rechercher"
            />
          </View>

          <Pressable
            onPress={() => {
              const idx = STATUTS_FILTRES.findIndex((s) => s.cle === filtreStatut)
              const next = STATUTS_FILTRES[(idx + 1) % STATUTS_FILTRES.length]
              setFiltreStatut(next.cle)
            }}
            accessibilityLabel={`Statut : ${statutLibelle}`}
            style={({ pressed }) => [styles.filtreSelect, pressed && styles.boutonPresse]}
          >
            <Ionicons name="layers-outline" size={14} color={COULEURS_TOKEN.earth} />
            <Text style={styles.filtreSelectTexte}>{statutLibelle}</Text>
            <Ionicons name="chevron-down" size={12} color={COULEURS_TOKEN.clay} />
          </Pressable>

          <Pressable
            onPress={() => {
              const idx = FILIERES_FILTRES.findIndex((f) => f.cle === filtreFiliere)
              const next = FILIERES_FILTRES[(idx + 1) % FILIERES_FILTRES.length]
              setFiltreFiliere(next.cle)
            }}
            accessibilityLabel={`Filière : ${filiereLibelle}`}
            style={({ pressed }) => [styles.filtreSelect, pressed && styles.boutonPresse]}
          >
            <Ionicons name="leaf-outline" size={14} color={COULEURS_TOKEN.earth} />
            <Text style={styles.filtreSelectTexte}>{filiereLibelle}</Text>
            <Ionicons name="chevron-down" size={12} color={COULEURS_TOKEN.clay} />
          </Pressable>
        </View>

        <Text style={styles.compteur}>
          {tachesFiltrees.length} activité{tachesFiltrees.length > 1 ? 's' : ''}
        </Text>

        <View style={styles.grille}>
          {tachesFiltrees.length === 0 ? (
            <View style={styles.vide}>
              <Text style={styles.videTexte}>Aucune activité trouvée pour ces filtres.</Text>
            </View>
          ) : (
            tachesFiltrees.map((t) => (
              <CarteActivite
                key={t.id}
                tache={t}
                onCompleter={() => completer(t)}
                onBasculerSous={(sousId, faite) => basculerSous(t.id, sousId, faite)}
              />
            ))
          )}
        </View>
      </ScrollView>
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
  contenu: { paddingBottom: ESPACEMENTS.xxl },
  entete: {
    paddingHorizontal: ESPACEMENTS.xl,
    paddingTop: ESPACEMENTS.l,
    paddingBottom: ESPACEMENTS.m,
  },
  entetegauche: { flex: 1 },
  titre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 28,
    color: COULEURS_TOKEN.soil,
    lineHeight: 34,
  },
  titreItalique: {
    fontFamily: POLICES.serifItalique,
    color: COULEURS_TOKEN.mint,
    fontSize: 24,
  },
  sousTitre: {
    fontFamily: POLICES.sans,
    fontSize: 13,
    color: COULEURS_TOKEN.earth,
    marginTop: 4,
  },
  barreFiltres: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ESPACEMENTS.xl,
    paddingVertical: ESPACEMENTS.s,
    gap: ESPACEMENTS.s,
    flexWrap: 'wrap',
  },
  filtreRecherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 220,
    flex: 1,
    paddingHorizontal: ESPACEMENTS.m,
    height: 38,
    borderRadius: RAYONS.moyen,
    backgroundColor: COULEURS_TOKEN.carte,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
  },
  filtreRechercheInput: {
    flex: 1,
    fontFamily: POLICES.sans,
    fontSize: 13,
    color: COULEURS_TOKEN.soil,
    height: 38,
  },
  filtreSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: ESPACEMENTS.m,
    height: 38,
    borderRadius: RAYONS.moyen,
    backgroundColor: COULEURS_TOKEN.carte,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
  },
  filtreSelectTexte: {
    fontFamily: POLICES.sansMedium,
    fontSize: 13,
    color: COULEURS_TOKEN.soil,
  },
  boutonPresse: { opacity: 0.85 },
  compteur: {
    fontFamily: POLICES.mono,
    fontSize: 11,
    color: COULEURS_TOKEN.clay,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: ESPACEMENTS.xl,
    marginTop: ESPACEMENTS.s,
    marginBottom: ESPACEMENTS.s,
  },
  grille: {
    paddingHorizontal: ESPACEMENTS.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACEMENTS.l,
  },
  vide: {
    flex: 1,
    paddingVertical: ESPACEMENTS.xxl,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  videTexte: {
    fontFamily: POLICES.sans,
    fontSize: 14,
    color: COULEURS_TOKEN.clay,
    fontStyle: 'italic',
  },
  carteActivite: {
    width: 380,
    minWidth: 280,
    flexGrow: 1,
    flexBasis: 320,
    backgroundColor: COULEURS_TOKEN.carte,
    borderRadius: RAYONS.grand,
    padding: ESPACEMENTS.l,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
    shadowColor: COULEURS_TOKEN.ombre,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  carteHaut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACEMENTS.s,
    marginBottom: ESPACEMENTS.m,
  },
  tagFiliere: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: ESPACEMENTS.s,
    paddingVertical: 3,
    borderRadius: RAYONS.petit,
    borderWidth: 1,
  },
  tagFiliereIcone: { fontSize: 12 },
  tagFiliereTexte: {
    fontFamily: POLICES.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  tagStatut: {
    paddingHorizontal: ESPACEMENTS.m,
    paddingVertical: 3,
    borderRadius: RAYONS.pastille,
    borderWidth: 1,
  },
  tagStatutTexte: {
    fontFamily: POLICES.monoMedium,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  titreCarte: {
    fontFamily: POLICES.serifSemi,
    fontSize: 18,
    color: COULEURS_TOKEN.soil,
    lineHeight: 24,
  },
  sousTitreDate: {
    fontFamily: POLICES.sans,
    fontSize: 12,
    color: COULEURS_TOKEN.clay,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  description: {
    fontFamily: POLICES.sans,
    fontSize: 13.5,
    color: COULEURS_TOKEN.earth,
    lineHeight: 20,
    marginTop: ESPACEMENTS.m,
  },
  checklist: {
    marginTop: ESPACEMENTS.l,
    paddingTop: ESPACEMENTS.m,
    borderTopWidth: 1,
    borderTopColor: COULEURS_TOKEN.bordure,
  },
  checklistEntete: {
    fontFamily: POLICES.mono,
    fontSize: 10,
    color: COULEURS_TOKEN.clay,
    letterSpacing: 1,
    marginBottom: ESPACEMENTS.s,
  },
  lignerChecklist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.s,
    paddingVertical: 6,
  },
  lignerChecklistPressee: { opacity: 0.7 },
  bulle: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COULEURS_TOKEN.clay,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  bullePleine: {
    backgroundColor: COULEURS_TOKEN.mint,
    borderColor: COULEURS_TOKEN.mint,
  },
  lignerChecklistTexte: {
    fontFamily: POLICES.sans,
    fontSize: 13,
    color: COULEURS_TOKEN.soil,
    flex: 1,
  },
  lignerChecklistTexteFaite: {
    color: COULEURS_TOKEN.clay,
    textDecorationLine: 'line-through',
  },
  boutonCompleter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COULEURS_TOKEN.leaf,
    height: 42,
    borderRadius: RAYONS.moyen,
    marginTop: ESPACEMENTS.l,
  },
  boutonCompleterTexte: {
    color: '#fff',
    fontFamily: POLICES.sansMedium,
    fontSize: 14,
  },
  boutonBoucle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: RAYONS.moyen,
    marginTop: ESPACEMENTS.l,
    borderWidth: 1,
    borderColor: 'rgba(74,140,63,0.30)',
    backgroundColor: 'rgba(74,140,63,0.08)',
  },
  boutonBoucleTexte: {
    color: COULEURS_TOKEN.mint,
    fontFamily: POLICES.sansMedium,
    fontSize: 14,
  },
})

void ajouterSousTacheAPI // import gardé pour usage futur (création sous-tâche)
