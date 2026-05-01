// Diagramme d'économie circulaire — flux entre filières.
// Reproduit le bloc "Cycle d'économie circulaire" de la capture presentation-de-la-ferme.png.

import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../constants/theme'
import { COULEURS_FILIERES } from '../constants/couleurs'

type Noeud = {
  cle: string
  icone: string
  libelle: string
  detail: string
  couleur: string
}

const NOEUDS: Noeud[] = [
  {
    cle: 'poulailler',
    icone: '🐓',
    libelle: 'Poulailler',
    detail: 'Fientes',
    couleur: COULEURS_FILIERES.aviculture,
  },
  {
    cle: 'manger',
    icone: '🐷',
    libelle: 'Manger',
    detail: 'Truies & VL',
    couleur: COULEURS_FILIERES.porcins,
  },
  {
    cle: 'compost',
    icone: '♻️',
    libelle: 'Compost',
    detail: 'Cultures',
    couleur: COULEURS_TOKEN.straw,
  },
  {
    cle: 'bassins',
    icone: '🐟',
    libelle: 'Bassins',
    detail: 'Tilapia + Clarias',
    couleur: COULEURS_FILIERES.pisciculture,
  },
  {
    cle: 'champs',
    icone: '🌾',
    libelle: 'Champs',
    detail: 'Maïs / manioc',
    couleur: COULEURS_FILIERES.cultures,
  },
]

export const DiagrammeCycle = () => {
  return (
    <View style={styles.bloc}>
      <View style={styles.entete}>
        <Ionicons name="sync" size={14} color={COULEURS_TOKEN.mint} />
        <Text style={styles.titre}>
          Cycle d'économie circulaire <Text style={styles.titreItalique}>— Flux du flux</Text>
        </Text>
      </View>
      <Text style={styles.description}>
        Les <Text style={styles.gras}>fientes</Text> du poulailler fertilisent les bassins (phytoplancton).
        Les <Text style={styles.gras}>eaux résiduelles</Text> et le <Text style={styles.gras}>lisier</Text> partent au compost (45 jours) puis irriguent les champs.
        Maïs et manioc reviennent à l'alimentation des animaux.
      </Text>

      <View style={styles.flux}>
        {NOEUDS.map((n, idx) => (
          <View key={n.cle} style={styles.fluxItem}>
            <View
              style={[
                styles.noeud,
                { backgroundColor: n.couleur + '15', borderColor: n.couleur + '60' },
              ]}
            >
              <Text style={styles.noeudIcone}>{n.icone}</Text>
              <View style={styles.noeudTexte}>
                <Text style={[styles.noeudLibelle, { color: n.couleur }]}>{n.libelle}</Text>
                <Text style={styles.noeudDetail}>{n.detail}</Text>
              </View>
            </View>
            {idx < NOEUDS.length - 1 ? (
              <View style={styles.fleche}>
                <Ionicons name="arrow-forward" size={14} color={COULEURS_TOKEN.clay} />
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bloc: {
    backgroundColor: COULEURS_TOKEN.carte,
    borderRadius: RAYONS.grand,
    padding: ESPACEMENTS.l,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
    marginHorizontal: ESPACEMENTS.xl,
    marginTop: ESPACEMENTS.l,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: ESPACEMENTS.s,
  },
  titre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 18,
    color: COULEURS_TOKEN.soil,
  },
  titreItalique: {
    fontFamily: POLICES.serifItalique,
    color: COULEURS_TOKEN.mint,
  },
  description: {
    fontFamily: POLICES.sans,
    fontSize: 13,
    color: COULEURS_TOKEN.earth,
    lineHeight: 19,
    marginBottom: ESPACEMENTS.l,
  },
  gras: {
    fontFamily: POLICES.sansBold,
    color: COULEURS_TOKEN.soil,
  },
  flux: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: ESPACEMENTS.s,
  },
  fluxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.s,
  },
  noeud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.s,
    paddingHorizontal: ESPACEMENTS.m,
    paddingVertical: ESPACEMENTS.s,
    borderRadius: RAYONS.moyen,
    borderWidth: 1.5,
    minWidth: 140,
  },
  noeudIcone: { fontSize: 22 },
  noeudTexte: {},
  noeudLibelle: {
    fontFamily: POLICES.sansBold,
    fontSize: 13,
  },
  noeudDetail: {
    fontFamily: POLICES.sans,
    fontSize: 11,
    color: COULEURS_TOKEN.clay,
    marginTop: 1,
  },
  fleche: {
    paddingHorizontal: 4,
  },
})
