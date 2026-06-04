import { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '@src/constants/theme'
import { CadreAuth } from '@src/components/CadreAuth'
import { Bouton, ChampTexte, MessageErreur } from '@src/components/ui'
import { reinitialiserAvecToken } from '@src/api/auth.api'

// Écran ouvert depuis le lien reçu par email : /reinitialiser?token=...
export default function EcranReinitialiser() {
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [motDePasse, setMotDePasse] = useState('')
  const [confirme, setConfirme] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enChargement, setEnChargement] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)

  const formulaireValide = motDePasse.length >= 8 && motDePasse === confirme

  const valider = async () => {
    if (!token) {
      setErreur('Lien invalide ou incomplet.')
      return
    }
    setErreur(null)
    setEnChargement(true)
    try {
      const message = await reinitialiserAvecToken(token, motDePasse)
      setConfirmation(message)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Échec de la réinitialisation')
    } finally {
      setEnChargement(false)
    }
  }

  if (!token) {
    return (
      <CadreAuth titre="Lien invalide" sousTitre="Ce lien de réinitialisation est incomplet ou expiré.">
        <Bouton
          libelle="Demander un nouveau lien"
          onPress={() => router.replace('/mot-de-passe-oublie')}
          variante="primaire"
          pleinement
          style={styles.bouton}
        />
      </CadreAuth>
    )
  }

  return (
    <CadreAuth
      titre="Nouveau mot de passe"
      sousTitre="Choisissez un nouveau mot de passe (8 caractères minimum)."
    >
      {confirmation ? (
        <View style={styles.confirmation}>
          <Text style={styles.confirmationTexte}>{confirmation}</Text>
          <Bouton
            libelle="Se connecter"
            onPress={() => router.replace('/connexion')}
            variante="primaire"
            pleinement
            style={styles.bouton}
          />
        </View>
      ) : (
        <>
          <ChampTexte
            label="Nouveau mot de passe"
            value={motDePasse}
            onChangeText={setMotDePasse}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            accessibilityLabel="Nouveau mot de passe"
            placeholder="••••••••"
          />
          <ChampTexte
            label="Confirmer le mot de passe"
            value={confirme}
            onChangeText={setConfirme}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            accessibilityLabel="Confirmer le mot de passe"
            placeholder="••••••••"
          />

          {erreur ? <MessageErreur message={erreur} /> : null}

          <Bouton
            libelle="Réinitialiser"
            onPress={valider}
            variante="primaire"
            enCours={enChargement}
            desactive={!formulaireValide}
            pleinement
            style={styles.bouton}
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
