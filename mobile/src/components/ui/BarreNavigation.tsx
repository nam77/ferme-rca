import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../../store/authStore'

type RoleAutorise = 'admin' | 'responsable' | 'ouvrier' | 'investisseur'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES } from '../../constants/theme'

type SousItemNav = {
  cle: string
  libelle: string
  route: string
  icone: keyof typeof Ionicons.glyphMap
  prefixesActifs: string[]
}

type ItemNav = {
  cle: string
  libelle: string
  route?: string
  icone: keyof typeof Ionicons.glyphMap
  prefixesActifs: string[]
  rolesAutorises?: RoleAutorise[]
  sousItems?: SousItemNav[]
}

const ITEMS: ItemNav[] = [
  { cle: 'activite', libelle: 'Activité', route: '/activite', icone: 'grid-outline', prefixesActifs: ['/activite'] },
  { cle: 'cultures', libelle: 'Cultures', route: '/cultures', icone: 'flower-outline', prefixesActifs: ['/cultures'] },
  { cle: 'cheptel', libelle: 'Cheptel', route: '/cheptel', icone: 'paw-outline', prefixesActifs: ['/cheptel'] },
  {
    cle: 'projet-ferme',
    libelle: 'Projet et Ferme',
    icone: 'leaf-outline',
    prefixesActifs: ['/ferme', '/projet'],
    sousItems: [
      { cle: 'projet', libelle: 'Projet', route: '/projet', icone: 'document-text-outline', prefixesActifs: ['/projet'] },
      { cle: 'ferme', libelle: 'Ferme', route: '/ferme', icone: 'leaf-outline', prefixesActifs: ['/ferme'] },
    ],
  },
  { cle: 'dashboard', libelle: 'Dashboard', route: '/dashboard', icone: 'stats-chart-outline', prefixesActifs: ['/dashboard'] },
  { cle: 'budget', libelle: 'Budget et Ventes', route: '/budget', icone: 'wallet-outline', prefixesActifs: ['/budget'] },
  { cle: 'cra', libelle: 'CRA', route: '/cra', icone: 'time-outline', prefixesActifs: ['/cra'] },
  { cle: 'deploiement', libelle: 'Déploiement', route: '/deploiement', icone: 'rocket-outline', prefixesActifs: ['/deploiement'], rolesAutorises: ['admin'] },
]

