import { View, Text, Pressable, StyleSheet } from 'react-native'
import { COULEURS } from '../constants/couleurs'
import type { LigneBudget as TypeLigne } from '../types/budget.types'

const formatMontant = (n: number): string =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })

type Props = {
  ligne: TypeLigne
  editable: boolean
  onPress?: () => void
}

export const LigneBudget = ({ ligne, editable, onPress }: Props) => {
  const delta = ligne.montantReel - ligne.montantPrevu
  const aDelta = ligne.montantReel > 0
  const enDepassement = aDelta && delta > 0
  const couleurDelta = enDepassement
    ? COULEURS.rouge
    : aDelta && delta < 0
      ? COULEURS.vert
      : COULEURS.texteSecondaire

  return (
    <Pressable
      onPress={editable ? onPress : undefined}
      disabled={!editable}
      accessibilityLabel={`${ligne.categorie}, prévu ${formatMontant(ligne.montantPrevu)} ${ligne.devise}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.ligne,
        editable && pressed && styles.lignePressee,
      ]}
    >
      <View style={styles.entete}>
        <Text style={styles.categorie} numberOfLines={2}>{ligne.categorie}</Text>
        {editable ? <Text style={styles.crayon}>✎</Text> : null}
      </View>
      {ligne.description ? (
        <Text style={styles.description} numberOfLines={2}>{ligne.description}</Text>
      ) : null}
      <View style={styles.montants}>
        <View style={styles.colonneMontant}>
          <Text style={styles.cleMontant}>Prévu</Text>
          <Text style={styles.valeurMontant}>
            {formatMontant(ligne.montantPrevu)}
            <Text style={styles.devise}> {ligne.devise}</Text>
          </Text>
        </View>
        <View style={styles.colonneMontant}>
          <Text style={styles.cleMontant}>Réel</Text>
          <Text style={[styles.valeurMontant, !aDelta && styles.valeurMontantVide]}>
            {aDelta ? formatMontant(ligne.montantReel) : '—'}
            {aDelta ? <Text style={styles.devise}> {ligne.devise}</Text> : null}
          </Text>
        </View>
        <View style={styles.colonneMontant}>
          <Text style={styles.cleMontant}>Δ</Text>
          {aDelta ? (
            <Text style={[styles.delta, { color: couleurDelta }]}>
              {delta > 0 ? '+' : ''}
              {formatMontant(delta)}
            </Text>
          ) : (
            <Text style={styles.deltaVide}>—</Text>
          )}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  ligne: {
    backgroundColor: COULEURS.carte,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
  },
  lignePressee: { opacity: 0.85 },
  entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  categorie: { flex: 1, fontSize: 15, fontWeight: '600', color: COULEURS.texte },
  crayon: { fontSize: 16, color: COULEURS.texteSecondaire },
  description: {
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    marginTop: 4,
    lineHeight: 16,
  },
  montants: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  colonneMontant: { flex: 1 },
  cleMontant: {
    fontSize: 10,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  valeurMontant: { fontSize: 14, color: COULEURS.texte, fontWeight: '600' },
  valeurMontantVide: { color: COULEURS.texteSecondaire, fontStyle: 'italic' },
  devise: { fontSize: 11, color: COULEURS.texteSecondaire, fontWeight: '400' },
  delta: { fontSize: 14, fontWeight: '700' },
  deltaVide: { fontSize: 14, color: COULEURS.texteSecondaire, fontStyle: 'italic' },
})
