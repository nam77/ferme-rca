import { Modal, View, Text, Pressable, StyleSheet } from 'react-native'
import {
  COULEURS,
  COULEURS_STATUTS,
  COULEURS_FILIERES,
  ICONES_FILIERES,
  LIBELLES_FILIERES,
  LIBELLES_STATUTS,
  type Filiere as FiliereCouleur,
} from '../constants/couleurs'
import type { Statut, Tache } from '../types/tache.types'

const STATUTS: Statut[] = ['a_faire', 'en_cours', 'termine']
const ICONES_STATUT: Record<Statut, string> = {
  a_faire: '📋',
  en_cours: '⚙️',
  termine: '✅',
}

type Props = {
  tache: Tache | null
  visible: boolean
  onFermer: () => void
  onChangerStatut: (statut: Statut) => void
  onSupprimer: () => void
  peutSupprimer: boolean
}

export const MenuActionsTache = ({
  tache,
  visible,
  onFermer,
  onChangerStatut,
  onSupprimer,
  peutSupprimer,
}: Props) => {
  if (!tache) return null
  const couleurFiliere = COULEURS_FILIERES[tache.filiere as FiliereCouleur]

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFermer}>
      <Pressable style={styles.fond} onPress={onFermer}>
        <Pressable style={styles.feuille} onPress={() => {}}>
          <View style={[styles.banniere, { backgroundColor: couleurFiliere + '15', borderLeftColor: couleurFiliere }]}>
            <Text style={styles.banniereIcone}>{ICONES_FILIERES[tache.filiere as FiliereCouleur]}</Text>
            <View style={styles.banniereTexte}>
              <Text style={styles.banniereFiliere}>{LIBELLES_FILIERES[tache.filiere as FiliereCouleur]}</Text>
              <Text style={styles.banniereTitre} numberOfLines={2}>{tache.titre}</Text>
            </View>
          </View>

          {tache.description ? (
            <Text style={styles.description}>{tache.description}</Text>
          ) : null}

          <Text style={styles.section}>Déplacer vers</Text>
          {STATUTS.map((statut) => {
            const couleur = COULEURS_STATUTS[statut]
            const actuel = tache.statut === statut
            return (
              <Pressable
                key={statut}
                onPress={() => {
                  if (!actuel) onChangerStatut(statut)
                  onFermer()
                }}
                disabled={actuel}
                style={({ pressed }) => [
                  styles.option,
                  actuel && styles.optionActive,
                  pressed && styles.optionPressee,
                  { borderLeftColor: couleur },
                ]}
                accessibilityLabel={`Déplacer vers ${LIBELLES_STATUTS[statut]}`}
                accessibilityRole="button"
              >
                <Text style={styles.optionIcone}>{ICONES_STATUT[statut]}</Text>
                <Text style={[styles.optionTexte, actuel && styles.optionTexteActif]}>
                  {LIBELLES_STATUTS[statut]}
                </Text>
                {actuel ? <Text style={styles.optionMarqueur}>● actuel</Text> : null}
              </Pressable>
            )
          })}

          {peutSupprimer ? (
            <Pressable
              onPress={() => {
                onSupprimer()
                onFermer()
              }}
              style={({ pressed }) => [styles.boutonSupprimer, pressed && styles.optionPressee]}
              accessibilityLabel="Supprimer la tâche"
              accessibilityRole="button"
            >
              <Text style={styles.boutonSupprimerTexte}>🗑  Supprimer la tâche</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onFermer}
            style={({ pressed }) => [styles.boutonAnnuler, pressed && styles.optionPressee]}
            accessibilityLabel="Fermer le menu"
            accessibilityRole="button"
          >
            <Text style={styles.boutonAnnulerTexte}>Annuler</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fond: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  feuille: {
    backgroundColor: COULEURS.fond,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  banniere: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 12,
    alignItems: 'center',
    gap: 12,
  },
  banniereIcone: { fontSize: 26 },
  banniereTexte: { flex: 1 },
  banniereFiliere: {
    fontSize: 11,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  banniereTitre: { fontSize: 16, fontWeight: '700', color: COULEURS.texte, lineHeight: 20 },
  description: {
    fontSize: 14,
    color: COULEURS.texteSecondaire,
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  section: {
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COULEURS.carte,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    gap: 12,
  },
  optionActive: { opacity: 0.55 },
  optionPressee: { opacity: 0.7 },
  optionIcone: { fontSize: 20 },
  optionTexte: { flex: 1, fontSize: 16, fontWeight: '600', color: COULEURS.texte },
  optionTexteActif: { color: COULEURS.texteSecondaire },
  optionMarqueur: { fontSize: 11, color: COULEURS.texteSecondaire, fontStyle: 'italic' },
  boutonSupprimer: {
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
  },
  boutonSupprimerTexte: { color: COULEURS.rouge, fontSize: 15, fontWeight: '600' },
  boutonAnnuler: {
    marginTop: 12,
    padding: 14,
    alignItems: 'center',
  },
  boutonAnnulerTexte: { color: COULEURS.texteSecondaire, fontSize: 15, fontWeight: '500' },
})
