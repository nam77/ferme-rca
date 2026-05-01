import { View, Text, Pressable, StyleSheet } from 'react-native'
import {
  COULEURS_FILIERES,
  ICONES_FILIERES,
  LIBELLES_FILIERES,
  type Filiere as FiliereCouleur,
} from '../constants/couleurs'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../constants/theme'
import type { Tache } from '../types/tache.types'

const calculerJoursRestants = (iso: string | null): number | null => {
  if (!iso) return null
  const minuit = new Date()
  minuit.setHours(0, 0, 0, 0)
  const cible = new Date(iso)
  cible.setHours(0, 0, 0, 0)
  return Math.round((cible.getTime() - minuit.getTime()) / (1000 * 60 * 60 * 24))
}

type EtiquetteEcheance = { texte: string; couleurFond: string; couleurBordure: string; couleurTexte: string }

const etiquetteEcheance = (jours: number | null): EtiquetteEcheance | null => {
  if (jours === null) return null
  if (jours < 0) {
    return {
      texte: `En retard · ${Math.abs(jours)}j`,
      couleurFond: 'rgba(231,76,60,0.10)',
      couleurBordure: 'rgba(231,76,60,0.40)',
      couleurTexte: COULEURS_TOKEN.rouge,
    }
  }
  if (jours === 0) {
    return {
      texte: "Aujourd'hui · 0j",
      couleurFond: 'rgba(243,156,18,0.12)',
      couleurBordure: 'rgba(243,156,18,0.40)',
      couleurTexte: COULEURS_TOKEN.aviculture,
    }
  }
  if (jours === 1) {
    return {
      texte: 'Demain · 1j',
      couleurFond: 'rgba(243,156,18,0.10)',
      couleurBordure: 'rgba(243,156,18,0.35)',
      couleurTexte: COULEURS_TOKEN.aviculture,
    }
  }
  if (jours <= 7) {
    return {
      texte: `Bientôt · ${jours}j`,
      couleurFond: 'rgba(74,140,63,0.10)',
      couleurBordure: 'rgba(74,140,63,0.35)',
      couleurTexte: COULEURS_TOKEN.mint,
    }
  }
  return {
    texte: `Dans ${jours}j`,
    couleurFond: 'rgba(92,61,30,0.06)',
    couleurBordure: COULEURS_TOKEN.bordure,
    couleurTexte: COULEURS_TOKEN.earth,
  }
}

const ETIQUETTES_STATUT: Record<Tache['statut'], { texte: string; couleurTexte: string; couleurFond: string; couleurBordure: string }> = {
  a_faire: {
    texte: 'Faisable',
    couleurTexte: COULEURS_TOKEN.water,
    couleurFond: 'rgba(26,107,138,0.10)',
    couleurBordure: 'rgba(26,107,138,0.30)',
  },
  en_cours: {
    texte: 'Lancé',
    couleurTexte: COULEURS_TOKEN.aviculture,
    couleurFond: 'rgba(232,148,58,0.12)',
    couleurBordure: 'rgba(232,148,58,0.40)',
  },
  termine: {
    texte: 'Bouclé',
    couleurTexte: COULEURS_TOKEN.mint,
    couleurFond: 'rgba(74,140,63,0.10)',
    couleurBordure: 'rgba(74,140,63,0.35)',
  },
}

const initiales = (prenom: string, nom: string): string =>
  `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()

type Props = {
  tache: Tache
  onPress?: () => void
}

export const CarteTacheIso = ({ tache, onPress }: Props) => {
  const couleurFiliere = COULEURS_FILIERES[tache.filiere as FiliereCouleur]
  const iconeFiliere = ICONES_FILIERES[tache.filiere as FiliereCouleur]
  const libelleFiliere = LIBELLES_FILIERES[tache.filiere as FiliereCouleur]
  const jours = calculerJoursRestants(tache.dateLimite)
  const echeance = etiquetteEcheance(jours)
  const statutEtiq = ETIQUETTES_STATUT[tache.statut]

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Tâche : ${tache.titre}`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.carte, pressed && styles.cartePressee]}
    >
      <View
        style={[
          styles.tagFiliere,
          {
            backgroundColor: couleurFiliere + '15',
            borderColor: couleurFiliere + '60',
          },
        ]}
      >
        <Text style={styles.tagFiliereIcone}>{iconeFiliere}</Text>
        <Text style={[styles.tagFiliereTexte, { color: couleurFiliere }]}>
          {libelleFiliere.toUpperCase()}
        </Text>
      </View>

      <Text style={styles.titre} numberOfLines={2}>
        {tache.titre}
      </Text>

      {tache.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {tache.description}
        </Text>
      ) : null}

      <View style={styles.pied}>
        <View style={styles.piedGauche}>
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
        </View>

        <View style={styles.piedDroite}>
          <View
            style={[
              styles.miniPastille,
              {
                backgroundColor: statutEtiq.couleurFond,
                borderColor: statutEtiq.couleurBordure,
              },
            ]}
          >
            <Text style={[styles.miniPastilleTexte, { color: statutEtiq.couleurTexte }]}>
              {statutEtiq.texte}
            </Text>
          </View>
          {echeance ? (
            <View
              style={[
                styles.miniPastille,
                {
                  backgroundColor: echeance.couleurFond,
                  borderColor: echeance.couleurBordure,
                },
              ]}
            >
              <Text style={[styles.miniPastilleTexte, { color: echeance.couleurTexte }]}>
                {echeance.texte}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: COULEURS_TOKEN.carte,
    borderRadius: RAYONS.moyen,
    padding: ESPACEMENTS.m + 2,
    marginBottom: ESPACEMENTS.s + 2,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
    shadowColor: COULEURS_TOKEN.ombre,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  cartePressee: { opacity: 0.85 },
  tagFiliere: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: ESPACEMENTS.s,
    paddingVertical: 3,
    borderRadius: RAYONS.petit,
    borderWidth: 1,
    marginBottom: ESPACEMENTS.s,
  },
  tagFiliereIcone: { fontSize: 11 },
  tagFiliereTexte: {
    fontFamily: POLICES.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  titre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 15,
    color: COULEURS_TOKEN.soil,
    lineHeight: 19,
  },
  description: {
    fontFamily: POLICES.sans,
    fontSize: 12.5,
    color: COULEURS_TOKEN.earth,
    lineHeight: 17,
    marginTop: 4,
  },
  pied: {
    marginTop: ESPACEMENTS.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACEMENTS.s,
  },
  piedGauche: { flexDirection: 'row', alignItems: 'center' },
  piedDroite: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarVide: { backgroundColor: 'rgba(92,61,30,0.10)' },
  avatarTexte: {
    fontFamily: POLICES.monoMedium,
    color: '#fff',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  avatarTexteVide: { fontFamily: POLICES.mono, color: COULEURS_TOKEN.clay, fontSize: 12 },
  miniPastille: {
    paddingHorizontal: ESPACEMENTS.s,
    paddingVertical: 2,
    borderRadius: RAYONS.petit,
    borderWidth: 1,
  },
  miniPastilleTexte: {
    fontFamily: POLICES.monoMedium,
    fontSize: 10,
    letterSpacing: 0.4,
  },
})
