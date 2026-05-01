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
import { useAuthStore } from '@src/store/authStore'
import { COULEURS } from '@src/constants/couleurs'

export default function EcranConnexion() {
  const [email, setEmail] = useState('admin@ferme.rca')
  const [motDePasse, setMotDePasse] = useState('admin123')
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

          <View style={styles.aide}>
            <Text style={styles.aideTitre}>Comptes de démonstration</Text>
            <Text style={styles.aideLigne}>admin@ferme.rca · admin123</Text>
            <Text style={styles.aideLigne}>pisciculture@ferme.rca · responsable123</Text>
            <Text style={styles.aideLigne}>ouvrier@ferme.rca · ouvrier123</Text>
            <Text style={styles.aideLigne}>investisseur@ferme.rca · investisseur123</Text>
          </View>
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
  aide: {
    marginTop: 32,
    padding: 16,
    backgroundColor: COULEURS.carte,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
  },
  aideTitre: {
    fontSize: 14,
    fontWeight: '600',
    color: COULEURS.texteSecondaire,
    marginBottom: 8,
  },
  aideLigne: { fontSize: 13, color: COULEURS.texteSecondaire, marginVertical: 2 },
})
