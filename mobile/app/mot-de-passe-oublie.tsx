import { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@src/store/authStore'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '@src/constants/theme'
import { CadreAuth } from '@src/components/CadreAuth'
import { Bouton, ChampTexte, MessageErreur, LienTexte } from '@src/components/ui'

export default function EcranMotDePasseOublie() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [confirmation, setConfirmation] = useState<string | null>(null)

  const enChargement = useAuthStore((s) => s.enChargement)
  const erreur = useAuthStore((s) => s.erreur)
  const demanderReset = useAuthStore((s) => s.demanderReset)

  const formulaireValide = email.includes('@')

  const valider = async () => {
    try {
      const message = await demanderReset(email.trim().toLowerCase())
      setConfirmation(message)
    } catch {
      // erreur gérée dans le store
    }
  }

  return (
    <CadreAuth
      titre="Mot de passe oublié"
      sousTitre="Saisissez votre adresse email. Un administrateur de la ferme sera notifié pour réinitialiser votre accès."
    >
      {confirmation ? (
        <View style={styles.confirmation}>
          <Text style={styles.confirmationTexte}>{confirmation}</Text>
          <Bouton
            libelle="Retour à la connexion"
            onPress={() => router.replace('/connexion')}
            variante="primaire"
            pleinement
            style={styles.bouton}
          />
        </View>
      ) : (
        <>
          <ChampTexte
            label="Adresse email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            accessibilityLabel="Champ email"
            placeholder="vous@ferme.rca"
          />

          {erreur ? <MessageErreur message={erreur} /> : null}

          <Bouton
            libelle="Envoyer la demande"
            onPress={valider}
            variante="primaire"
            enCours={enChargement}
            desactive={!formulaireValide}
            pleinement
            style={styles.bouton}
          />

          <LienTexte
            libelle="← Retour à la connexion"
            onPress={() => router.replace('/connexion')}
            variante="terre"
          />
        </>
      )}
    </CadreAuth>
  )
}

const styles = StyleSheet.create({
  bouton: { marginTop: ESPACEMENTS.s, height: 52 },
  confirmation: {
    width: '100%',
    padding: ESPACEMENTS.l,
    backgroundColor: 'rgba(39,174,96,0.10)',
    borderRadius: RAYONS.moyen,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.vert,
    gap: ESPACEMENTS.l,
  },
  confirmationTexte: {
    fontFamily: POLICES.sans,
    fontSize: 15,
    color: COULEURS_TOKEN.soil,
    lineHeight: 22,
    textAlign: 'center',
  },
})
