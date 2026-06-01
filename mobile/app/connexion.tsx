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
    <SafeAreaView style={styles.conteneur}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.contenu}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.titre}>Ferme Agropastorale RCA</Text>
          <Text style={styles.sousTitre}>Outil de pilotage</Text>

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

          <View style={styles.bloc}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              value={motDePasse}
              onChangeText={setMotDePasse}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              style={styles.champ}
              accessibilityLabel="Champ mot de passe"
              placeholder="••••••••"
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
            accessibilityLabel="Se connecter"
            accessibilityRole="button"
          >
            {enChargement ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.boutonTexte}>Se connecter</Text>
            )}
          </Pressable>

          <View style={styles.liensSecondaires}>
            {/* Lien « Créer un compte » retiré : la création de compte est
                désormais réservée aux administrateurs (route protégée côté API). */}
            <Pressable
              onPress={() => router.push('/mot-de-passe-oublie')}
              accessibilityLabel="Mot de passe oublié"
              accessibilityRole="link"
              style={({ pressed }) => [styles.lien, pressed && styles.lienPresse]}
            >
              <Text style={styles.lienTexte}>Mot de passe oublié ?</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.replace('/')}
            accessibilityLabel="Continuer en mode consultation"
            accessibilityRole="link"
            style={({ pressed }) => [styles.lienConsultation, pressed && styles.lienPresse]}
          >
            <Text style={styles.lienConsultationTexte}>
              Continuer en mode consultation →
            </Text>
          </Pressable>
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
    fontSize: 16,
    color: COULEURS.texteSecondaire,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 36,
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
  liensSecondaires: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  lien: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  lienTexte: {
    fontSize: 14,
    color: COULEURS.vert,
    fontWeight: '600',
  },
  separateur: {
    color: COULEURS.texteSecondaire,
    fontSize: 14,
  },
  lienConsultation: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  lienPresse: { opacity: 0.6 },
  lienConsultationTexte: {
    fontSize: 15,
    color: COULEURS.vert,
    fontWeight: '600',
  },
})
