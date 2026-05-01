import { View, Text, Pressable, StyleSheet } from 'react-native'
import { BadgePriorite } from './BadgePriorite'
import {
  COULEURS,
  COULEURS_FILIERES,
  ICONES_FILIERES,
  type Filiere as FiliereCouleur,
} from '../constants/couleurs'
import type { Tache } from '../types/tache.types'

const formatDate = (iso: string | null): string | null => {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const calculerJoursRestants = (iso: string | null): number | null => {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

const initiales = (prenom: string, nom: string): string =>
  `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()

type Props = {
  tache: Tache
  onPress?: () => void
}

export const CarteTache = ({ tache, onPress }: Props) => {
  const couleurFiliere = COULEURS_FILIERES[tache.filiere as FiliereCouleur]
  const icone = ICONES_FILIERES[tache.filiere as FiliereCouleur]
  const dateLabel = formatDate(tache.dateLimite)
  const jours = calculerJoursRestants(tache.dateLimite)
  const enRetard = jours !== null && jours < 0 && tache.statut !== 'termine'

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Tâche : ${tache.titre}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.carte,
        { borderLeftColor: couleurFiliere },
        pressed && styles.cartePressee,
      ]}
    >
      <View style={styles.entete}>
        <Text style={styles.icone}>{icone}</Text>
        <Text style={styles.titre} numberOfLines={2}>
          {tache.titre}
        </Text>
        <BadgePriorite priorite={tache.priorite} />
      </View>

      {tache.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {tache.description}
        </Text>
      ) : null}

      <View style={styles.pied}>
        {tache.responsable ? (
          <View style={[styles.avatar, { backgroundColor: couleurFiliere }]}>
            <Text style={styles.avatarTexte}>
              {initiales(tache.responsable.prenom, tache.responsable.nom)}
            </Text>
          </View>
        ) : (
          <View style={[styles.avatar, styles.avatarVide]}>
            <Text style={styles.avatarTexteVide}>?</Text>
          </View>
        )}
        {dateLabel ? (
          <View style={styles.dateBloc}>
            <Text style={[styles.dateTexte, enRetard && styles.dateRetard]}>
              📅 {dateLabel}
            </Text>
            {jours !== null ? (
              <Text style={[styles.joursTexte, enRetard && styles.dateRetard]}>
                {jours < 0
                  ? `${Math.abs(jours)} j de retard`
                  : jours === 0
                    ? "aujourd'hui"
                    : `${jours} j restants`}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.dateTexteVide}>sans échéance</Text>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: COULEURS.carte,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COULEURS.bordure,
    borderRightColor: COULEURS.bordure,
    borderBottomColor: COULEURS.bordure,
    shadowColor: COULEURS.ombre,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  cartePressee: { opacity: 0.85 },
  entete: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  icone: { fontSize: 20 },
  titre: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COULEURS.texte,
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    color: COULEURS.texteSecondaire,
    marginTop: 8,
    lineHeight: 18,
  },
  pied: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarVide: { backgroundColor: 'rgba(0,0,0,0.06)' },
  avatarTexte: { color: '#fff', fontSize: 11, fontWeight: '700' },
  avatarTexteVide: { color: COULEURS.texteSecondaire, fontSize: 13 },
  dateBloc: { alignItems: 'flex-end' },
  dateTexte: { fontSize: 12, color: COULEURS.texteSecondaire, fontWeight: '500' },
  dateRetard: { color: COULEURS.rouge, fontWeight: '700' },
  joursTexte: { fontSize: 11, color: COULEURS.texteSecondaire, marginTop: 2 },
  dateTexteVide: { fontSize: 12, color: COULEURS.texteSecondaire, fontStyle: 'italic' },
})
