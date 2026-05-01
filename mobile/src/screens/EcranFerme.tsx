import { useMemo, useState } from 'react'
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
import { useZones } from '../hooks/useZones'
import { PlanFerme } from '../components/PlanFerme'
import { ModalZone } from '../components/ModalZone'
import {
  COULEURS,
  COULEURS_FILIERES,
  ICONES_FILIERES,
  LIBELLES_FILIERES,
  type Filiere as FiliereCouleur,
} from '../constants/couleurs'
import type { ZoneListe } from '../types/zone.types'

const formatSurface = (m2: number | null): string => {
  if (m2 === null) return '—'
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(1)} ha`
  return `${m2.toLocaleString('fr-FR')} m²`
}

export const EcranFerme = () => {
  const router = useRouter()
  const { zones, enChargement, erreur, recharger } = useZones()
  const [zoneSelectionnee, setZoneSelectionnee] = useState<ZoneListe | null>(null)

  const surfaceTotale = useMemo(
    () => zones.reduce((s, z) => s + (z.surface ?? 0), 0),
    [zones],
  )

  if (enChargement && zones.length === 0) {
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
          style={styles.retour}
          accessibilityLabel="Retour"
          accessibilityRole="button"
          hitSlop={10}
        >
          <Text style={styles.retourTexte}>‹</Text>
        </Pressable>
        <Text style={styles.titre}>Plan de la ferme</Text>
        <View style={styles.retour} />
      </View>

      <ScrollView
        contentContainerStyle={styles.contenu}
        refreshControl={
          <RefreshControl refreshing={enChargement} onRefresh={recharger} tintColor={COULEURS.vert} />
        }
      >
        <View style={styles.statsLigne}>
          <View style={styles.statBloc}>
            <Text style={styles.statLabel}>Surface</Text>
            <Text style={styles.statValeur}>{formatSurface(surfaceTotale)}</Text>
          </View>
          <View style={styles.statBloc}>
            <Text style={styles.statLabel}>Zones</Text>
            <Text style={styles.statValeur}>{zones.length}</Text>
          </View>
          <View style={styles.statBloc}>
            <Text style={styles.statLabel}>Filières</Text>
            <Text style={styles.statValeur}>{new Set(zones.map((z) => z.filiere)).size}</Text>
          </View>
        </View>

        {erreur ? (
          <View style={styles.bandeauErreur}>
            <Text style={styles.bandeauErreurTexte}>{erreur}</Text>
          </View>
        ) : null}

        <Text style={styles.aide}>Tapez sur une pastille pour voir le détail de la zone.</Text>

        <PlanFerme zones={zones} onZonePress={setZoneSelectionnee} />

        <Text style={styles.section}>Liste des zones</Text>
        <View style={styles.liste}>
          {zones.map((z) => {
            const couleur = COULEURS_FILIERES[z.filiere as FiliereCouleur]
            return (
              <Pressable
                key={z.id}
                onPress={() => setZoneSelectionnee(z)}
                accessibilityLabel={`Détail de ${z.nom}`}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.ligne,
                  { borderLeftColor: couleur },
                  pressed && styles.lignePressee,
                ]}
              >
                <Text style={styles.ligneIcone}>{ICONES_FILIERES[z.filiere as FiliereCouleur]}</Text>
                <View style={styles.ligneContenu}>
                  <Text style={styles.ligneTitre}>{z.nom}</Text>
                  <Text style={styles.ligneFiliere}>
                    {LIBELLES_FILIERES[z.filiere as FiliereCouleur]} · {formatSurface(z.surface)}
                  </Text>
                </View>
                <Text style={styles.ligneFleche}>›</Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <ModalZone
        zoneListe={zoneSelectionnee}
        visible={zoneSelectionnee !== null}
        onFermer={() => setZoneSelectionnee(null)}
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
  contenu: { paddingBottom: 40 },
  statsLigne: {
    flexDirection: 'row',
    backgroundColor: COULEURS.carte,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    margin: 16,
    marginBottom: 8,
  },
  statBloc: { flex: 1, alignItems: 'center' },
  statLabel: {
    fontSize: 11,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValeur: { fontSize: 18, fontWeight: '800', color: COULEURS.texte, marginTop: 4 },
  bandeauErreur: {
    margin: 16,
    padding: 10,
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
  },
  bandeauErreurTexte: { color: COULEURS.rouge, fontSize: 13, textAlign: 'center' },
  aide: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    fontStyle: 'italic',
  },
  section: {
    paddingHorizontal: 16,
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 10,
  },
  liste: { paddingHorizontal: 16, gap: 8 },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COULEURS.carte,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COULEURS.bordure,
    borderRightColor: COULEURS.bordure,
    borderBottomColor: COULEURS.bordure,
  },
  lignePressee: { opacity: 0.85 },
  ligneIcone: { fontSize: 26 },
  ligneContenu: { flex: 1 },
  ligneTitre: { fontSize: 15, fontWeight: '600', color: COULEURS.texte },
  ligneFiliere: { fontSize: 12, color: COULEURS.texteSecondaire, marginTop: 2 },
  ligneFleche: { fontSize: 22, color: COULEURS.texteSecondaire },
})