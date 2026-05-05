import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@src/store/authStore'
import { COULEURS } from '@src/constants/couleurs'

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
    <SafeAreaView style={styles.conteneur}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.contenu}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.titre}>Mot de passe oublié</Text>
          <Text style={styles.sousTitre}>
            Saisissez votre adresse email. Un administrateur de la ferme sera
            notifié pour réinitialiser votre accès.
          </Text>

          {confirmation ? (
            <View style={styles.confirmation}>
              <Text style={styles.confirmationTexte}>{confirmation}</Text>
              <Pressable
                onPress={() => router.replace('/connexion')}
                accessibilityLabel="Retour à la connexion"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.bouton,
                  pressed && styles.boutonPresse,
                ]}
              >
                <Text style={styles.boutonTexte}>Retour à la connexion</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.bloc}>
                <Text style={styles.label}>Adresse email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.champ}
                  accessibilityLabel="Champ email"
                  placeholder="vous@ferme.rca"
                  placeholderTextColor="#999"
                />
              </View>

              {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

              <Pressable
                onPress={valider}
                disabled={!formulaireValide || enChargement}
                style={({ pressed }) => [
                  styles.bouton,
                  (!formulaireValide || enChargement) && styles.boutonDesactive,
                  pressed && styles.boutonPresse,
                ]}
                accessibilityLabel="Envoyer la demande"
                accessibilityRole="button"
              >
                {enChargement ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.boutonTexte}>Envoyer la demande</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => router.replace('/connexion')}
                accessibilityLabel="Retour à la connexion"
                accessibilityRole="link"
                style={({ pressed }) => [
                  styles.lien,
                  pressed && styles.lienPresse,
                ]}
              >
                <Text style={styles.lienTexte}>← Retour à la connexion</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS.fond },
  flex: { flex: 1 },
  contenu: { padding: 24, paddingTop: 40 },
  titre: {
    fontSize: 28,
    fontWeight: '700',
    color: COULEURS.texte,
    textAlign: 'center',
  },
  sousTitre: {
    fontSize: 15,
    color: COULEURS.texteSecondaire,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 21,
  },
  bloc: { marginBottom: 18 },
  label: {
    fontSize: 16,
    color: COULEURS.texte,
    marginBottom: 8,
    fontWeight: '500',
  },
  champ: {
    height: 52,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COULEURS.texte,
    backgroundColor: COULEURS.carte,
  },
  erreur: {
    color: COULEURS.rouge,
    fontSize: 15,
    marginBottom: 12,
    textAlign: 'center',
  },
  bouton: {
    height: 52,
    backgroundColor: COULEURS.vert,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  boutonDesactive: { opacity: 0.5 },
  boutonPresse: { opacity: 0.85 },
  boutonTexte: { color: '#fff', fontSize: 17, fontWeight: '600' },
  lien: {
    marginTop: 20,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  lienPresse: { opacity: 0.6 },
  lienTexte: {
    fontSize: 15,
    color: COULEURS.vert,
    fontWeight: '600',
  },
  confirmation: {
    padding: 20,
    backgroundColor: COULEURS.carte,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COULEURS.vert,
    gap: 16,
  },
  confirmationTexte: {
    fontSize: 15,
    color: COULEURS.texte,
    lineHeight: 22,
    textAlign: 'center',
  },
})
