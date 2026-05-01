import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@src/store/authStore'
import {
  COULEURS,
  COULEURS_FILIERES,
  ICONES_FILIERES,
  LIBELLES_FILIERES,
  type Filiere,
} from '@src/constants/couleurs'

const LIBELLES_ROLES = {
  admin: 'Administrateur',
  responsable: 'Responsable de filière',
  ouvrier: 'Ouvrier de terrain',
  investisseur: 'Investisseur',
} as const

type Module = {
  id: string
  titre: string
  description: string
  icone: string
  couleur: string
  route?: string
  jalon?: string
}

const MODULES: Module[] = [
  {
    id: 'kanban',
    titre: 'Kanban',
    description: 'Suivi des tâches par filière',
    icone: '📋',
    couleur: COULEURS.vert,
    route: '/kanban',
  },
  {
    id: 'tableau',
    titre: 'Tableau de bord',
    description: 'KPI et alertes en temps réel',
    icone: '📊',
    couleur: '#1a6b8a',
    route: '/dashboard',
  },
  {
    id: 'budget',
    titre: 'Budget',
    description: 'Prévu vs réel par phase',
    icone: '💰',
    couleur: '#e8943a',
    route: '/budget',
  },
  {
    id: 'ferme',
    titre: 'Plan de la ferme',
    description: '8 zones interactives',
    icone: '🗺️',
    couleur: '#7b6e3e',
    route: '/ferme',
  },
]

export default function EcranAccueil() {
  const utilisateur = useAuthStore((s) => s.utilisateur)
  const deconnexion = useAuthStore((s) => s.deconnexion)
  const router = useRouter()

  if (!utilisateur) {
    return null
  }

  const filiereCouleur = utilisateur.filiere
    ? COULEURS_FILIERES[utilisateur.filiere as Filiere]
    : COULEURS.texteSecondaire

  return (
    <SafeAreaView style={styles.conteneur}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.entete}>
          <Text style={styles.salutation}>Bonjour</Text>
          <Text style={styles.prenom}>{utilisateur.prenom} {utilisateur.nom}</Text>
          <View style={styles.metaLigne}>
            <Text style={styles.meta}>{LIBELLES_ROLES[utilisateur.role]}</Text>
            {utilisateur.filiere ? (
              <View style={[styles.pastille, { backgroundColor: filiereCouleur + '22', borderColor: filiereCouleur }]}>
                <Text style={[styles.pastilleTexte, { color: filiereCouleur }]}>
                  {ICONES_FILIERES[utilisateur.filiere as Filiere]} {LIBELLES_FILIERES[utilisateur.filiere as Filiere]}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={styles.section}>Modules</Text>
        <View style={styles.grille}>
          {MODULES.map((m) => {
            const actif = Boolean(m.route)
            return (
              <Pressable
                key={m.id}
                onPress={() => m.route && router.push(m.route as never)}
                disabled={!actif}
                accessibilityLabel={m.titre}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.module,
                  { borderLeftColor: m.couleur },
                  !actif && styles.moduleDesactive,
                  pressed && actif && styles.modulePresse,
                ]}
              >
                <Text style={styles.moduleIcone}>{m.icone}</Text>
                <View style={styles.moduleTexte}>
                  <Text style={styles.moduleTitre}>{m.titre}</Text>
                  <Text style={styles.moduleDescription}>{m.description}</Text>
                  {!actif && m.jalon ? (
                    <Text style={styles.moduleJalon}>À venir · {m.jalon}</Text>
                  ) : null}
                </View>
                {actif ? <Text style={styles.moduleFleche}>›</Text> : null}
              </Pressable>
            )
          })}
        </View>

        <Pressable
          onPress={deconnexion}
          style={({ pressed }) => [styles.bouton, pressed && styles.boutonPresse]}
          accessibilityLabel="Se déconnecter"
          accessibilityRole="button"
        >
          <Text style={styles.boutonTexte}>Se déconnecter</Text>
        </Pressable>

        <Text style={styles.email}>{utilisateur.email}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { padding: 24, paddingTop: 32, paddingBottom: 40 },
  entete: { marginBottom: 28 },
  salutation: { fontSize: 18, color: COULEURS.texteSecondaire },
  prenom: {
    fontSize: 28,
    fontWeight: '700',
    color: COULEURS.texte,
    marginTop: 2,
  },
  metaLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  meta: { fontSize: 14, color: COULEURS.texteSecondaire },
  pastille: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pastilleTexte: { fontSize: 12, fontWeight: '600' },
  section: {
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  grille: { gap: 12, marginBottom: 28 },
  module: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: COULEURS.carte,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COULEURS.bordure,
    borderRightColor: COULEURS.bordure,
    borderBottomColor: COULEURS.bordure,
    minHeight: 72,
  },
  moduleDesactive: { opacity: 0.55 },
  modulePresse: { opacity: 0.85 },
  moduleIcone: { fontSize: 32 },
  moduleTexte: { flex: 1 },
  moduleTitre: { fontSize: 17, fontWeight: '700', color: COULEURS.texte },
  moduleDescription: {
    fontSize: 13,
    color: COULEURS.texteSecondaire,
    marginTop: 2,
  },
  moduleJalon: {
    fontSize: 11,
    color: COULEURS.texteSecondaire,
    marginTop: 4,
    fontStyle: 'italic',
  },
  moduleFleche: { fontSize: 28, color: COULEURS.texteSecondaire, lineHeight: 30 },
  bouton: {
    height: 52,
    backgroundColor: COULEURS.rouge,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  boutonPresse: { opacity: 0.85 },
  boutonTexte: { color: '#fff', fontSize: 17, fontWeight: '600' },
  email: {
    fontSize: 12,
    color: COULEURS.texteSecondaire,
    textAlign: 'center',
    marginTop: 16,
  },
})
