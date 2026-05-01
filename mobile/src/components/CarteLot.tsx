import { Pressable, View, Text, StyleSheet } from 'react-native'
import { COULEURS, COULEURS_FILIERES } from '../constants/couleurs'
import {
  FILIERE_PAR_ESPECE,
  ICONES_ESPECES,
  ICONES_SEXE,
  LIBELLES_CATEGORIE_AGE,
  LIBELLES_SEXE,
} from '../constants/animaux'
import type { LotResume } from '../types/lot.types'

type Props = {
  lot: LotResume
  onPress?: () => void
}

export const CarteLot = ({ lot, onPress }: Props) => {
  const couleur = COULEURS_FILIERES[FILIERE_PAR_ESPECE[lot.espece]]
  const icone = ICONES_ESPECES[lot.espece]

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Lot : ${lot.nom}, effectif ${lot.effectif}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.carte,
        { borderLeftColor: couleur },
        pressed && styles.cartePressee,
      ]}
    >
      <View style={styles.entete}>
        <Text style={styles.icone}>{icone}</Text>
        <View style={styles.titreBloc}>
          <Text style={styles.titre} numberOfLines={2}>
            {lot.nom}
          </Text>
          <View style={styles.metaLigne}>
            {lot.sexe ? (
              <Text style={styles.meta}>
                {ICONES_SEXE[lot.sexe]} {LIBELLES_SEXE[lot.sexe]}
              </Text>
            ) : null}
            <Text style={styles.meta}>{LIBELLES_CATEGORIE_AGE[lot.categorieAge]}</Text>
            {!lot.actif ? <Text style={styles.metaInactif}>· inactif</Text> : null}
          </View>
        </View>
        <View style={styles.effectifBloc}>
          <Text style={[styles.effectifNombre, { color: couleur }]}>{lot.effectif}</Text>
          <Text style={styles.effectifLabel}>tête{lot.effectif > 1 ? 's' : ''}</Text>
        </View>
      </View>

      {lot.zone ? (
        <View style={styles.pied}>
          <Text style={styles.zoneTexte}>📍 {lot.zone.nom}</Text>
          {lot.nombreMouvements > 0 ? (
            <Text style={styles.zoneTexte}>
              {lot.nombreMouvements} mouvement{lot.nombreMouvements > 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: COULEURS.carte,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COULEURS.bordure,
    borderRightColor: COULEURS.bordure,
    borderBottomColor: COULEURS.bordure,
  },
  cartePressee: { opacity: 0.85 },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icone: { fontSize: 32 },
  titreBloc: { flex: 1 },
  titre: { fontSize: 16, fontWeight: '700', color: COULEURS.texte, lineHeight: 20 },
  metaLigne: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  meta: { fontSize: 12, color: COULEURS.texteSecondaire },
  metaInactif: { fontSize: 12, color: COULEURS.rouge, fontStyle: 'italic' },
  effectifBloc: { alignItems: 'flex-end', minWidth: 64 },
  effectifNombre: { fontSize: 28, fontWeight: '700', lineHeight: 30 },
  effectifLabel: { fontSize: 11, color: COULEURS.texteSecondaire, marginTop: -2 },
  pied: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoneTexte: { fontSize: 12, color: COULEURS.texteSecondaire },
})
