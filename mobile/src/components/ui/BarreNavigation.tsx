import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useAuthStore } from '../../store/authStore'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES, RAYONS } from '../../constants/theme'

type RoleAutorise = 'admin' | 'responsable' | 'ouvrier' | 'investisseur'

type Destination = {
  cle: string
  libelle: string
  route: string
  icone: keyof typeof Ionicons.glyphMap
  iconeActif: keyof typeof Ionicons.glyphMap
  prefixes: string[]
  couleur: string
  rolesAutorises?: RoleAutorise[]
}

// Quatre raccourcis « pouce » toujours visibles dans la pilule.
const PRINCIPAUX: Destination[] = [
  {
    cle: 'accueil',
    libelle: 'Accueil',
    route: '/',
    icone: 'home-outline',
    iconeActif: 'home',
    prefixes: ['/'],
    couleur: COULEURS_TOKEN.mint,
  },
  {
    cle: 'activite',
    libelle: 'Tâches',
    route: '/activite',
    icone: 'grid-outline',
    iconeActif: 'grid',
    prefixes: ['/activite'],
    couleur: COULEURS_TOKEN.mint,
  },
  {
    cle: 'cultures',
    libelle: 'Agriculture',
    route: '/cultures',
    icone: 'flower-outline',
    iconeActif: 'flower',
    prefixes: ['/cultures'],
    couleur: COULEURS_TOKEN.cultures,
  },
  {
    cle: 'cheptel',
    libelle: 'Élevage',
    route: '/cheptel',
    icone: 'paw-outline',
    iconeActif: 'paw',
    prefixes: ['/cheptel'],
    couleur: COULEURS_TOKEN.porcins,
  },
]

// Le reste, accessible via « ⋯ » dans une feuille.
const SECONDAIRES: Destination[] = [
  {
    cle: 'dashboard',
    libelle: 'Tableau de bord',
    route: '/dashboard',
    icone: 'stats-chart-outline',
    iconeActif: 'stats-chart',
    prefixes: ['/dashboard'],
    couleur: COULEURS_TOKEN.water,
  },
  {
    cle: 'budget',
    libelle: 'Budget & Ventes',
    route: '/budget',
    icone: 'wallet-outline',
    iconeActif: 'wallet',
    prefixes: ['/budget'],
    couleur: COULEURS_TOKEN.aviculture,
  },
  {
    cle: 'cra',
    libelle: 'Pointage',
    route: '/cra',
    icone: 'time-outline',
    iconeActif: 'time',
    prefixes: ['/cra'],
    couleur: COULEURS_TOKEN.clay,
  },
  {
    cle: 'projet',
    libelle: 'Projet',
    route: '/projet',
    icone: 'document-text-outline',
    iconeActif: 'document-text',
    prefixes: ['/projet'],
    couleur: COULEURS_TOKEN.straw,
  },
  {
    cle: 'ferme',
    libelle: 'Ferme',
    route: '/ferme',
    icone: 'leaf-outline',
    iconeActif: 'leaf',
    prefixes: ['/ferme'],
    couleur: COULEURS_TOKEN.caprins,
  },
  {
    cle: 'deploiement',
    libelle: 'Déploiement',
    route: '/deploiement',
    icone: 'rocket-outline',
    iconeActif: 'rocket',
    prefixes: ['/deploiement'],
    couleur: COULEURS_TOKEN.infrastructure,
    rolesAutorises: ['admin'],
  },
]

