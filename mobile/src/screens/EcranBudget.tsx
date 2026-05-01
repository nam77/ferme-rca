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
import { useRouter } from 'expo-router'
import { useAuthStore } from '../store/authStore'
import { useBudget } from '../hooks/useBudget'
import { SectionPhase } from '../components/SectionPhase'
import { ModalEditionMontantReel } from '../components/ModalEditionMontantReel'
import { COULEURS } from '../constants/couleurs'
import type { LigneBudget, Phase } from '../types/budget.types'

const PHASES: Phase[] = ['phase_1_infrastructure', 'phase_2_lancement', 'phase_3_exploitation']

const formatMontant = (n: number): string =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })

export const EcranBudget = () => {
  const router = useRouter()
  const utilisateur = useAuthStore((s) => s.utilisateur)
  const { budget, enChargement, erreur, recharger, mettreAJour } = useBudget()
  const [ligneSelectionnee, setLigneSelectionnee] = useState<LigneBudget | null>(null)

  const peutEditer = utilisateur?.role === 'admin' || utilisateur?.role === 'responsable'

  if (enChargement && !budget) {
    return (
      <View style={styles.chargement}>
        <ActivityIndicator size="large" color={COULEURS.vert} />
      </View>
    )
  }

  if (!budget) {
    return (
      <SafeAreaView style={styles.conteneur}>
        <View style={styles.entete}>
          <Pressable onPress={() => router.back()} style={styles.retour} hitSlop={10}>
            <Text style={styles.retourTexte}>‹</Text>
          </Pressable>
          <Text style={styles.titre}>Budget</Text>
          <View style={styles.retour} />
        </View>
        <View style={styles.erreurBloc}>
          <Text style={styles.erreurTexte}>{erreur ?? 'Données indisponibles'}</Text>
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

  const enDepassement = budget.totalReel > budget.totalPrevu
  const pourcentageGlobal =
    budget.totalPrevu === 0 ? 0 : Math.round((budget.totalReel / budget.totalPrevu) * 100)

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
        <Text style={styles.titre}>Budget prévu / réel</Text>
        <View style={styles.retour} />
      </View>

      <ScrollView
        contentContainerStyle={styles.contenu}
        refreshControl={
          <RefreshControl refreshing={enChargement} onRefresh={recharger} tintColor={COULEURS.vert} />
        }
      >
        <View style={styles.totalGlobal}>
          <Text style={styles.totalLabel}>Total projet</Text>
          <View style={styles.totalLignes}>
            <View style={styles.totalBloc}>
              <Text style={styles.totalCleLabel}>Prévu</Text>
              <Text style={styles.totalValeur}>{formatMontant(budget.totalPrevu)} XAF</Text>
            </View>
            <View style={styles.totalBloc}>
              <Text style={styles.totalCleLabel}>Réel</Text>
              <Text
                style={[
                  styles.totalValeur,
                  { color: enDepassement ? COULEURS.rouge : COULEURS.vert },
                ]}
              >
                {formatMontant(budget.totalReel)} XAF
              </Text>
            </View>
            <View style={styles.totalBloc}>
              <Text style={styles.totalCleLabel}>Avancement</Text>
              <Text style={[styles.totalValeur, { color: COULEURS.vert }]}>{pourcentageGlobal}%</Text>
            </View>
          </View>
          {enDepassement ? (
            <Text style={styles.alerteDepassement}>
              ⚠️ Dépassement de {formatMontant(budget.totalReel - budget.totalPrevu)} XAF
            </Text>
          ) : null}
          {!peutEditer ? (
            <Text style={styles.lectureSeule}>👁 Lecture seule (rôle : {utilisateur?.role})</Text>
          ) : null}
        </View>

        {erreur ? (
          <View style={styles.bandeauErreur}>
            <Text style={styles.bandeauErreurTexte}>{erreur}</Text>
          </View>
        ) : null}

        {PHASES.map((phase) => (
          <SectionPhase
            key={phase}
            phase={phase}
            lignes={budget.groupes[phase]}
            totaux={budget.totalParPhase[phase]}
            editable={peutEditer}
            onLignePress={setLigneSelectionnee}
          />
        ))}
      </ScrollView>

      <ModalEditionMontantReel
        ligne={ligneSelectionnee}
        visible={ligneSelectionnee !== null}
        onFermer={() => setLigneSelectionnee(null)}
        onValider={async (montantReel) => {
          if (!ligneSelectionnee) return
          await mettreAJour(ligneSelectionnee.id, { montantReel })
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
  contenu: { padding: 16, paddingBottom: 40 },
  totalGlobal: {
    backgroundColor: COULEURS.carte,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
  },
  totalLabel: {
    fontSize: 11,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  totalLignes: { flexDirection: 'row', gap: 8 },
  totalBloc: { flex: 1 },
  totalCleLabel: { fontSize: 11, color: COULEURS.texteSecondaire, marginBottom: 2 },
  totalValeur: { fontSize: 16, fontWeight: '800', color: COULEURS.texte },
  alerteDepassement: {
    marginTop: 12,
    fontSize: 13,
    color: COULEURS.rouge,
    fontWeight: '600',
  },
  lectureSeule: {
    marginTop: 12,
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    fontStyle: 'italic',
  },
  bandeauErreur: {
    backgroundColor: 'rgba(231,76,60,0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
  },
  bandeauErreurTexte: { color: COULEURS.rouge, fontSize: 13, textAlign: 'center' },
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
})
