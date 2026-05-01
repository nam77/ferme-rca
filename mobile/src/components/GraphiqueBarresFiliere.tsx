import { View, Text, StyleSheet } from 'react-native'
import {
  COULEURS,
  COULEURS_FILIERES,
  ICONES_FILIERES,
  LIBELLES_FILIERES,
  type Filiere,
} from '../constants/couleurs'

type Props = {
  donnees: Record<Filiere, number>
}

export const GraphiqueBarresFiliere = ({ donnees }: Props) => {
  const max = Math.max(...Object.values(donnees), 1)
  const filieres = Object.keys(donnees) as Filiere[]

  return (
    <View style={styles.conteneur}>
      {filieres.map((f) => {
        const valeur = donnees[f]
        const pourcentage = max === 0 ? 0 : (valeur / max) * 100
        const couleur = COULEURS_FILIERES[f]
        return (
          <View key={f} style={styles.ligne}>
            <View style={styles.libelle}>
              <Text style={styles.icone}>{ICONES_FILIERES[f]}</Text>
              <Text style={styles.nom} numberOfLines={1}>
                {LIBELLES_FILIERES[f]}
              </Text>
            </View>
            <View style={styles.pisteBarre}>
              <View
                style={[
                  styles.barre,
                  { width: `${pourcentage}%`, backgroundColor: couleur },
                ]}
              />
            </View>
            <Text style={[styles.valeur, { color: couleur }]}>{valeur}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  conteneur: { gap: 10 },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  libelle: {
    width: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icone: { fontSize: 16 },
  nom: { fontSize: 13, color: COULEURS.texte, flex: 1 },
  pisteBarre: {
    flex: 1,
    height: 22,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barre: {
    height: '100%',
    borderRadius: 6,
  },
  valeur: {
    width: 28,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '700',
  },
})
