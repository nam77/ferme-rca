import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@src/store/authStore'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES } from '@src/constants/theme'
import {
  COULEURS_FILIERES,
  ICONES_FILIERES,
  LIBELLES_FILIERES,
  type Filiere,
} from '@src/constants/couleurs'
import { Hero, Pastille, Card, Bouton, Tag } from '@src/components/ui'

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
  route: string
  tag: string
}

const MODULES: Module[] = [
  {
    id: 'kanban',
    titre: 'Kanban',
    description: 'Suivi des tâches par filière, glisser-déposer entre colonnes.',
    icone: '📋',
    couleur: COULEURS_TOKEN.mint,
    route: '/kanban',
    tag: 'Opérations',
  },
  {
    id: 'tableau',
    titre: 'Tableau de bord',
    description: 'Indicateurs de progression, échéances, activité récente.',
    icone: '📊',
    couleur: COULEURS_TOKEN.water,
    route: '/dashboard',
    tag: 'Pilotage',
  },
  {
    id: 'budget',
    titre: 'Budget',
    description: 'Prévu vs réel, par phase. Investissement et exploitation.',
    icone: '💰',
    couleur: COULEURS_TOKEN.aviculture,
    route: '/budget',
    tag: 'Finance',
  },
  {
    id: 'ferme',
    titre: 'Plan de la ferme',
    description: '8 zones interactives sur les 8 hectares.',
    icone: '🗺️',
    couleur: COULEURS_TOKEN.caprins,
    route: '/ferme',
    tag: 'Spatial',
  },
  {
    id: 'cheptel',
    titre: 'Cheptel',
    description: 'Effectifs et mouvements par espèce. Naissances, ventes, mortalités.',
    icone: '🐾',
    couleur: COULEURS_TOKEN.porcins,
    route: '/cheptel',
    tag: 'Animaux',
  },
  {
    id: 'cultures',
    titre: 'Cultures',
    description: 'Parcelles agricoles : semis, fertilisation, récoltes.',
    icone: '🌾',
    couleur: COULEURS_TOKEN.cultures,
    route: '/cultures',
    tag: 'Végétal',
  },
]

export default function EcranAccueil() {
  const utilisateur = useAuthStore((s) => s.utilisateur)
  const deconnexion = useAuthStore((s) => s.deconnexion)
  const router = useRouter()

  const filiereCouleur = utilisateur?.filiere
    ? COULEURS_FILIERES[utilisateur.filiere as Filiere]
    : COULEURS_TOKEN.earth

  return (
    <SafeAreaView style={styles.conteneur} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        {utilisateur ? (
          <Hero
            tag="AGROPASTORALE RCA · 8 HECTARES"
            titre="Bonjour"
            titreEmphase={utilisateur.prenom}
            sousTitre={"Pilotage en temps réel de la ferme : tâches, cheptel, budget et plan d’aménagement."}
          >
            <View style={styles.metaHero}>
              <Pastille variante="paille">{LIBELLES_ROLES[utilisateur.role]}</Pastille>
              {utilisateur.filiere ? (
                <Pastille
                  couleurPersonnalisee={{
                    fond: filiereCouleur + '22',
                    bordure: filiereCouleur,
                    texte: filiereCouleur,
                  }}
                >
                  {`${ICONES_FILIERES[utilisateur.filiere as Filiere]} ${LIBELLES_FILIERES[utilisateur.filiere as Filiere]}`}
                </Pastille>
              ) : null}
            </View>
          </Hero>
        ) : (
          <Hero
            tag="AGROPASTORALE RCA · 8 HECTARES"
            titre="Bienvenue sur"
            titreEmphase="AGROPILOT"
            sousTitre={"Découvrez en lecture seule le pilotage de la ferme : tâches, cheptel, budget et plan d’aménagement."}
          >
            <View style={styles.metaHero}>
              <Pastille variante="paille">👁️ Mode consultation</Pastille>
            </View>
          </Hero>
        )}

        <View style={styles.corps}>
          <View style={styles.entete}>
            <Text style={styles.numero}>01 — MODULES</Text>
            <Text style={styles.titreSection}>
              <Text style={styles.titreItalique}>Six</Text> portes d&apos;entrée
            </Text>
          </View>

          <View style={styles.grille}>
            {MODULES.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(m.route as never)}
                accessibilityLabel={m.titre}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.modulePresseable,
                  pressed && styles.modulePresse,
                ]}
              >
                <Card bordureGauche={m.couleur}>
                  <View style={styles.moduleEntete}>
                    <Text style={styles.moduleIcone}>{m.icone}</Text>
                    <Tag variante="amber">{m.tag.toUpperCase()}</Tag>
                  </View>
                  <Text style={styles.moduleTitre}>{m.titre}</Text>
                  <Text style={styles.moduleDescription}>{m.description}</Text>
                  <View style={styles.moduleFlecheBloc}>
                    <Text style={[styles.moduleFleche, { color: m.couleur }]}>Ouvrir →</Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>

          <View style={styles.basDePage}>
            {utilisateur ? (
              <>
                <Bouton
                  libelle="Se déconnecter"
                  variante="rouge"
                  onPress={deconnexion}
                  pleinement
                />
                <Text style={styles.email}>{utilisateur.email}</Text>
              </>
            ) : (
              <>
                <Bouton
                  libelle="Se connecter"
                  variante="primaire"
                  onPress={() => router.push('/connexion')}
                  pleinement
                />
                <Text style={styles.email}>Accédez aux fonctions d&apos;édition</Text>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS_TOKEN.cream },
  contenu: { paddingBottom: ESPACEMENTS.xxxl },
  metaHero: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACEMENTS.s },
  corps: {
    paddingHorizontal: ESPACEMENTS.xl,
    paddingTop: ESPACEMENTS.xl,
  },
  entete: {
    marginBottom: ESPACEMENTS.l,
  },
  numero: {
    fontFamily: POLICES.mono,
    fontSize: 11,
    color: COULEURS_TOKEN.mint,
    letterSpacing: 1.2,
    marginBottom: ESPACEMENTS.s,
  },
  titreSection: {
    fontFamily: POLICES.serifSemi,
    fontSize: 26,
    color: COULEURS_TOKEN.soil,
    lineHeight: 32,
  },
  titreItalique: {
    fontFamily: POLICES.serifItalique,
    color: COULEURS_TOKEN.clay,
  },
  grille: { gap: ESPACEMENTS.m, marginBottom: ESPACEMENTS.xl },
  modulePresseable: {},
  modulePresse: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  moduleEntete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ESPACEMENTS.s,
  },
  moduleIcone: { fontSize: 28 },
  moduleTitre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 18,
    color: COULEURS_TOKEN.soil,
    marginBottom: 4,
  },
  moduleDescription: {
    fontFamily: POLICES.sans,
    fontSize: 13,
    lineHeight: 19,
    color: COULEURS_TOKEN.earth,
  },
  moduleFlecheBloc: {
    marginTop: ESPACEMENTS.m,
    alignItems: 'flex-end',
  },
  moduleFleche: {
    fontFamily: POLICES.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  basDePage: {
    marginTop: ESPACEMENTS.l,
    gap: ESPACEMENTS.m,
  },
  email: {
    textAlign: 'center',
    fontFamily: POLICES.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: COULEURS_TOKEN.clay,
  },
})