export const BarreNavigation = () => {
  const router = useRouter()
  const pathname = usePathname()
  const utilisateur = useAuthStore((s) => s.utilisateur)
  const deconnexion = useAuthStore((s) => s.deconnexion)
  const [menuOuvert, setMenuOuvert] = useState<string | null>(null)

  const estActif = (item: { prefixesActifs: string[] }): boolean =>
    item.prefixesActifs.some((p) => pathname.startsWith(p))

  const ouvrirSousMenu = (cle: string) => {
    setMenuOuvert((courant) => (courant === cle ? null : cle))
  }

  const fermerSousMenu = () => setMenuOuvert(null)

  const naviguerSousItem = (route: string) => {
    fermerSousMenu()
    router.push(route as never)
  }

  return (
    <LinearGradient
      colors={['#1D3F17', '#264E20', '#446D33']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.barre}
    >
      <Pressable
        onPress={() => router.push('/' as never)}
        accessibilityLabel="Accueil AGROPILOT"
        accessibilityRole="link"
        style={styles.logoBloc}
      >
        <Text style={styles.logoTexte}>
          AGRO<Text style={styles.logoTexteAccent}>PILOT</Text>
        </Text>
        <Text style={styles.logoSousTitre}>Outil de pilotage agropastoral</Text>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.menu}
      >
        {ITEMS.filter((item) => {
          if (!item.rolesAutorises) return true
          if (!utilisateur) return false
          return item.rolesAutorises.includes(utilisateur.role as RoleAutorise)
        }).map((item) => {
          const actif = estActif(item)
          const aSousMenu = !!item.sousItems?.length
          const ouvert = menuOuvert === item.cle

          return (
            <View key={item.cle} style={styles.itemAncre}>
              <Pressable
                onPress={() => {
                  if (aSousMenu) {
                    ouvrirSousMenu(item.cle)
                  } else if (item.route) {
                    router.push(item.route as never)
                  }
                }}
                accessibilityLabel={item.libelle}
                accessibilityRole={aSousMenu ? 'button' : 'link'}
                style={[styles.itemMenu, (actif || ouvert) && styles.itemMenuActif]}
              >
                <Ionicons
                  name={item.icone}
                  size={16}
                  color={actif || ouvert ? COULEURS_TOKEN.cream : 'rgba(250,246,238,0.70)'}
                  style={styles.itemIcone}
                />
                <Text style={[styles.itemTexte, (actif || ouvert) && styles.itemTexteActif]}>
                  {item.libelle}
                </Text>
                {aSousMenu ? (
                  <Ionicons
                    name={ouvert ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={actif || ouvert ? COULEURS_TOKEN.cream : 'rgba(250,246,238,0.70)'}
                    style={styles.chevron}
                  />
                ) : null}
              </Pressable>

              {aSousMenu && ouvert ? (
                <Modal
                  transparent
                  visible={ouvert}
                  animationType="fade"
                  onRequestClose={fermerSousMenu}
                >
                  <Pressable
                    style={styles.overlay}
                    accessibilityLabel="Fermer le menu"
                    onPress={fermerSousMenu}
                  >
                    <View style={styles.popoverPositionneur} pointerEvents="box-none">
                      <View style={styles.popoverDuo}>
                        {item.sousItems?.map((sous) => {
                          const sousActif = estActif(sous)
                          return (
                            <Pressable
                              key={sous.cle}
                              onPress={() => naviguerSousItem(sous.route)}
                              accessibilityLabel={sous.libelle}
                              accessibilityRole="link"
                              style={[styles.chip, sousActif && styles.chipActif]}
                            >
                              <View style={[styles.chipPastille, sousActif && styles.chipPastilleActif]}>
                                <Ionicons
                                  name={sous.icone}
                                  size={16}
                                  color={sousActif ? COULEURS_TOKEN.cream : 'rgba(250,246,238,0.95)'}
                                />
                              </View>
                              <Text style={[styles.chipTexte, sousActif && styles.chipTexteActif]}>
                                {sous.libelle}
                              </Text>
                            </Pressable>
                          )
                        })}
                      </View>
                    </View>
                  </Pressable>
                </Modal>
              ) : null}
            </View>
          )
        })}

        {utilisateur ? (
          <Pressable
            onPress={deconnexion}
            accessibilityLabel="Se déconnecter"
            accessibilityRole="button"
            style={[styles.itemMenu, styles.itemUtilisateur]}
          >
            <Ionicons name="person-circle-outline" size={18} color={COULEURS_TOKEN.cream} />
            <Text style={styles.itemUtilisateurTexte}>
              {utilisateur.prenom}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ESPACEMENTS.xl,
    paddingVertical: ESPACEMENTS.s,
    gap: ESPACEMENTS.xl,
    minHeight: 64,
  },
  logoBloc: {
    paddingVertical: ESPACEMENTS.xs,
    paddingRight: ESPACEMENTS.l,
    borderRightWidth: 1,
    borderRightColor: 'rgba(250,246,238,0.20)',
  },
  logoTexte: {
    fontFamily: POLICES.serif,
    fontSize: 22,
    color: COULEURS_TOKEN.cream,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  logoTexteAccent: {
    fontFamily: POLICES.serifItalique,
    color: COULEURS_TOKEN.straw,
  },
  logoSousTitre: {
    fontFamily: POLICES.mono,
    fontSize: 9,
    color: 'rgba(250,246,238,0.65)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  menu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACEMENTS.xs,
    paddingRight: ESPACEMENTS.s,
  },
  itemMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: ESPACEMENTS.m,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  itemMenuActif: {
    backgroundColor: 'rgba(250,246,238,0.15)',
  },
  itemIcone: {},
  itemAncre: {
    position: 'relative',
  },
  chevron: {
    marginLeft: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13,26,10,0.35)',
  },
  popoverPositionneur: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  popoverDuo: {
    flexDirection: 'row',
    gap: 10,
    padding: 8,
    backgroundColor: 'rgba(29,63,23,0.96)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(250,246,238,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 6,
    paddingRight: 18,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(250,246,238,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(250,246,238,0.14)',
    minWidth: 130,
  },
  chipActif: {
    backgroundColor: 'rgba(125,212,74,0.18)',
    borderColor: 'rgba(125,212,74,0.55)',
  },
  chipPastille: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250,246,238,0.10)',
  },
  chipPastilleActif: {
    backgroundColor: 'rgba(125,212,74,0.35)',
  },
  chipTexte: {
    fontFamily: POLICES.mono,
    fontSize: 12,
    color: 'rgba(250,246,238,0.85)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chipTexteActif: {
    color: COULEURS_TOKEN.cream,
    fontFamily: POLICES.monoMedium,
  },
  itemTexte: {
    fontFamily: POLICES.mono,
    fontSize: 11,
    color: 'rgba(250,246,238,0.70)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  itemTexteActif: {
    color: COULEURS_TOKEN.cream,
    fontFamily: POLICES.monoMedium,
  },
  itemUtilisateur: {
    backgroundColor: 'rgba(250,246,238,0.18)',
    borderRadius: 999,
    paddingHorizontal: ESPACEMENTS.m,
    marginLeft: ESPACEMENTS.s,
    borderWidth: 1,
    borderColor: 'rgba(250,246,238,0.25)',
  },
  itemUtilisateurTexte: {
    fontFamily: POLICES.monoMedium,
    fontSize: 11,
    color: COULEURS_TOKEN.cream,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
