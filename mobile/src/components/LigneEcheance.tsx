import { View, Text, StyleSheet } from 'react-native'
import {
  COULEURS,
  COULEURS_FILIERES,
  ICONES_FILIERES,
  type Filiere,
} from '../constants/couleurs'
import type { Tache } from '../types/tache.types'

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const calculerJours = (iso: string): number =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

type Props = { tache: Tache }

export const LigneEcheance = ({ tache }: Props) => {
  const couleur = COULEURS_FILIERES[tache.filiere as Filiere]
  const icone = ICONES_FILIERES[tache.filiere as Filiere]
  const jours = tache.dateLimite ? calculerJours(tache.dateLimite) : null
  const enRetard = jours !== null && jours < 0

  return (
    <View style={[styles.ligne, { borderLeftColor: couleur }]}>
      <Text style={styles.icone}>{icone}</Text>
      <View style={styles.bloc}>
        <Text style={styles.titre} numberOfLines={2}>
          {tache.titre}
        </Text>
        {tache.responsable ? (
          <Text style={styles.responsable}>
            {tache.responsable.prenom} {tache.responsable.nom}
          </Text>
        ) : (
          <Text style={styles.responsableVide}>Non assignée</Text>
        )}
      </View>
      {tache.dateLimite ? (
        <View style={styles.dateBloc}>
          <Text style={[styles.date, enRetard && styles.dateRetard]}>
            {formatDate(tache.dateLimite)}
          </Text>
          {jours !== null ? (
            <Text style={[styles.jours, enRetard && styles.dateRetard]}>
              {jours < 0
                ? `${Math.abs(jours)} j retard`
                : jours === 0
                  ? "aujourd'hui"
                  : `dans ${jours} j`}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COULEURS.carte,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COULEURS.bordure,
    borderRightColor: COULEURS.bordure,
    borderBottomColor: COULEURS.bordure,
  },
  icone: { fontSize: 22 },
  bloc: { flex: 1 },
  titre: { fontSize: 14, color: COULEURS.texte, fontWeight: '600' },
  responsable: { fontSize: 12, color: COULEURS.texteSecondaire, marginTop: 2 },
  responsableVide: { fontSize: 12, color: COULEURS.texteSecondaire, fontStyle: 'italic', marginTop: 2 },
  dateBloc: { alignItems: 'flex-end' },
  date: { fontSize: 13, color: COULEURS.texte, fontWeight: '600' },
  dateRetard: { color: COULEURS.rouge },
  jours: { fontSize: 11, color: COULEURS.texteSecondaire, marginTop: 2 },
})
