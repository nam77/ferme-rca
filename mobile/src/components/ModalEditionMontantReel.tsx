import { useEffect, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { COULEURS } from '../constants/couleurs'
import type { LigneBudget } from '../types/budget.types'

const formatMontant = (n: number): string =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })

type Props = {
  ligne: LigneBudget | null
  visible: boolean
  onFermer: () => void
  onValider: (montantReel: number) => Promise<void>
}

export const ModalEditionMontantReel = ({ ligne, visible, onFermer, onValider }: Props) => {
  const [montant, setMontant] = useState('')
  const [enChargement, setEnChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (visible && ligne) {
      setMontant(ligne.montantReel > 0 ? String(ligne.montantReel) : '')
      setErreur(null)
    }
  }, [visible, ligne])

  if (!ligne) return null

  const valider = async () => {
    const valeur = Number(montant.replace(/\s/g, '').replace(',', '.'))
    if (isNaN(valeur) || valeur < 0) {
      setErreur('Saisir un montant positif valide')
      return
    }
    setEnChargement(true)
    setErreur(null)
    try {
      await onValider(valeur)
      onFermer()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Mise à jour impossible')
    } finally {
      setEnChargement(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFermer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fond}
      >
        <Pressable style={styles.fond} onPress={onFermer}>
          <Pressable style={styles.feuille} onPress={() => {}}>
            <Text style={styles.titre}>{ligne.categorie}</Text>
            <Text style={styles.sousTitre}>
              Prévu : {formatMontant(ligne.montantPrevu)} {ligne.devise}
            </Text>

            <Text style={styles.label}>Montant réel dépensé</Text>
            <TextInput
              value={montant}
              onChangeText={(v) => setMontant(v.replace(/[^0-9., ]/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#999"
              style={styles.champ}
              accessibilityLabel="Montant réel"
              autoFocus
            />
            <Text style={styles.aide}>Devise : {ligne.devise}</Text>

            {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

            <View style={styles.boutons}>
              <Pressable
                onPress={onFermer}
                style={({ pressed }) => [styles.boutonAnnuler, pressed && styles.boutonPresse]}
                accessibilityLabel="Annuler"
                accessibilityRole="button"
              >
                <Text style={styles.boutonAnnulerTexte}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={valider}
                disabled={enChargement}
                style={({ pressed }) => [
                  styles.boutonValider,
                  enChargement && styles.boutonDesactive,
                  pressed && styles.boutonPresse,
                ]}
                accessibilityLabel="Enregistrer le montant"
                accessibilityRole="button"
              >
                {enChargement ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.boutonValiderTexte}>Enregistrer</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fond: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  feuille: {
    backgroundColor: COULEURS.fond,
    borderRadius: 14,
    padding: 22,
  },
  titre: { fontSize: 18, fontWeight: '700', color: COULEURS.texte },
  sousTitre: { fontSize: 13, color: COULEURS.texteSecondaire, marginTop: 4, marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: COULEURS.texte, marginBottom: 8 },
  champ: {
    height: 56,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '600',
    color: COULEURS.texte,
    backgroundColor: COULEURS.carte,
  },
  aide: { fontSize: 11, color: COULEURS.texteSecondaire, marginTop: 6 },
  erreur: { color: COULEURS.rouge, fontSize: 13, marginTop: 12, textAlign: 'center' },
  boutons: { flexDirection: 'row', gap: 10, marginTop: 24 },
  boutonAnnuler: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    backgroundColor: COULEURS.carte,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boutonAnnulerTexte: { color: COULEURS.texte, fontSize: 15, fontWeight: '600' },
  boutonValider: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: COULEURS.vert,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boutonDesactive: { opacity: 0.6 },
  boutonPresse: { opacity: 0.85 },
  boutonValiderTexte: { color: '#fff', fontSize: 15, fontWeight: '600' },
})