import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { COULEURS } from '../constants/couleurs'
import { LigneBudget } from './LigneBudget'
import { BarreProgression } from './BarreProgression'
import type { LigneBudget as TypeLigne, Phase } from '../types/budget.types'

const TITRES_PHASES: Record<Phase, string> = {
  phase_1_infrastructure: 'Phase 1 — Infrastructure',
  phase_2_lancement: 'Phase 2 — Lancement',
  phase_3_exploitation: 'Phase 3 — Exploitation',
}

const COULEURS_PHASES: Record<Phase, string> = {
  phase_1_infrastructure: '#5c3d1e',
  phase_2_lancement: '#1a6b8a',
  phase_3_exploitation: '#4a8c3f',
}

const formatMontant = (n: number): string =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })

type Props = {
  phase: Phase
  lignes: TypeLigne[]
  totaux: { prevu: number; reel: number }
  editable: boolean
  onLignePress: (l: TypeLigne) => void
}

export const SectionPhase = ({ phase, lignes, totaux, editable, onLignePress }: Props) => {
  const [ouverte, setOuverte] = useState(true)
  const couleur = COULEURS_PHASES[phase]
  const pourcentage = totaux.prevu === 0 ? 0 : Math.min(100, Math.round((totaux.reel / totaux.prevu) * 100))
  const enDepassement = totaux.reel > totaux.prevu

  return (
    <View style={styles.section}>
      <Pressable
        onPress={() => setOuverte((v) => !v)}
        accessibilityLabel={`Phase ${phase}, ${ouverte ? 'replier' : 'déplier'}`}
        accessibilityRole="button"
        style={({ pressed }) => [styles.entete, { borderTopColor: couleur }, pressed && styles.entetePressee]}
      >
        <View style={styles.entetGauche}>
          <Text style={[styles.titre, { color: couleur }]}>{TITRES_PHASES[phase]}</Text>
          <Text style={styles.compte}>
            {lignes.length} ligne{lignes.length > 1 ? 's' : ''}
          </Text>
        </View>
        <Text style={styles.fleche}>{ouverte ? '▾' : '▸'}</Text>
      </Pressable>

      <View style={styles.totaux}>
        <View style={styles.lignesTotaux}>
          <View style={styles.totauxBloc}>
            <Text style={styles.totauxLabel}>Prévu</Text>
            <Text style={styles.totauxValeur}>{formatMontant(totaux.prevu)} XAF</Text>
          </View>
          <View style={styles.totauxBloc}>
            <Text style={styles.totauxLabel}>Réel</Text>
            <Text style={[styles.totauxValeur, { color: enDepassement ? COULEURS.rouge : couleur }]}>
              {formatMontant(totaux.reel)} XAF
            </Text>
          </View>
        </View>
        <BarreProgression
          pourcentage={pourcentage}
          couleur={enDepassement ? COULEURS.rouge : couleur}
        />
      </View>

      {ouverte ? (
        <View style={styles.lignes}>
          {lignes.map((l) => (
            <LigneBudget
              key={l.id}
              ligne={l}
              editable={editable}
              onPress={() => onLignePress(l)}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
    backgroundColor: COULEURS.carte,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COULEURS.bordure,
  },
  entete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 4,
  },
  entetePressee: { opacity: 0.85 },
  entetGauche: { flex: 1 },
  titre: { fontSize: 16, fontWeight: '700' },
  compte: { fontSize: 12, color: COULEURS.texteSecondaire, marginTop: 2 },
  fleche: { fontSize: 18, color: COULEURS.texteSecondaire, paddingHorizontal: 6 },
  totaux: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.bordure,
    backgroundColor: 'rgba(0,0,0,0.015)',
  },
  lignesTotaux: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  totauxBloc: { flex: 1 },
  totauxLabel: {
    fontSize: 10,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totauxValeur: { fontSize: 16, fontWeight: '700', color: COULEURS.texte, marginTop: 2 },
  lignes: { padding: 12 },
})