export const BarreNavigation = () => {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const utilisateur = useAuthStore((s) => s.utilisateur)
  const deconnexion = useAuthStore((s) => s.deconnexion)
  const [feuilleOuverte, setFeuilleOuverte] = useState(false)

  const estActif = (dest: Destination): boolean => {
    if (dest.cle === 'accueil') return pathname === '/'
    return dest.prefixes.some((p) => pathname.startsWith(p))
  }

  const secondairesVisibles = SECONDAIRES.filter((dest) => {
    if (!dest.rolesAutorises) return true
    if (!utilisateur) return false
    return dest.rolesAutorises.includes(utilisateur.role as RoleAutorise)
  })

  const plusActif = secondairesVisibles.some((dest) => estActif(dest))

  const aller = (route: string) => {
    setFeuilleOuverte(false)
    router.push(route as never)
  }

  return (
    <View style={[styles.socle, { paddingBottom: Math.max(insets.bottom, ESPACEMENTS.s) }]}>
      <LinearGradient
        colors={['#1D3F17', '#264E20', '#446D33']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pilule}
      >
        {PRINCIPAUX.map((dest) => {
          const actif = estActif(dest)
          return (
            <Pressable
              key={dest.cle}
              onPress={() => aller(dest.route)}
              accessibilityLabel={dest.libelle}
              accessibilityRole="link"
              accessibilityState={{ selected: actif }}
              style={[styles.onglet, actif && { backgroundColor: dest.couleur }]}
            >
              <Ionicons
                name={actif ? dest.iconeActif : dest.icone}
                size={22}
                color={actif ? COULEURS_TOKEN.cream : 'rgba(250,246,238,0.62)'}
              />
              {actif ? (
                <Animated.Text entering={FadeIn.duration(180)} style={styles.ongletLibelle}>
                  {dest.libelle}
                </Animated.Text>
              ) : null}
            </Pressable>
          )
        })}

        {/* Bouton « ⋯ » : ouvre la feuille des autres rubriques */}
        <Pressable
          onPress={() => setFeuilleOuverte(true)}
          accessibilityLabel="Plus de rubriques"
          accessibilityRole="button"
          accessibilityState={{ expanded: feuilleOuverte }}
          style={[styles.onglet, (plusActif || feuilleOuverte) && styles.ongletPlusActif]}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={plusActif || feuilleOuverte ? COULEURS_TOKEN.cream : 'rgba(250,246,238,0.62)'}
          />
        </Pressable>
      </LinearGradient>

      <Modal
        transparent
        visible={feuilleOuverte}
        animationType="slide"
        onRequestClose={() => setFeuilleOuverte(false)}
      >
        <Pressable
          style={styles.voile}
          accessibilityLabel="Fermer le menu"
          onPress={() => setFeuilleOuverte(false)}
        >
          <Pressable
            style={[styles.feuille, { paddingBottom: Math.max(insets.bottom, ESPACEMENTS.l) }]}
            onPress={() => {}}
          >
            <View style={styles.poignee} />
            <Text style={styles.feuilleTitre}>Toutes les rubriques</Text>

            <ScrollView
              contentContainerStyle={styles.grille}
              showsVerticalScrollIndicator={false}
            >
              {secondairesVisibles.map((dest) => {
                const actif = estActif(dest)
                return (
                  <Pressable
                    key={dest.cle}
                    onPress={() => aller(dest.route)}
                    accessibilityLabel={dest.libelle}
                    accessibilityRole="link"
                    accessibilityState={{ selected: actif }}
                    style={({ pressed }) => [
                      styles.carte,
                      actif && { borderColor: dest.couleur, backgroundColor: dest.couleur + '14' },
                      pressed && styles.cartePressee,
                    ]}
                  >
                    <View style={[styles.cartePastille, { backgroundColor: dest.couleur + '22' }]}>
                      <Ionicons
                        name={actif ? dest.iconeActif : dest.icone}
                        size={22}
                        color={dest.couleur}
                      />
                    </View>
                    <Text style={styles.carteLibelle}>{dest.libelle}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {utilisateur ? (
              <Pressable
                onPress={() => {
                  setFeuilleOuverte(false)
                  deconnexion()
                }}
                accessibilityLabel="Se déconnecter"
                accessibilityRole="button"
                style={({ pressed }) => [styles.deconnexion, pressed && styles.cartePressee]}
              >
                <Ionicons name="log-out-outline" size={20} color={COULEURS_TOKEN.rouge} />
                <Text style={styles.deconnexionTexte}>
                  Se déconnecter · {utilisateur.prenom}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => aller('/connexion')}
                accessibilityLabel="Se connecter"
                accessibilityRole="link"
                style={({ pressed }) => [styles.connexion, pressed && styles.cartePressee]}
              >
                <Ionicons name="log-in-outline" size={20} color={COULEURS_TOKEN.cream} />
                <Text style={styles.connexionTexte}>Se connecter</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  socle: {
    backgroundColor: COULEURS_TOKEN.cream,
    paddingHorizontal: ESPACEMENTS.l,
    paddingTop: ESPACEMENTS.s,
  },
  pilule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACEMENTS.xs,
    paddingHorizontal: ESPACEMENTS.s,
    paddingVertical: ESPACEMENTS.s,
    borderRadius: RAYONS.rond,
    shadowColor: '#1D3F17',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  onglet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: RAYONS.rond,
  },
  ongletPlusActif: {
    backgroundColor: 'rgba(250,246,238,0.16)',
  },
  ongletLibelle: {
    fontFamily: POLICES.sansBold,
    fontSize: 14,
    color: COULEURS_TOKEN.cream,
    letterSpacing: 0.3,
  },
  voile: {
    flex: 1,
    backgroundColor: 'rgba(13,26,10,0.45)',
    justifyContent: 'flex-end',
  },
  feuille: {
    backgroundColor: COULEURS_TOKEN.cream,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: ESPACEMENTS.l,
    paddingTop: ESPACEMENTS.m,
  },
  poignee: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: COULEURS_TOKEN.bordure,
    marginBottom: ESPACEMENTS.l,
  },
  feuilleTitre: {
    fontFamily: POLICES.serifSemi,
    fontSize: 20,
    color: COULEURS_TOKEN.soil,
    marginBottom: ESPACEMENTS.l,
  },
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACEMENTS.m,
  },
  carte: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.m,
    minHeight: 64,
    paddingHorizontal: ESPACEMENTS.m,
    paddingVertical: ESPACEMENTS.m,
    borderRadius: RAYONS.grand,
    borderWidth: 1,
    borderColor: COULEURS_TOKEN.bordure,
    backgroundColor: COULEURS_TOKEN.carte,
  },
  cartePressee: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cartePastille: {
    width: 40,
    height: 40,
    borderRadius: RAYONS.rond,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carteLibelle: {
    flex: 1,
    fontFamily: POLICES.sansMedium,
    fontSize: 15,
    color: COULEURS_TOKEN.soil,
  },
  deconnexion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.s,
    minHeight: 52,
    marginTop: ESPACEMENTS.l,
    borderRadius: RAYONS.grand,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.4)',
    backgroundColor: 'rgba(231,76,60,0.08)',
  },
  deconnexionTexte: {
    fontFamily: POLICES.sansBold,
    fontSize: 15,
    color: COULEURS_TOKEN.rouge,
  },
  connexion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACEMENTS.s,
    minHeight: 52,
    marginTop: ESPACEMENTS.l,
    borderRadius: RAYONS.grand,
    backgroundColor: COULEURS_TOKEN.leaf,
  },
  connexionTexte: {
    fontFamily: POLICES.sansBold,
    fontSize: 15,
    color: COULEURS_TOKEN.cream,
  },
})
