import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { CarteTache } from './CarteTache'
import { COULEURS, COULEURS_STATUTS, LIBELLES_STATUTS } from '../constants/couleurs'
import type { Statut, Tache } from '../types/tache.types'

const ICONES: Record<Statut, string> = {
  a_faire: '📋',
  en_cours: '⚙️',
  termine: '✅',
}

type Props = {
  statut: Statut
  taches: Tache[]
  onTachePress: (tache: Tache) => void
}

export const ColonneKanban = ({ statut, taches, onTachePress }: Props) => {
  const couleur = COULEURS_STATUTS[statut]
  return (
    <View style={styles.colonne}>
      <View style={[styles.entete, { borderTopColor: couleur }]}>
        <Text style={styles.titre}>
          {ICONES[statut]} {LIBELLES_STATUTS[statut]}
        </Text>
        <View style={[styles.compteur, { backgroundColor: couleur }]}>
          <Text style={styles.compteurTexte}>{taches.length}</Text>
        </View>
      </View>
      <ScrollView
        style={styles.liste}
        contentContainerStyle={styles.listeContenu}
        showsVerticalScrollIndicator={false}
      >
        {taches.length === 0 ? (
          <View style={styles.vide}>
            <Text style={styles.videTexte}>Aucune tâche</Text>
          </View>
        ) : (
          taches.map((t) => (
            <CarteTache key={t.id} tache={t} onPress={() => onTachePress(t)} />
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  colonne: {
    width: 320,
    marginRight: 12,
    backgroundColor: 'rgba(0,0,0,0.025)',
    borderRadius: 12,
    overflow: 'hidden',
    flex: 1,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COULEURS.carte,
    borderTopWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.bordure,
  },
  titre: { fontSize: 16, fontWeight: '700', color: COULEURS.texte },
  compteur: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compteurTexte: { color: '#fff', fontSize: 13, fontWeight: '700' },
  liste: { flex: 1 },
  listeContenu: { padding: 10, paddingBottom: 24 },
  vide: { padding: 24, alignItems: 'center' },
  videTexte: { fontSize: 13, color: COULEURS.texteSecondaire, fontStyle: 'italic' },
})
