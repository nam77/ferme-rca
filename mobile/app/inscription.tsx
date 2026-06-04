import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@src/store/authStore'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '@src/constants/theme'
import { CadreAuth } from '@src/components/CadreAuth'
import { Bouton, ChampTexte, MessageErreur, LienTexte } from '@src/components/ui'
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
    <CadreAuth titre="Créer un compte" sousTitre="Rejoignez l’équipe de la ferme agropastorale">
      <ChampTexte
        label="Prénom"
        value={prenom}
        onChangeText={setPrenom}
        autoCapitalize="words"
        accessibilityLabel="Champ prénom"
        placeholder="Marie"
      />

      <ChampTexte
        label="Nom"
        value={nom}
        onChangeText={setNom}
        autoCapitalize="words"
        accessibilityLabel="Champ nom"
        placeholder="Bangui"
      />

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
        accessibilityLabel="Champ mot de passe"
        placeholder="8 caractères minimum"
        aide="8 caractères minimum."
      />

      <View style={styles.blocFiliere}>
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
                  styles.puce,
                  actif && styles.puceActive,
                  pressed && styles.pucePressee,
                ]}
              >
                <Text style={[styles.puceTexte, actif && styles.puceTexteActif]}>{f.libelle}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {erreur ? <MessageErreur message={erreur} /> : null}

      <Bouton
        libelle="Créer mon compte"
        onPress={valider}
        variante="primaire"
        enCours={enChargement}
        desactive={!formulaireValide}
        pleinement
        style={styles.bouton}
      />

      <LienTexte libelle="← J’ai déjà un compte" onPress={() => router.replace('/connexion')} variante="terre" />
    </CadreAuth>
  )
}

const styles = StyleSheet.create({
  bouton: { marginTop: ESPACEMENTS.s, height: 52 },
  blocFiliere: { width: '100%', marginBottom: ESPACEMENTS.l },
  label: {
    fontFamily: POLICES.sansMedium,
    fontSize: 14,
    color: COULEURS_TOKEN.earth,
    marginBottom: ESPACEMENTS.s,
  },
  filiereGrille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACEMENTS.s,
  },
  puce: {
    paddingHorizontal: ESPACEMENTS.m,
    paddingVertical: ESPACEMENTS.s,
    borderRadius: RAYONS.pastille,
    borderWidth: 1.5,
    borderColor: COULEURS_TOKEN.bordure,
    backgroundColor: COULEURS_TOKEN.cream,
  },
  puceActive: {
    borderColor: COULEURS_TOKEN.mint,
    backgroundColor: COULEURS_TOKEN.mint + '18',
  },
  pucePressee: { opacity: 0.7 },
  puceTexte: {
    fontFamily: POLICES.sansMedium,
    fontSize: 14,
    color: COULEURS_TOKEN.earth,
  },
  puceTexteActif: {
    fontFamily: POLICES.sansBold,
    color: COULEURS_TOKEN.mint,
  },
})
