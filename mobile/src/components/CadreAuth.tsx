import type { ReactNode } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '@src/constants/theme'
import { SceneFerme } from './SceneFerme'

type Props = {
  // Titre de la carte (« Connexion », « Créer un compte », …).
  titre: string
  // Sous-titre optionnel sous le titre.
  sousTitre?: string
  // Contenu du formulaire (champs, bouton, liens internes à la carte).
  children: ReactNode
  // Contenu optionnel rendu sous la carte (ex. lien « mode consultation »).
  piedDePage?: ReactNode
}

// Cadre commun à tous les écrans d'authentification : décor animé en fond
// (maintenu jusqu'à la connexion réussie) et carte de marque centrée.
export const CadreAuth = ({ titre, sousTitre, children, piedDePage }: Props) => (
  <View style={styles.conteneur}>
    {/* Décor animé partagé, maintenu en fond. */}
    <SceneFerme />

    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.contenu}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.carte}>
            <View style={styles.entete}>
              <Text style={styles.tag}>AGROPASTORALE RCA · 8 HECTARES</Text>
              <Text style={styles.logo}>
                AGRO<Text style={styles.logoAccent}>PILOT</Text>
              </Text>
              <Text style={styles.titre}>{titre}</Text>
              {sousTitre ? <Text style={styles.sousTitre}>{sousTitre}</Text> : null}
            </View>
            {children}
          </View>
          {piedDePage}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>
)

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS_TOKEN.wheat },
  flex: { flex: 1 },
  // Centre verticalement le formulaire sur le décor.
  contenu: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ESPACEMENTS.xl,
    paddingVertical: ESPACEMENTS.xxl,
  },
  carte: {
    width: '100%',
    maxWidth: 420,
    padding: ESPACEMENTS.xl,
    backgroundColor: 'rgba(250,246,238,0.95)',
    borderRadius: RAYONS.grand,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
    shadowColor: COULEURS_TOKEN.soil,
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
    alignItems: 'center',
  },
  entete: {
    width: '100%',
    alignItems: 'center',
    marginBottom: ESPACEMENTS.xl,
  },
  tag: {
    fontFamily: POLICES.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    color: COULEURS_TOKEN.earth,
    textTransform: 'uppercase',
    marginBottom: ESPACEMENTS.s,
    textAlign: 'center',
  },
  logo: {
    fontFamily: POLICES.serif,
    fontSize: 38,
    lineHeight: 42,
    color: COULEURS_TOKEN.soil,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  logoAccent: {
    fontFamily: POLICES.serifItalique,
    color: COULEURS_TOKEN.leaf,
  },
  titre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 18,
    color: COULEURS_TOKEN.earth,
    marginTop: ESPACEMENTS.s,
    textAlign: 'center',
  },
  sousTitre: {
    fontFamily: POLICES.sans,
    fontSize: 14,
    lineHeight: 20,
    color: COULEURS_TOKEN.earth,
    textAlign: 'center',
    marginTop: ESPACEMENTS.s,
  },
})
