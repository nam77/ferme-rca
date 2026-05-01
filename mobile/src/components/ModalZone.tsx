import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useZone } from '../hooks/useZones'
import {
  COULEURS,
  COULEURS_FILIERES,
  ICONES_FILIERES,
  LIBELLES_FILIERES,
  type Filiere as FiliereCouleur,
} from '../constants/couleurs'
import type { ZoneListe } from '../types/zone.types'
import { CarteTache } from './CarteTache'

const formatSurface = (m2: number | null): string => {
  if (m2 === null) return '—'
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(1)} ha`
  return `${m2.toLocaleString('fr-FR')} m²`
}

type Props = {
  zoneListe: ZoneListe | null
  visible: boolean
  onFermer: () => void
}

export const ModalZone = ({ zoneListe, visible, onFermer }: Props) => {
  const { zone, enChargement, erreur } = useZone(visible && zoneListe ? zoneListe.id : null)

  if (!zoneListe) return null
  const couleur = COULEURS_FILIERES[zoneListe.filiere as FiliereCouleur]
  const icone = ICONES_FILIERES[zoneListe.filiere as FiliereCouleur]

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onFermer}>
      <SafeAreaView style={styles.conteneur} edges={['top', 'left', 'right']}>
        <View style={[styles.banniere, { backgroundColor: couleur }]}>
          <View style={styles.banniereContenu}>
            <Text style={styles.icone}>{icone}</Text>
            <View style={styles.banniereTexte}>
              <Text style={styles.banniereFiliere}>
                {LIBELLES_FILIERES[zoneListe.filiere as FiliereCouleur]}
              </Text>
              <Text style={styles.banniereTitre}>{zoneListe.nom}</Text>
            </View>
            <Pressable
              onPress={onFermer}
              style={styles.boutonFermer}
              accessibilityLabel="Fermer"
              accessibilityRole="button"
              hitSlop={10}
            >
              <Text style={styles.boutonFermerTexte}>✕</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.contenu}>
          <View style={styles.statsLigne}>
            <View style={styles.statBloc}>
              <Text style={styles.statLabel}>Surface</Text>
              <Text style={styles.statValeur}>{formatSurface(zoneListe.surface)}</Text>
            </View>
            <View style={styles.statBloc}>
              <Text style={styles.statLabel}>Position</Text>
              <Text style={styles.statValeur}>
                {Math.round(zoneListe.positionX)} · {Math.round(zoneListe.positionY)}
              </Text>
            </View>
            <View style={styles.statBloc}>
              <Text style={styles.statLabel}>Tâches</Text>
              <Text style={styles.statValeur}>{zoneListe._count.taches}</Text>
            </View>
          </View>

          {zoneListe.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitre}>Description</Text>
              <Text style={styles.description}>{zoneListe.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Tâches associées</Text>
            {enChargement ? (
              <ActivityIndicator color={couleur} style={{ marginVertical: 16 }} />
            ) : erreur ? (
              <Text style={styles.erreur}>{erreur}</Text>
            ) : !zone || zone.taches.length === 0 ? (
              <Text style={styles.vide}>Aucune tâche liée à cette zone pour l'instant.</Text>
            ) : (
              zone.taches.map((t) => <CarteTache key={t.id} tache={t} />)
            )}
          </View>

          {zoneListe.photos.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitre}>Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {zoneListe.photos.map((p) => (
                  <View key={p.id} style={styles.photoVignette}>
                    <Text style={styles.photoUrl}>{p.url}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS.fond },
  banniere: {
    paddingVertical: 24,
    paddingHorizontal: 18,
  },
  banniereContenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  icone: { fontSize: 38 },
  banniereTexte: { flex: 1 },
  banniereFiliere: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  banniereTitre: { fontSize: 20, fontWeight: '800', color: '#fff' },
  boutonFermer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boutonFermerTexte: { color: '#fff', fontSize: 20, fontWeight: '600' },
  contenu: { padding: 18, paddingBottom: 40 },
  statsLigne: {
    flexDirection: 'row',
    backgroundColor: COULEURS.carte,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    marginBottom: 18,
  },
  statBloc: { flex: 1, alignItems: 'center' },
  statLabel: {
    fontSize: 11,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValeur: {
    fontSize: 18,
    fontWeight: '800',
    color: COULEURS.texte,
    marginTop: 4,
  },
  section: { marginBottom: 22 },
  sectionTitre: {
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: COULEURS.texte,
    lineHeight: 21,
  },
  vide: {
    fontSize: 13,
    color: COULEURS.texteSecondaire,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  erreur: { color: COULEURS.rouge, fontSize: 13, textAlign: 'center', marginVertical: 12 },
  photoVignette: {
    width: 140,
    height: 100,
    borderRadius: 8,
    backgroundColor: COULEURS.carte,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    marginRight: 8,
    justifyContent: 'center',
    padding: 8,
  },
  photoUrl: { fontSize: 11, color: COULEURS.texteSecondaire, textAlign: 'center' },
})
