import { useState } from 'react'
import { Pressable, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@src/store/authStore'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '@src/constants/theme'
import { CadreAuth } from '@src/components/CadreAuth'
import { Bouton, ChampTexte, MessageErreur, LienTexte } from '@src/components/ui'

export default function EcranConnexion() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const enChargement = useAuthStore((s) => s.enChargement)
  const erreur = useAuthStore((s) => s.erreur)
  const connexion = useAuthStore((s) => s.connexion)

  const valider = async () => {
    try {
      await connexion(email.trim().toLowerCase(), motDePasse)
    } catch {
      // erreur gérée dans le store
    }
  }

  const formulaireValide = email.includes('@') && motDePasse.length >= 1

  return (
    <CadreAuth
      titre="Connexion"
      piedDePage={
        <Pressable
          onPress={() => router.replace('/')}
          accessibilityLabel="Continuer en mode consultation"
          accessibilityRole="link"
          style={({ pressed }) => [styles.consultation, pressed && styles.consultationPressee]}
        >
          <Text style={styles.consultationTexte}>Continuer en mode consultation →</Text>
        </Pressable>
      }
    >
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

      <ChampTexte
        label="Mot de passe"
        value={motDePasse}
        onChangeText={setMotDePasse}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        accessibilityLabel="Champ mot de passe"
        placeholder="••••••••"
      />

      {erreur ? <MessageErreur message={erreur} /> : null}

      <Bouton
        libelle="Se connecter"
        onPress={valider}
        variante="primaire"
        enCours={enChargement}
        desactive={!formulaireValide}
        pleinement
        style={styles.bouton}
      />

      <LienTexte libelle="Mot de passe oublié ?" onPress={() => router.push('/mot-de-passe-oublie')} />
    </CadreAuth>
  )
}

const styles = StyleSheet.create({
  bouton: { marginTop: ESPACEMENTS.s, height: 52 },
  consultation: {
    marginTop: ESPACEMENTS.xl,
    alignSelf: 'center',
    paddingVertical: ESPACEMENTS.m,
    paddingHorizontal: ESPACEMENTS.l,
    backgroundColor: 'rgba(250,246,238,0.85)',
    borderRadius: RAYONS.pastille,
  },
  consultationPressee: { opacity: 0.6 },
  consultationTexte: {
    fontFamily: POLICES.monoMedium,
    fontSize: 13,
    letterSpacing: 0.5,
    color: COULEURS_TOKEN.earth,
  },
})
