import { useState } from 'react'
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
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useLot } from '../hooks/useLots'
import { useAuthStore } from '../store/authStore'
import { ModalAjoutMouvement } from '../components/ModalAjoutMouvement'
import { COULEURS, COULEURS_FILIERES } from '../constants/couleurs'
import {
  FILIERE_PAR_ESPECE,
  ICONES_ESPECES,
  ICONES_SEXE,
  ICONES_TYPE_MOUVEMENT,
  LIBELLES_CATEGORIE_AGE,
  LIBELLES_ESPECES,
  LIBELLES_SEXE,
  LIBELLES_TYPE_MOUVEMENT,
  estEntree,
} from '../constants/animaux'

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatMontant = (montant: string | null): string | null => {
  if (!montant) return null
  const n = parseFloat(montant)
  if (Number.isNaN(n)) return null
  return n.toLocaleString('fr-FR') + ' XAF'
}

export const EcranDetailLot = () => {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const utilisateur = useAuthStore((s) => s.utilisateur)
  const { lot, enChargement, erreur, recharger, enregistrerMouvement } = useLot(id ?? null)
  const [modalOuverte, setModalOuverte] = useState(false)

  const peutEcrire = (() => {
    if (!utilisateur || !lot) return false
    if (utilisateur.role === 'admin') return true
    if (utilisateur.role === 'investisseur') return false
    if (utilisateur.role === 'responsable') {
      return utilisateur.filiere === FILIERE_PAR_ESPECE[lot.espece]
    }
    return false
  })()

  if (enChargement && !lot) {
    return (
      <View style={styles.chargement}>
        <ActivityIndicator size="large" color={COULEURS.vert} />
      </View>
    )
  }

  if (!lot) {
    return (
      <SafeAreaView style={styles.conteneur} edges={['top']}>
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
          <Text style={styles.titreEntete}>Lot introuvable</Text>
          <View style={styles.placeholderBouton} />
        </View>
        {erreur ? (
          <View style={styles.bandeauErreur}>
            <Text style={styles.bandeauErreurTexte}>{erreur}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    )
  }

  const couleur = COULEURS_FILIERES[FILIERE_PAR_ESPECE[lot.espece]]

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
        <Text style={styles.titreEntete} numberOfLines={1}>{lot.nom}</Text>
        {peutEcrire ? (
          <Pressable
            onPress={() => setModalOuverte(true)}
            accessibilityLabel="Nouveau mouvement"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.boutonAjout,
              { backgroundColor: couleur },
              pressed && styles.boutonPresse,
            ]}
          >
            <Text style={styles.boutonAjoutTexte}>+</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholderBouton} />
        )}
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
        <View style={[styles.bandeauTete, { backgroundColor: couleur + '15', borderLeftColor: couleur }]}>
          <Text style={styles.iconeEspece}>{ICONES_ESPECES[lot.espece]}</Text>
          <View style={styles.bandeauTeteTexte}>
            <Text style={styles.bandeauTeteEspece}>{LIBELLES_ESPECES[lot.espece]}</Text>
            <View style={styles.bandeauTeteMeta}>
              {lot.sexe ? (
                <Text style={styles.bandeauTeteMetaTexte}>
                  {ICONES_SEXE[lot.sexe]} {LIBELLES_SEXE[lot.sexe]}
                </Text>
              ) : null}
              <Text style={styles.bandeauTeteMetaTexte}>· {LIBELLES_CATEGORIE_AGE[lot.categorieAge]}</Text>
              {lot.zone ? (
                <Text style={styles.bandeauTeteMetaTexte}>· 📍 {lot.zone.nom}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.kpiBloc}>
          <Text style={[styles.kpiValeur, { color: couleur }]}>{lot.effectif}</Text>
          <Text style={styles.kpiLabel}>animaux dans le lot</Text>
          {lot.nombreMouvements > 0 ? (
            <Text style={styles.kpiSousLabel}>
              {lot.nombreMouvements} mouvement{lot.nombreMouvements > 1 ? 's' : ''} enregistré{lot.nombreMouvements > 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>

        {lot.notes ? (
          <View style={styles.notesBloc}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesTexte}>{lot.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>Historique des mouvements</Text>
        {lot.mouvements.length === 0 ? (
          <View style={styles.vide}>
            <Text style={styles.videTexte}>
              Aucun mouvement enregistré.
              {peutEcrire ? '\nCommencez par un achat ou une naissance.' : ''}
            </Text>
          </View>
        ) : (
          lot.mouvements.map((m) => {
            const entree = estEntree(m.type)
            const couleurMvt = entree ? COULEURS.vert : COULEURS.rouge
            const montantFormate = formatMontant(m.coutTotal)
            return (
              <View key={m.id} style={[styles.ligneMvt, { borderLeftColor: couleurMvt }]}>
                <View style={styles.ligneMvtIcone}>
                  <Text style={styles.ligneMvtIconeTexte}>{ICONES_TYPE_MOUVEMENT[m.type]}</Text>
                </View>
                <View style={styles.ligneMvtContenu}>
                  <View style={styles.ligneMvtTete}>
                    <Text style={styles.ligneMvtType}>
                      {LIBELLES_TYPE_MOUVEMENT[m.type]}
                    </Text>
                    <Text style={[styles.ligneMvtDelta, { color: couleurMvt }]}>
                      {entree ? '+' : '−'}{m.quantite}
                    </Text>
                  </View>
                  <Text style={styles.ligneMvtDate}>{formatDate(m.dateMouvement)}</Text>
                  {m.motif ? (
                    <Text style={styles.ligneMvtMotif}>{m.motif}</Text>
                  ) : null}
                  <View style={styles.ligneMvtPied}>
                    {montantFormate ? (
                      <Text style={styles.ligneMvtMontant}>{montantFormate}</Text>
                    ) : null}
                    {m.auteur ? (
                      <Text style={styles.ligneMvtAuteur}>
                        par {m.auteur.prenom} {m.auteur.nom.charAt(0)}.
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      <ModalAjoutMouvement
        visible={modalOuverte}
        effectifCourant={lot.effectif}
        onFermer={() => setModalOuverte(false)}
        onEnregistrer={enregistrerMouvement}
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
  titreEntete: { flex: 1, fontSize: 17, fontWeight: '700', color: COULEURS.texte },
  placeholderBouton: { width: 40 },
  boutonAjout: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boutonAjoutTexte: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  boutonPresse: { opacity: 0.85 },
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
  bandeauTete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  iconeEspece: { fontSize: 36 },
  bandeauTeteTexte: { flex: 1 },
  bandeauTeteEspece: {
    fontSize: 11,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bandeauTeteMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  bandeauTeteMetaTexte: { fontSize: 13, color: COULEURS.texte },
  kpiBloc: {
    backgroundColor: COULEURS.carte,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    marginBottom: 16,
  },
  kpiValeur: { fontSize: 56, fontWeight: '700', lineHeight: 60 },
  kpiLabel: { fontSize: 14, color: COULEURS.texteSecondaire, marginTop: 4 },
  kpiSousLabel: { fontSize: 12, color: COULEURS.texteSecondaire, marginTop: 4, fontStyle: 'italic' },
  notesBloc: {
    backgroundColor: COULEURS.carte,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 11,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesTexte: { fontSize: 14, color: COULEURS.texte, lineHeight: 20 },
  section: {
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  vide: { padding: 30, alignItems: 'center' },
  videTexte: {
    fontSize: 13,
    color: COULEURS.texteSecondaire,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  ligneMvt: {
    flexDirection: 'row',
    backgroundColor: COULEURS.carte,
    borderLeftWidth: 4,
    borderRadius: 10,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COULEURS.bordure,
    borderRightColor: COULEURS.bordure,
    borderBottomColor: COULEURS.bordure,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  ligneMvtIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COULEURS.fond,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ligneMvtIconeTexte: { fontSize: 18 },
  ligneMvtContenu: { flex: 1 },
  ligneMvtTete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ligneMvtType: { fontSize: 14, fontWeight: '700', color: COULEURS.texte },
  ligneMvtDelta: { fontSize: 16, fontWeight: '700' },
  ligneMvtDate: { fontSize: 12, color: COULEURS.texteSecondaire, marginTop: 2 },
  ligneMvtMotif: { fontSize: 13, color: COULEURS.texte, marginTop: 4 },
  ligneMvtPied: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  ligneMvtMontant: { fontSize: 12, color: COULEURS.texte, fontWeight: '600' },
  ligneMvtAuteur: { fontSize: 11, color: COULEURS.texteSecondaire, fontStyle: 'italic' },
})
