import { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  COULEURS,
  COULEURS_FILIERES,
  COULEURS_PRIORITES,
  ICONES_FILIERES,
  LIBELLES_FILIERES,
  type Filiere as FiliereCouleur,
} from '../constants/couleurs'
import type { Filiere } from '../types/auth.types'
import type { EntreeCreationTache, Priorite } from '../types/tache.types'

const FILIERES: Filiere[] = [
  'pisciculture',
  'aviculture',
  'porcins',
  'caprins',
  'cultures',
  'infrastructure',
  'habitat',
]

const PRIORITES: { valeur: Priorite; libelle: string }[] = [
  { valeur: 'haute', libelle: 'Haute' },
  { valeur: 'moyenne', libelle: 'Moyenne' },
  { valeur: 'basse', libelle: 'Basse' },
]

type Props = {
  visible: boolean
  filiereForcee?: Filiere | null
  onFermer: () => void
  onCreer: (entree: EntreeCreationTache) => Promise<void>
}

export const ModalCreationTache = ({ visible, filiereForcee, onFermer, onCreer }: Props) => {
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [filiere, setFiliere] = useState<Filiere>(filiereForcee ?? 'cultures')
  const [priorite, setPriorite] = useState<Priorite>('moyenne')
  const [enChargement, setEnChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const reinitialiser = () => {
    setTitre('')
    setDescription('')
    setFiliere(filiereForcee ?? 'cultures')
    setPriorite('moyenne')
    setErreur(null)
  }

  const valider = async () => {
    if (titre.trim().length < 3) {
      setErreur('Le titre doit faire au moins 3 caractères.')
      return
    }
    setEnChargement(true)
    setErreur(null)
    try {
      await onCreer({
        titre: titre.trim(),
        description: description.trim() || undefined,
        filiere,
        priorite,
      })
      reinitialiser()
      onFermer()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Création impossible')
    } finally {
      setEnChargement(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onFermer}>
      <SafeAreaView style={styles.conteneur} edges={['top', 'left', 'right']}>
        <View style={styles.entete}>
          <Pressable
            onPress={onFermer}
            accessibilityLabel="Fermer"
            accessibilityRole="button"
            hitSlop={10}
          >
            <Text style={styles.fermer}>✕</Text>
          </Pressable>
          <Text style={styles.titreEntete}>Nouvelle tâche</Text>
          <View style={styles.fermerVide} />
        </View>

        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Titre *</Text>
          <TextInput
            value={titre}
            onChangeText={setTitre}
            placeholder="Ex. : Vaccination poussins J7"
            placeholderTextColor="#999"
            style={styles.champ}
            accessibilityLabel="Titre de la tâche"
            maxLength={120}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Détails utiles, étapes, contraintes..."
            placeholderTextColor="#999"
            style={[styles.champ, styles.champMultiligne]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Description de la tâche"
            maxLength={2000}
          />

          <Text style={styles.label}>Filière *</Text>
          <View style={styles.grille}>
            {FILIERES.map((f) => {
              const actif = filiere === f
              const couleur = COULEURS_FILIERES[f as FiliereCouleur]
              return (
                <Pressable
                  key={f}
                  onPress={() => !filiereForcee && setFiliere(f)}
                  disabled={Boolean(filiereForcee) && filiereForcee !== f}
                  style={[
                    styles.option,
                    actif && { borderColor: couleur, backgroundColor: couleur + '20' },
                    filiereForcee && filiereForcee !== f && styles.optionDesactivee,
                  ]}
                  accessibilityLabel={`Filière ${LIBELLES_FILIERES[f as FiliereCouleur]}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.optionIcone}>{ICONES_FILIERES[f as FiliereCouleur]}</Text>
                  <Text style={[styles.optionLibelle, actif && { color: couleur, fontWeight: '700' }]}>
                    {LIBELLES_FILIERES[f as FiliereCouleur]}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <Text style={styles.label}>Priorité</Text>
          <View style={styles.lignePriorites}>
            {PRIORITES.map(({ valeur, libelle }) => {
              const actif = priorite === valeur
              const couleur = COULEURS_PRIORITES[valeur]
              return (
                <Pressable
                  key={valeur}
                  onPress={() => setPriorite(valeur)}
                  style={[
                    styles.boutonPriorite,
                    { borderColor: couleur },
                    actif && { backgroundColor: couleur },
                  ]}
                  accessibilityLabel={`Priorité ${libelle}`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.boutonPrioriteTexte, actif && { color: '#fff' }]}>
                    {libelle}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
        </ScrollView>

        <View style={styles.pied}>
          <Pressable
            onPress={valider}
            disabled={enChargement}
            style={({ pressed }) => [
              styles.boutonValider,
              enChargement && styles.boutonValiderDesactive,
              pressed && styles.boutonValiderPresse,
            ]}
            accessibilityLabel="Créer la tâche"
            accessibilityRole="button"
          >
            {enChargement ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.boutonValiderTexte}>Créer la tâche</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS.fond },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.bordure,
  },
  fermer: { fontSize: 22, color: COULEURS.texte, paddingHorizontal: 4 },
  fermerVide: { width: 22 },
  titreEntete: { fontSize: 17, fontWeight: '700', color: COULEURS.texte },
  contenu: { padding: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COULEURS.texte,
    marginBottom: 8,
    marginTop: 14,
  },
  champ: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COULEURS.texte,
    backgroundColor: COULEURS.carte,
  },
  champMultiligne: { minHeight: 100 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    backgroundColor: COULEURS.carte,
    gap: 6,
    minHeight: 44,
  },
  optionDesactivee: { opacity: 0.4 },
  optionIcone: { fontSize: 16 },
  optionLibelle: { fontSize: 14, color: COULEURS.texte },
  lignePriorites: { flexDirection: 'row', gap: 10 },
  boutonPriorite: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: COULEURS.carte,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boutonPrioriteTexte: { fontSize: 15, fontWeight: '600', color: COULEURS.texte },
  erreur: {
    color: COULEURS.rouge,
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  pied: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COULEURS.bordure,
  },
  boutonValider: {
    height: 52,
    backgroundColor: COULEURS.vert,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boutonValiderDesactive: { opacity: 0.6 },
  boutonValiderPresse: { opacity: 0.85 },
  boutonValiderTexte: { color: '#fff', fontSize: 17, fontWeight: '600' },
})
