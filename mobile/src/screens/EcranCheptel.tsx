import { useMemo } from 'react'
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
import { useLots } from '../hooks/useLots'
import { CarteLot } from '../components/CarteLot'
import { COULEURS, COULEURS_FILIERES } from '../constants/couleurs'
import {
  ESPECES_ORDRE,
  FILIERE_PAR_ESPECE,
  ICONES_ESPECES,
  LIBELLES_ESPECES,
} from '../constants/animaux'
import type { LotResume } from '../types/lot.types'
import type { Espece } from '../types/lot.types'

type GroupeEspece = {
  espece: Espece
  lots: LotResume[]
  totalEffectif: number
}

export const EcranCheptel = () => {
  const router = useRouter()
  const { lots, enChargement, erreur, recharger } = useLots()

  const groupes: GroupeEspece[] = useMemo(() => {
    return ESPECES_ORDRE.map((espece) => {
      const lotsEspece = lots.filter((l) => l.espece === espece)
      return {
        espece,
        lots: lotsEspece,
        totalEffectif: lotsEspece.reduce((acc, l) => acc + l.effectif, 0),
      }
    }).filter((g) => g.lots.length > 0)
  }, [lots])

  const totalGlobal = useMemo(
    () => lots.reduce((acc, l) => acc + l.effectif, 0),
    [lots],
  )

  if (enChargement && lots.length === 0) {
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
        <View style={styles.titreBloc}>
          <Text style={styles.titre}>Cheptel</Text>
          <Text style={styles.sousTitre}>
            {totalGlobal} animal{totalGlobal > 1 ? 'aux' : ''} sur {lots.length} lot{lots.length > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.placeholderBouton} />
      </View>

      {erreur ? (
        <View style={styles.bandeauErreur}>
          <Text style={styles.bandeauErreurTexte}>{erreur}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.contenu}
        contentContainerStyle={styles.contenuInterne}
        refreshControl={
          <RefreshControl refreshing={enChargement} onRefresh={recharger} tintColor={COULEURS.vert} />
        }
      >
        <View style={styles.kpiLigne}>
          {groupes.map((g) => {
            const couleur = COULEURS_FILIERES[FILIERE_PAR_ESPECE[g.espece]]
            return (
              <View key={g.espece} style={[styles.kpi, { borderTopColor: couleur }]}>
                <Text style={styles.kpiIcone}>{ICONES_ESPECES[g.espece]}</Text>
                <Text style={[styles.kpiValeur, { color: couleur }]}>{g.totalEffectif}</Text>
                <Text style={styles.kpiLibelle}>{LIBELLES_ESPECES[g.espece]}</Text>
              </View>
            )
          })}
        </View>

        {groupes.map((g) => {
          const couleur = COULEURS_FILIERES[FILIERE_PAR_ESPECE[g.espece]]
          return (
            <View key={g.espece} style={styles.groupe}>
              <View style={styles.groupeEntete}>
                <Text style={[styles.groupeTitre, { color: couleur }]}>
                  {ICONES_ESPECES[g.espece]} {LIBELLES_ESPECES[g.espece]}
                </Text>
                <Text style={styles.groupeMeta}>
                  {g.lots.length} lot{g.lots.length > 1 ? 's' : ''} · {g.totalEffectif} tête{g.totalEffectif > 1 ? 's' : ''}
                </Text>
              </View>
              {g.lots.map((lot) => (
                <CarteLot
                  key={lot.id}
                  lot={lot}
                  onPress={() => router.push(`/cheptel/${lot.id}` as never)}
                />
              ))}
            </View>
          )
        })}

        {groupes.length === 0 && !enChargement ? (
          <View style={styles.vide}>
            <Text style={styles.videTexte}>Aucun lot enregistré.</Text>
          </View>
        ) : null}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.bordure,
    gap: 8,
  },
  retour: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retourTexte: { fontSize: 28, color: COULEURS.texte, lineHeight: 30 },
  titreBloc: { flex: 1 },
  titre: { fontSize: 18, fontWeight: '700', color: COULEURS.texte },
  sousTitre: { fontSize: 12, color: COULEURS.texteSecondaire, marginTop: 2 },
  placeholderBouton: { width: 40 },
  bandeauErreur: {
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
    padding: 10,
  },
  bandeauErreurTexte: { color: COULEURS.rouge, fontSize: 13, textAlign: 'center' },
  contenu: { flex: 1 },
  contenuInterne: { padding: 16, paddingBottom: 40 },
  kpiLigne: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  kpi: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 100,
    backgroundColor: COULEURS.carte,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: COULEURS.bordure,
    borderLeftColor: COULEURS.bordure,
    borderRightColor: COULEURS.bordure,
  },
  kpiIcone: { fontSize: 22, marginBottom: 4 },
  kpiValeur: { fontSize: 24, fontWeight: '700', lineHeight: 28 },
  kpiLibelle: {
    fontSize: 11,
    color: COULEURS.texteSecondaire,
    marginTop: 2,
    textAlign: 'center',
  },
  groupe: { marginBottom: 18 },
  groupeEntete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupeTitre: { fontSize: 15, fontWeight: '700' },
  groupeMeta: { fontSize: 12, color: COULEURS.texteSecondaire },
  vide: { padding: 40, alignItems: 'center' },
  videTexte: { fontSize: 14, color: COULEURS.texteSecondaire, fontStyle: 'italic' },
})
