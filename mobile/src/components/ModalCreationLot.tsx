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
import { COULEURS, COULEURS_FILIERES } from '../constants/couleurs'
import {
  ESPECES_ORDRE,
  FILIERE_PAR_ESPECE,
  ICONES_ESPECES,
  ICONES_SEXE,
  LIBELLES_CATEGORIE_AGE,
  LIBELLES_ESPECES,
  LIBELLES_SEXE,
} from '../constants/animaux'
import type {
  CategorieAge,
  EntreeCreationLot,
  Espece,
  SexeAnimal,
} from '../types/lot.types'

const SEXES: SexeAnimal[] = ['male', 'femelle', 'mixte']
const CATEGORIES: CategorieAge[] = ['jeune', 'croissance', 'adulte', 'reforme']

type Props = {
  visible: boolean
  onFermer: () => void
  onCreer: (entree: EntreeCreationLot) => Promise<void>
}

export const ModalCreationLot = ({ visible, onFermer, onCreer }: Props) => {
  const [nom, setNom] = useState('')
  const [espece, setEspece] = useState<Espece>('caprin')
  const [sexe, setSexe] = useState<SexeAnimal | null>(null)
  const [categorieAge, setCategorieAge] = useState<CategorieAge>('adulte')
  const [notes, setNotes] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const reinitialiser = () => {
    setNom('')
    setEspece('caprin')
    setSexe(null)
    setCategorieAge('adulte')
    setNotes('')
    setErreur(null)
  }

  const fermer = () => {
    if (enCours) return
    reinitialiser()
    onFermer()
  }

  const enregistrer = async () => {
    setErreur(null)
    if (nom.trim().length < 2) {
      setErreur('Nom trop court (minimum 2 caractères).')
      return
    }
    setEnCours(true)
    try {
      await onCreer({
        nom: nom.trim(),
        espece,
        sexe,
        categorieAge,
        notes: notes.trim() ? notes.trim() : null,
      })
      reinitialiser()
      onFermer()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Création impossible')
    } finally {
      setEnCours(false)
    }
  }

  const couleurEspece = COULEURS_FILIERES[FILIERE_PAR_ESPECE[espece]]

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={fermer}>
      <Pressable style={styles.fond} onPress={fermer}>
        <Pressable style={styles.feuille} onPress={() => {}}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.titre}>Nouveau lot d'animaux</Text>

            <Text style={styles.label}>Nom du lot</Text>
            <TextInput
              value={nom}
              onChangeText={setNom}
              style={styles.champ}
              placeholder="Ex: Cycle 2 — poulets de chair"
              placeholderTextColor={COULEURS.texteSecondaire}
              accessibilityLabel="Nom du lot"
            />

            <Text style={styles.label}>Espèce</Text>
            <View style={styles.grille}>
              {ESPECES_ORDRE.map((e) => {
                const actif = espece === e
                const couleur = COULEURS_FILIERES[FILIERE_PAR_ESPECE[e]]
                return (
                  <Pressable
                    key={e}
                    onPress={() => setEspece(e)}
                    accessibilityLabel={LIBELLES_ESPECES[e]}
                    accessibilityRole="button"
                    style={[
                      styles.chip,
                      { borderColor: couleur },
                      actif && { backgroundColor: couleur },
                    ]}
                  >
                    <Text style={styles.chipIcone}>{ICONES_ESPECES[e]}</Text>
                    <Text style={[styles.chipTexte, actif && styles.chipTexteActif]}>
                      {LIBELLES_ESPECES[e]}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Text style={styles.label}>Sexe (optionnel)</Text>
            <View style={styles.grille}>
              <Pressable
                onPress={() => setSexe(null)}
                accessibilityLabel="Aucun sexe précisé"
                accessibilityRole="button"
                style={[
                  styles.chip,
                  { borderColor: COULEURS.bordure },
                  sexe === null && { backgroundColor: COULEURS.texteSecondaire, borderColor: COULEURS.texteSecondaire },
                ]}
              >
                <Text style={[styles.chipTexte, sexe === null && styles.chipTexteActif]}>
                  Non précisé
                </Text>
              </Pressable>
              {SEXES.map((s) => {
                const actif = sexe === s
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSexe(s)}
                    accessibilityLabel={LIBELLES_SEXE[s]}
                    accessibilityRole="button"
                    style={[
                      styles.chip,
                      { borderColor: couleurEspece },
                      actif && { backgroundColor: couleurEspece },
                    ]}
                  >
                    <Text style={styles.chipIcone}>{ICONES_SEXE[s]}</Text>
                    <Text style={[styles.chipTexte, actif && styles.chipTexteActif]}>
                      {LIBELLES_SEXE[s]}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Text style={styles.label}>Catégorie d'âge</Text>
            <View style={styles.grille}>
              {CATEGORIES.map((c) => {
                const actif = categorieAge === c
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategorieAge(c)}
                    accessibilityLabel={LIBELLES_CATEGORIE_AGE[c]}
                    accessibilityRole="button"
                    style={[
                      styles.chip,
                      { borderColor: couleurEspece },
                      actif && { backgroundColor: couleurEspece },
                    ]}
                  >
                    <Text style={[styles.chipTexte, actif && styles.chipTexteActif]}>
                      {LIBELLES_CATEGORIE_AGE[c]}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Text style={styles.label}>Notes (optionnel)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[styles.champ, styles.champMulti]}
              placeholder="Origine, fournisseur, particularités sanitaires…"
              placeholderTextColor={COULEURS.texteSecondaire}
              multiline
              numberOfLines={3}
              accessibilityLabel="Notes"
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
                  { backgroundColor: couleurEspece },
                  pressed && styles.boutonPresse,
                  enCours && styles.boutonDesactive,
                ]}
                accessibilityLabel="Créer le lot"
                accessibilityRole="button"
              >
                {enCours ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.boutonValiderTexte}>Créer le lot</Text>
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
    maxHeight: '92%',
  },
  scroll: { padding: 20, paddingBottom: 40 },
  titre: { fontSize: 20, fontWeight: '700', color: COULEURS.texte, marginBottom: 8 },
  label: {
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
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
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
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
  chipIcone: { fontSize: 14 },
  chipTexte: { fontSize: 13, fontWeight: '600', color: COULEURS.texte },
  chipTexteActif: { color: '#fff' },
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
  },
  boutonValiderTexte: { color: '#fff', fontSize: 16, fontWeight: '700' },
  boutonPresse: { opacity: 0.85 },
  boutonDesactive: { opacity: 0.55 },
})
