import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../../store/authStore'

type RoleAutorise = 'admin' | 'responsable' | 'ouvrier' | 'investisseur'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES } from '../../constants/theme'

type ItemNav = {
  cle: string
  libelle: string
  route: string
  icone: keyof typeof Ionicons.glyphMap
  prefixesActifs: string[]
  rolesAutorises?: RoleAutorise[]
}

const ITEMS: ItemNav[] = [
  { cle: 'activite', libelle: 'Activité', route: '/activite', icone: 'grid-outline', prefixesActifs: ['/activite'] },
  { cle: 'cultures', libelle: 'Cultures', route: '/cultures', icone: 'flower-outline', prefixesActifs: ['/cultures'] },
  { cle: 'cheptel', libelle: 'Cheptel', route: '/cheptel', icone: 'paw-outline', prefixesActifs: ['/cheptel'] },
  { cle: 'ferme', libelle: 'Ferme', route: '/ferme', icone: 'leaf-outline', prefixesActifs: ['/ferme'] },
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

  const estActif = (item: ItemNav): boolean =>
    item.prefixesActifs.some((p) => pathname.startsWith(p))

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
          return (
            <Pressable
              key={item.cle}
              onPress={() => router.push(item.route as never)}
              accessibilityLabel={item.libelle}
              accessibilityRole="link"
              style={[styles.itemMenu, actif && styles.itemMenuActif]}
            >
              <Ionicons
                name={item.icone}
                size={16}
                color={actif ? COULEURS_TOKEN.cream : 'rgba(250,246,238,0.70)'}
                style={styles.itemIcone}
              />
              <Text style={[styles.itemTexte, actif && styles.itemTexteActif]}>
                {item.libelle}
              </Text>
            </Pressable>
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
