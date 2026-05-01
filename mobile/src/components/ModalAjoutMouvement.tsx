import { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { COULEURS } from '../constants/couleurs'
import {
  ICONES_TYPE_MOUVEMENT,
  LIBELLES_TYPE_MOUVEMENT,
  TYPES_ENTREE,
  TYPES_SORTIE,
  estEntree,
} from '../constants/animaux'
import type { EntreeMouvement, TypeMouvementAnimal } from '../types/lot.types'

type Props = {
  visible: boolean
  effectifCourant: number
  onFermer: () => void
  onEnregistrer: (entree: EntreeMouvement) => Promise<void>
}

const TOUS_TYPES: TypeMouvementAnimal[] = [...TYPES_ENTREE, ...TYPES_SORTIE]

export const ModalAjoutMouvement = ({
  visible,
  effectifCourant,
  onFermer,
  onEnregistrer,
}: Props) => {
  const [type, setType] = useState<TypeMouvementAnimal>('achat')
  const [quantite, setQuantite] = useState('1')
  const [coutTotal, setCoutTotal] = useState('')
  const [motif, setMotif] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const reinitialiser = () => {
    setType('achat')
    setQuantite('1')
    setCoutTotal('')
    setMotif('')
    setErreur(null)
  }

  const fermer = () => {
    if (enCours) return
    reinitialiser()
    onFermer()
  }

  const enregistrer = async () => {
    setErreur(null)
    const qte = parseInt(quantite, 10)
    if (Number.isNaN(qte) || qte <= 0) {
      setErreur('Quantité invalide.')
      return
    }
    if (!estEntree(type) && qte > effectifCourant) {
      setErreur(
        `Effectif insuffisant : ${effectifCourant} disponible(s), ${qte} demandé(s).`,
      )
      return
    }
    const cout = coutTotal.trim() ? parseFloat(coutTotal.replace(',', '.')) : null
    if (coutTotal.trim() && (Number.isNaN(cout!) || cout! < 0)) {
      setErreur('Coût invalide.')
      return
    }
    setEnCours(true)
    try {
      await onEnregistrer({
        type,
        quantite: qte,
        coutTotal: cout,
        motif: motif.trim() ? motif.trim() : null,
      })
      reinitialiser()
      onFermer()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Enregistrement impossible'
      setErreur(message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={fermer}>
      <Pressable style={styles.fond} onPress={fermer}>
        <Pressable style={styles.feuille} onPress={() => {}}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.titre}>Nouveau mouvement</Text>
            <Text style={styles.sousTitre}>
              Effectif courant : <Text style={styles.effectifValeur}>{effectifCourant}</Text>
            </Text>

            <Text style={styles.label}>Type de mouvement</Text>
            <View style={styles.typesGrille}>
              {TOUS_TYPES.map((t) => {
                const actif = type === t
                const entree = estEntree(t)
                return (
                  <Pressable
                    key={t}
                    onPress={() => setType(t)}
                    accessibilityLabel={LIBELLES_TYPE_MOUVEMENT[t]}
                    accessibilityRole="button"
                    style={[
                      styles.typeChip,
                      {
                        borderColor: entree ? COULEURS.vert : COULEURS.rouge,
                      },
                      actif && {
                        backgroundColor: entree ? COULEURS.vert : COULEURS.rouge,
                      },
                    ]}
                  >
                    <Text style={styles.typeIcone}>{ICONES_TYPE_MOUVEMENT[t]}</Text>
                    <Text style={[styles.typeTexte, actif && styles.typeTexteActif]}>
                      {LIBELLES_TYPE_MOUVEMENT[t]}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Text style={styles.label}>Quantité</Text>
            <TextInput
              value={quantite}
              onChangeText={setQuantite}
              keyboardType="number-pad"
              style={styles.champ}
              placeholder="1"
              placeholderTextColor={COULEURS.texteSecondaire}
              accessibilityLabel="Quantité"
            />

            {(type === 'achat' || type === 'vente') ? (
              <>
                <Text style={styles.label}>
                  {type === 'achat' ? 'Coût total (XAF)' : 'Recette totale (XAF)'} — optionnel
                </Text>
                <TextInput
                  value={coutTotal}
                  onChangeText={setCoutTotal}
                  keyboardType="decimal-pad"
                  style={styles.champ}
                  placeholder="0"
                  placeholderTextColor={COULEURS.texteSecondaire}
                  accessibilityLabel="Coût"
                />
              </>
            ) : null}

            <Text style={styles.label}>Motif / commentaire (optionnel)</Text>
            <TextInput
              value={motif}
              onChangeText={setMotif}
              style={[styles.champ, styles.champMulti]}
              placeholder="Ex: mise bas chèvre #4 (triplés)"
              placeholderTextColor={COULEURS.texteSecondaire}
              multiline
              numberOfLines={2}
              accessibilityLabel="Motif"
            />

            {erreur ? (
              <View style={styles.bandeauErreur}>
                <Text style={styles.bandeauErreurTexte}>{erreur}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                onPress={fermer}
                disabled={enCours}
                style={({ pressed }) => [
                  styles.boutonAnnuler,
                  pressed && styles.boutonPresse,
                  enCours && styles.boutonDesactive,
                ]}
                accessibilityLabel="Annuler"
                accessibilityRole="button"
              >
                <Text style={styles.boutonAnnulerTexte}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={enregistrer}
                disabled={enCours}
                style={({ pressed }) => [
                  styles.boutonValider,
                  pressed && styles.boutonPresse,
                  enCours && styles.boutonDesactive,
                ]}
                accessibilityLabel="Enregistrer le mouvement"
                accessibilityRole="button"
              >
                {enCours ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.boutonValiderTexte}>Enregistrer</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  feuille: {
    backgroundColor: COULEURS.fond,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '90%',
  },
  scroll: { padding: 20, paddingBottom: 40 },
  titre: { fontSize: 20, fontWeight: '700', color: COULEURS.texte, marginBottom: 4 },
  sousTitre: { fontSize: 13, color: COULEURS.texteSecondaire, marginBottom: 16 },
  effectifValeur: { color: COULEURS.texte, fontWeight: '700' },
  label: {
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  typesGrille: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: COULEURS.carte,
    minHeight: 36,
  },
  typeIcone: { fontSize: 14 },
  typeTexte: { fontSize: 13, fontWeight: '600', color: COULEURS.texte },
  typeTexteActif: { color: '#fff' },
  champ: {
    backgroundColor: COULEURS.carte,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COULEURS.texte,
    minHeight: 48,
  },
  champMulti: { minHeight: 80, textAlignVertical: 'top' },
  bandeauErreur: {
    marginTop: 14,
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
    borderRadius: 8,
    padding: 10,
  },
  bandeauErreurTexte: { color: COULEURS.rouge, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  boutonAnnuler: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
  },
  boutonAnnulerTexte: { color: COULEURS.texte, fontSize: 15, fontWeight: '600' },
  boutonValider: {
    flex: 2,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COULEURS.vert,
  },
  boutonValiderTexte: { color: '#fff', fontSize: 16, fontWeight: '700' },
  boutonPresse: { opacity: 0.85 },
  boutonDesactive: { opacity: 0.55 },
})
