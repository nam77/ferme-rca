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
import type { Filiere } from '@src/types/auth.types'

const FILIERES: { valeur: Filiere; libelle: string }[] = [
  { valeur: 'pisciculture', libelle: 'Pisciculture' },
  { valeur: 'aviculture', libelle: 'Aviculture' },
  { valeur: 'porcins', libelle: 'Porcins' },
  { valeur: 'caprins', libelle: 'Caprins/Ovins' },
  { valeur: 'cultures', libelle: 'Cultures' },
  { valeur: 'infrastructure', libelle: 'Infrastructure' },
]

export default function EcranInscription() {
  const router = useRouter()
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [filiere, setFiliere] = useState<Filiere | null>(null)

  const enChargement = useAuthStore((s) => s.enChargement)
  const erreur = useAuthStore((s) => s.erreur)
  const inscription = useAuthStore((s) => s.inscription)

  const formulaireValide =
    prenom.trim().length >= 1 &&
    nom.trim().length >= 1 &&
    email.includes('@') &&
    motDePasse.length >= 8

  const valider = async () => {
    try {
      await inscription({
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: email.trim().toLowerCase(),
        motDePasse,
        filiere: filiere ?? undefined,
      })
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
          <Text style={styles.titre}>Créer un compte</Text>
          <Text style={styles.sousTitre}>
            Rejoignez l&apos;équipe de la ferme agropastorale
          </Text>

          <View style={styles.ligne}>
            <View style={[styles.bloc, styles.demiLargeur]}>
              <Text style={styles.label}>Prénom</Text>
              <TextInput
                value={prenom}
                onChangeText={setPrenom}
                autoCapitalize="words"
                style={styles.champ}
                accessibilityLabel="Champ prénom"
                placeholder="Marie"
                placeholderTextColor="#999"
              />
            </View>
            <View style={[styles.bloc, styles.demiLargeur]}>
              <Text style={styles.label}>Nom</Text>
              <TextInput
                value={nom}
                onChangeText={setNom}
                autoCapitalize="words"
                style={styles.champ}
                accessibilityLabel="Champ nom"
                placeholder="Bangui"
                placeholderTextColor="#999"
              />
            </View>
          </View>

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
              style={styles.champ}
              accessibilityLabel="Champ mot de passe"
              placeholder="8 caractères minimum"
              placeholderTextColor="#999"
            />
            <Text style={styles.aide}>8 caractères minimum.</Text>
          </View>

          <View style={styles.bloc}>
            <Text style={styles.label}>Filière (optionnel)</Text>
            <View style={styles.filiereGrille}>
              {FILIERES.map((f) => {
                const actif = filiere === f.valeur
                return (
                  <Pressable
                    key={f.valeur}
                    onPress={() => setFiliere(actif ? null : f.valeur)}
                    accessibilityLabel={`Filière ${f.libelle}`}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.filierePuce,
                      actif && styles.filierePuceActive,
                      pressed && styles.filierePucePressee,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filierePuceTexte,
                        actif && styles.filierePuceTexteActif,
                      ]}
                    >
                      {f.libelle}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
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
            accessibilityLabel="Créer mon compte"
            accessibilityRole="button"
          >
            {enChargement ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.boutonTexte}>Créer mon compte</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.replace('/connexion')}
            accessibilityLabel="Retour à la connexion"
            accessibilityRole="link"
            style={({ pressed }) => [styles.lien, pressed && styles.lienPresse]}
          >
            <Text style={styles.lienTexte}>← J&apos;ai déjà un compte</Text>
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
    marginBottom: 28,
  },
  ligne: { flexDirection: 'row', gap: 12 },
  demiLargeur: { flex: 1 },
  bloc: { marginBottom: 16 },
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
  aide: {
    marginTop: 6,
    fontSize: 12,
    color: COULEURS.texteSecondaire,
  },
  filiereGrille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filierePuce: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    backgroundColor: COULEURS.carte,
  },
  filierePuceActive: {
    borderColor: COULEURS.vert,
    backgroundColor: COULEURS.vert + '18',
  },
  filierePucePressee: { opacity: 0.7 },
  filierePuceTexte: {
    fontSize: 14,
    color: COULEURS.texte,
    fontWeight: '500',
  },
  filierePuceTexteActif: {
    color: COULEURS.vert,
    fontWeight: '700',
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
})
