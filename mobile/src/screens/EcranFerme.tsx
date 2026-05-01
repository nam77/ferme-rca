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
import { useZones } from '../hooks/useZones'
import { PlanFerme } from '../components/PlanFerme'
import { PlanTechnique } from '../components/PlanTechnique'
import { DiagrammeCycle } from '../components/DiagrammeCycle'
import { ModalZone } from '../components/ModalZone'
import {
  COULEURS_FILIERES,
  ICONES_FILIERES,
  LIBELLES_FILIERES,
} from '../constants/couleurs'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../constants/theme'
import type { Filiere } from '../types/auth.types'
import type { ZoneListe } from '../types/zone.types'

type ModeVue = 'illustree' | 'technique'

const FILIERES_LEGENDE: Filiere[] = [
  'pisciculture',
  'aviculture',
  'porcins',
  'caprins',
  'cultures',
  'infrastructure',
  'habitat',
]

export const EcranFerme = () => {
  const { zones, enChargement, erreur } = useZones()
  const [zoneSelectionnee, setZoneSelectionnee] = useState<ZoneListe | null>(null)
  const [modeVue, setModeVue] = useState<ModeVue>('illustree')

  const surfaceTotale = useMemo(
    () => zones.reduce((s, z) => s + (z.surface ?? 0), 0),
    [zones],
  )

  if (enChargement && zones.length === 0) {
    return (
      <View style={styles.chargement}>
        <ActivityIndicator size="large" color={COULEURS_TOKEN.mint} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.conteneur} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.entete}>
          <View style={styles.entetegauche}>
            <Text style={styles.titre}>
              La Ferme <Text style={styles.titreItalique}>— Plan & zones</Text>
            </Text>
            <Text style={styles.sousTitre}>
              Vue illustrée à gauche, plan technique à droite. Cliquez sur les zones pour voir les détails.
              {' '}{(surfaceTotale / 10000).toFixed(1)} hectares · {zones.length} zones.
            </Text>
          </View>

          <View style={styles.toggleVue}>
            <Pressable
              onPress={() => setModeVue('illustree')}
              accessibilityLabel="Vue illustrée"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.toggleBouton,
                modeVue === 'illustree' && styles.toggleBoutonActif,
                pressed && styles.boutonPresse,
              ]}
            >
              <Ionicons
                name="image"
                size={13}
                color={modeVue === 'illustree' ? COULEURS_TOKEN.cream : COULEURS_TOKEN.earth}
              />
              <Text style={[
                styles.toggleTexte,
                modeVue === 'illustree' && styles.toggleTexteActif,
              ]}>
                Vue illustrée
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setModeVue('technique')}
              accessibilityLabel="Plan technique"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.toggleBouton,
                modeVue === 'technique' && styles.toggleBoutonActif,
                pressed && styles.boutonPresse,
              ]}
            >
              <Ionicons
                name="map"
                size={13}
                color={modeVue === 'technique' ? COULEURS_TOKEN.cream : COULEURS_TOKEN.earth}
              />
              <Text style={[
                styles.toggleTexte,
                modeVue === 'technique' && styles.toggleTexteActif,
              ]}>
                Plan technique
              </Text>
            </Pressable>
          </View>
        </View>

        {erreur ? (
          <View style={styles.bandeauErreur}>
            <Text style={styles.bandeauErreurTexte}>{erreur}</Text>
          </View>
        ) : null}

        <View style={styles.cartePlan}>
          <View style={styles.carteEntete}>
            <View style={styles.carteEnteteIcone}>
              <Ionicons
                name={modeVue === 'illustree' ? 'image-outline' : 'map-outline'}
                size={14}
                color={COULEURS_TOKEN.mint}
              />
            </View>
            <Text style={styles.carteEnteteTitre}>
              {modeVue === 'illustree' ? 'Vue illustrée' : 'Plan technique'}
            </Text>
            <View style={styles.carteEntetePastille}>
              <Text style={styles.carteEntetePastilleTexte}>
                {(surfaceTotale / 10000).toFixed(1)} ha
              </Text>
            </View>
          </View>
          {modeVue === 'illustree' ? (
            <PlanFerme zones={zones} onZonePress={setZoneSelectionnee} />
          ) : (
            <PlanTechnique zones={zones} onZonePress={setZoneSelectionnee} />
          )}
        </View>

        <View style={styles.legende}>
          {FILIERES_LEGENDE.map((f) => {
            const couleur = COULEURS_FILIERES[f]
            return (
              <View key={f} style={styles.legendeItem}>
                <View style={[styles.legendePoint, { backgroundColor: couleur }]} />
                <Text style={styles.legendeIcone}>{ICONES_FILIERES[f]}</Text>
                <Text style={styles.legendeTexte}>{LIBELLES_FILIERES[f]}</Text>
              </View>
            )
          })}
        </View>

        <DiagrammeCycle />

        <Text style={styles.section}>Liste des zones</Text>
        <View style={styles.liste}>
          {zones.map((z) => {
            const couleur = COULEURS_FILIERES[z.filiere as Filiere]
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
                <Text style={styles.ligneIcone}>{ICONES_FILIERES[z.filiere as Filiere]}</Text>
                <View style={styles.ligneContenu}>
                  <Text style={styles.ligneTitre}>{z.nom}</Text>
                  <Text style={styles.ligneFiliere}>
                    {LIBELLES_FILIERES[z.filiere as Filiere]}
                    {z.surface ? ` · ${z.surface >= 10_000 ? `${(z.surface / 10_000).toFixed(1)} ha` : `${z.surface} m²`}` : ''}
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
  conteneur: { flex: 1, backgroundColor: COULEURS_TOKEN.cream },
  chargement: {
    flex: 1,
    backgroundColor: COULEURS_TOKEN.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contenu: { paddingBottom: ESPACEMENTS.xxl },
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
  toggleVue: {
    flexDirection: 'row',
    backgroundColor: COULEURS_TOKEN.carte,
    borderRadius: RAYONS.moyen,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
    padding: 3,
  },
  toggleBouton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: ESPACEMENTS.m,
    paddingVertical: 7,
    borderRadius: RAYONS.petit,
  },
  toggleBoutonActif: {
    backgroundColor: COULEURS_TOKEN.leaf,
  },
  toggleTexte: {
    fontFamily: POLICES.sansMedium,
    fontSize: 12,
    color: COULEURS_TOKEN.earth,
  },
  toggleTexteActif: {
    color: COULEURS_TOKEN.cream,
  },
  boutonPresse: { opacity: 0.85 },
  bandeauErreur: {
    marginHorizontal: ESPACEMENTS.xl,
    padding: ESPACEMENTS.s,
    backgroundColor: 'rgba(231,76,60,0.10)',
    borderRadius: RAYONS.moyen,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.30)',
  },
  bandeauErreurTexte: {
    color: COULEURS_TOKEN.rouge,
    fontFamily: POLICES.sans,
    fontSize: 13,
    textAlign: 'center',
  },
  cartePlan: {
    backgroundColor: COULEURS_TOKEN.carte,
    borderRadius: RAYONS.grand,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
    marginHorizontal: ESPACEMENTS.xl,
    marginTop: ESPACEMENTS.s,
    overflow: 'hidden',
  },
  carteEntete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.s,
    paddingHorizontal: ESPACEMENTS.l,
    paddingVertical: ESPACEMENTS.m,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS_TOKEN.bordure,
  },
  carteEnteteIcone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(74,140,63,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carteEnteteTitre: {
    flex: 1,
    fontFamily: POLICES.serifSemi,
    fontSize: 16,
    color: COULEURS_TOKEN.soil,
  },
  carteEntetePastille: {
    paddingHorizontal: ESPACEMENTS.s,
    paddingVertical: 2,
    borderRadius: RAYONS.pastille,
    backgroundColor: 'rgba(74,140,63,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(74,140,63,0.35)',
  },
  carteEntetePastilleTexte: {
    fontFamily: POLICES.mono,
    fontSize: 10,
    color: COULEURS_TOKEN.mint,
    letterSpacing: 0.6,
  },
  legende: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACEMENTS.s,
    paddingHorizontal: ESPACEMENTS.xl,
    marginTop: ESPACEMENTS.m,
  },
  legendeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: ESPACEMENTS.s,
    paddingVertical: 4,
    borderRadius: RAYONS.pastille,
    backgroundColor: COULEURS_TOKEN.carte,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
  },
  legendePoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendeIcone: { fontSize: 12 },
  legendeTexte: {
    fontFamily: POLICES.sansMedium,
    fontSize: 12,
    color: COULEURS_TOKEN.soil,
  },
  section: {
    fontFamily: POLICES.mono,
    fontSize: 11,
    color: COULEURS_TOKEN.clay,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: ESPACEMENTS.xl,
    marginTop: ESPACEMENTS.xl,
    marginBottom: ESPACEMENTS.s,
  },
  liste: {
    paddingHorizontal: ESPACEMENTS.xl,
    gap: ESPACEMENTS.s,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.m,
    backgroundColor: COULEURS_TOKEN.carte,
    borderRadius: RAYONS.moyen,
    padding: ESPACEMENTS.m,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COULEURS_TOKEN.bordure,
    borderRightColor: COULEURS_TOKEN.bordure,
    borderBottomColor: COULEURS_TOKEN.bordure,
  },
  lignePressee: { opacity: 0.85 },
  ligneIcone: { fontSize: 24 },
  ligneContenu: { flex: 1 },
  ligneTitre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 15,
    color: COULEURS_TOKEN.soil,
  },
  ligneFiliere: {
    fontFamily: POLICES.sans,
    fontSize: 12,
    color: COULEURS_TOKEN.earth,
    marginTop: 2,
  },
  ligneFleche: {
    fontFamily: POLICES.serif,
    fontSize: 22,
    color: COULEURS_TOKEN.clay,
  },
})
