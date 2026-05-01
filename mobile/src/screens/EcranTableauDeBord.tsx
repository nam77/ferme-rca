import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useDashboard } from '../hooks/useDashboard'
import { useLots } from '../hooks/useLots'
import { CarteKPI } from '../components/CarteKPI'
import { GraphiqueBarresFiliere } from '../components/GraphiqueBarresFiliere'
import { BarreProgression } from '../components/BarreProgression'
import { LigneEcheance } from '../components/LigneEcheance'
import {
  COULEURS,
  COULEURS_FILIERES,
  COULEURS_STATUTS,
  ICONES_FILIERES,
  LIBELLES_STATUTS,
  type Filiere,
} from '../constants/couleurs'
import {
  ESPECES_ORDRE,
  FILIERE_PAR_ESPECE,
  ICONES_ESPECES,
  LIBELLES_ESPECES,
} from '../constants/animaux'

const LIBELLES_STATUT_MOUVEMENT: Record<string, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  termine: 'Terminé',
}

const formatDateHeure = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const EcranTableauDeBord = () => {
  const router = useRouter()
  const { dashboard, enChargement, erreur, recharger } = useDashboard()
  const { lots } = useLots()

  const cheptelParEspece = ESPECES_ORDRE.map((e) => ({
    espece: e,
    total: lots.filter((l) => l.espece === e).reduce((acc, l) => acc + l.effectif, 0),
  })).filter((g) => g.total > 0 || lots.some((l) => l.espece === g.espece))
  const totalCheptel = lots.reduce((acc, l) => acc + l.effectif, 0)

  if (enChargement && !dashboard) {
    return (
      <View style={styles.chargement}>
        <ActivityIndicator size="large" color={COULEURS.vert} />
      </View>
    )
  }

  if (erreur && !dashboard) {
    return (
      <SafeAreaView style={styles.conteneur}>
        <View style={styles.entete}>
          <Pressable onPress={() => router.back()} style={styles.retour} hitSlop={10}>
            <Text style={styles.retourTexte}>‹</Text>
          </Pressable>
          <Text style={styles.titre}>Tableau de bord</Text>
          <View style={styles.retour} />
        </View>
        <View style={styles.erreurBloc}>
          <Text style={styles.erreurTexte}>{erreur}</Text>
          <Pressable
            onPress={recharger}
            style={({ pressed }) => [styles.boutonReessayer, pressed && styles.boutonPresse]}
          >
            <Text style={styles.boutonReessayerTexte}>Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  if (!dashboard) return null

  return (
    <SafeAreaView style={styles.conteneur} edges={['top', 'left', 'right']}>
      <View style={styles.entete}>
        <Pressable
          onPress={() => router.back()}
          style={styles.retour}
          accessibilityLabel="Retour"
          accessibilityRole="button"
          hitSlop={10}
        >
          <Text style={styles.retourTexte}>‹</Text>
        </Pressable>
        <Text style={styles.titre}>Tableau de bord</Text>
        <View style={styles.retour} />
      </View>

      <ScrollView
        contentContainerStyle={styles.contenu}
        refreshControl={
          <RefreshControl refreshing={enChargement} onRefresh={recharger} tintColor={COULEURS.vert} />
        }
      >
        <View style={styles.carteProgression}>
          <BarreProgression
            pourcentage={dashboard.progressionGlobale}
            label="Progression globale"
            couleur={COULEURS.vert}
          />
          <Text style={styles.sousProgression}>
            {dashboard.tachesTerminees} tâche{dashboard.tachesTerminees > 1 ? 's' : ''} terminée
            {dashboard.tachesTerminees > 1 ? 's' : ''} sur {dashboard.totalTaches}
          </Text>
        </View>

        <View style={styles.grilleKPI}>
          <CarteKPI
            icone="📋"
            valeur={dashboard.tachesParStatut.a_faire}
            label="À faire"
            couleur={COULEURS_STATUTS.a_faire}
          />
          <CarteKPI
            icone="⚙️"
            valeur={dashboard.tachesParStatut.en_cours}
            label="En cours"
            couleur={COULEURS_STATUTS.en_cours}
          />
          <CarteKPI
            icone="✅"
            valeur={dashboard.tachesParStatut.termine}
            label="Terminé"
            couleur={COULEURS_STATUTS.termine}
          />
        </View>

        <View style={styles.grilleKPI}>
          <CarteKPI
            icone="🚨"
            valeur={dashboard.tachesEnRetard}
            label="En retard"
            couleur={dashboard.tachesEnRetard > 0 ? COULEURS.rouge : COULEURS.texteSecondaire}
            sousTexte={dashboard.tachesEnRetard === 0 ? 'tout est à jour' : 'à traiter en priorité'}
          />
          <CarteKPI
            icone="🔥"
            valeur={dashboard.tachesParPriorite.haute}
            label="Priorité haute"
            couleur="#e74c3c"
          />
          <CarteKPI
            icone="📊"
            valeur={dashboard.totalTaches}
            label="Total"
            couleur={COULEURS.vert}
          />
        </View>

        {cheptelParEspece.length > 0 ? (
          <View style={styles.bloc}>
            <Pressable
              onPress={() => router.push('/cheptel' as never)}
              accessibilityLabel="Voir le cheptel détaillé"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cheptelEntete,
                pressed && styles.cheptelEntetePressee,
              ]}
            >
              <Text style={styles.section}>Cheptel · {totalCheptel} animaux</Text>
              <Text style={styles.cheptelFleche}>›</Text>
            </Pressable>
            <View style={styles.cheptelGrille}>
              {cheptelParEspece.map((g) => {
                const couleur = COULEURS_FILIERES[FILIERE_PAR_ESPECE[g.espece]]
                return (
                  <View key={g.espece} style={[styles.cheptelKPI, { borderTopColor: couleur }]}>
                    <Text style={styles.cheptelIcone}>{ICONES_ESPECES[g.espece]}</Text>
                    <Text style={[styles.cheptelValeur, { color: couleur }]}>{g.total}</Text>
                    <Text style={styles.cheptelLibelle}>{LIBELLES_ESPECES[g.espece]}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.bloc}>
          <Text style={styles.section}>Tâches par filière</Text>
          <View style={styles.carte}>
            <GraphiqueBarresFiliere donnees={dashboard.tachesParFiliere} />
          </View>
        </View>

        <View style={styles.bloc}>
          <Text style={styles.section}>Prochaines échéances</Text>
          {dashboard.prochainesEcheances.length === 0 ? (
            <View style={styles.carte}>
              <Text style={styles.vide}>Aucune échéance à venir 🎉</Text>
            </View>
          ) : (
            dashboard.prochainesEcheances.map((t) => <LigneEcheance key={t.id} tache={t} />)
          )}
        </View>

        <View style={styles.bloc}>
          <Text style={styles.section}>Activité récente</Text>
          {dashboard.derniersMouvements.length === 0 ? (
            <View style={styles.carte}>
              <Text style={styles.vide}>Aucun mouvement enregistré pour le moment.</Text>
            </View>
          ) : (
            dashboard.derniersMouvements.map((m) => {
              const couleur = m.tache
                ? COULEURS_FILIERES[m.tache.filiere as Filiere]
                : COULEURS.texteSecondaire
              const icone = m.tache ? ICONES_FILIERES[m.tache.filiere as Filiere] : '•'
              return (
                <View key={m.id} style={[styles.mouvement, { borderLeftColor: couleur }]}>
                  <Text style={styles.mouvementIcone}>{icone}</Text>
                  <View style={styles.mouvementBloc}>
                    <Text style={styles.mouvementTitre} numberOfLines={2}>
                      {m.tache?.titre ?? '(tâche supprimée)'}
                    </Text>
                    <Text style={styles.mouvementDetail}>
                      {LIBELLES_STATUT_MOUVEMENT[m.ancienStatut]} → {LIBELLES_STATUT_MOUVEMENT[m.nouveauStatut]}
                      {m.auteur ? ` · ${m.auteur.prenom} ${m.auteur.nom}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.mouvementDate}>{formatDateHeure(m.creeLe)}</Text>
                </View>
              )
            })
          )}
        </View>

        <Text style={styles.genere}>
          Généré le {formatDateHeure(dashboard.genereLe)}
        </Text>
      </ScrollView>
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
  contenu: { padding: 16, paddingBottom: 40 },
  carteProgression: {
    backgroundColor: COULEURS.carte,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
  },
  sousProgression: {
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    marginTop: 8,
  },
  grilleKPI: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  bloc: { marginTop: 12 },
  section: {
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  carte: {
    backgroundColor: COULEURS.carte,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
  },
  vide: { fontSize: 13, color: COULEURS.texteSecondaire, fontStyle: 'italic', textAlign: 'center' },
  mouvement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COULEURS.carte,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COULEURS.bordure,
    borderRightColor: COULEURS.bordure,
    borderBottomColor: COULEURS.bordure,
  },
  mouvementIcone: { fontSize: 20 },
  mouvementBloc: { flex: 1 },
  mouvementTitre: { fontSize: 13, color: COULEURS.texte, fontWeight: '600' },
  mouvementDetail: { fontSize: 11, color: COULEURS.texteSecondaire, marginTop: 2 },
  mouvementDate: { fontSize: 10, color: COULEURS.texteSecondaire, fontStyle: 'italic' },
  genere: {
    textAlign: 'center',
    fontSize: 11,
    color: COULEURS.texteSecondaire,
    marginTop: 18,
    fontStyle: 'italic',
  },
  erreurBloc: { padding: 24, alignItems: 'center' },
  erreurTexte: { color: COULEURS.rouge, fontSize: 15, marginBottom: 16, textAlign: 'center' },
  boutonReessayer: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: COULEURS.vert,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boutonPresse: { opacity: 0.85 },
  boutonReessayerTexte: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cheptelEntete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cheptelEntetePressee: { opacity: 0.7 },
  cheptelFleche: {
    fontSize: 22,
    color: COULEURS.texteSecondaire,
    lineHeight: 24,
  },
  cheptelGrille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cheptelKPI: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 90,
    backgroundColor: COULEURS.carte,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 3,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: COULEURS.bordure,
    borderLeftColor: COULEURS.bordure,
    borderRightColor: COULEURS.bordure,
  },
  cheptelIcone: { fontSize: 18, marginBottom: 2 },
  cheptelValeur: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  cheptelLibelle: {
    fontSize: 10,
    color: COULEURS.texteSecondaire,
    textAlign: 'center',
  },
})