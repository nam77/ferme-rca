import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'
import { COULEURS_TOKEN, ESPACEMENTS, POLICES } from '../../constants/theme'

type ItemNav = {
  cle: string
  libelle: string
  route: string
  icone: keyof typeof Ionicons.glyphMap
  prefixesActifs: string[]
}

const ITEMS: ItemNav[] = [
  { cle: 'activite', libelle: 'Activité', route: '/activite', icone: 'list-outline', prefixesActifs: ['/activite'] },
  { cle: 'kanban', libelle: 'Kanban', route: '/kanban', icone: 'grid-outline', prefixesActifs: ['/kanban'] },
  { cle: 'ferme', libelle: 'Ferme', route: '/ferme', icone: 'leaf-outline', prefixesActifs: ['/ferme'] },
  { cle: 'cheptel', libelle: 'Cheptel', route: '/cheptel', icone: 'paw-outline', prefixesActifs: ['/cheptel'] },
  { cle: 'dashboard', libelle: 'Dashboard', route: '/dashboard', icone: 'stats-chart-outline', prefixesActifs: ['/dashboard'] },
  { cle: 'budget', libelle: 'Budget', route: '/budget', icone: 'wallet-outline', prefixesActifs: ['/budget'] },
]

export const BarreNavigation = () => {
  const router = useRouter()
  const pathname = usePathname()
  const utilisateur = useAuthStore((s) => s.utilisateur)
  const deconnexion = useAuthStore((s) => s.deconnexion)

  const estActif = (item: ItemNav): boolean =>
    item.prefixesActifs.some((p) => pathname.startsWith(p))

  return (
    <View style={styles.barre}>
      <Pressable
        onPress={() => router.push('/' as never)}
        accessibilityLabel="Accueil AGROPILOT"
        accessibilityRole="link"
        style={styles.logoBloc}
      >
        <Text style={styles.logoTexte}>AGROPILOT</Text>
        <Text style={styles.logoSousTitre}>Pilotage stratégique</Text>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.menu}
      >
        {ITEMS.map((item) => {
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
                color={actif ? COULEURS_TOKEN.leaf : COULEURS_TOKEN.clay}
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
    </View>
  )
}

const styles = StyleSheet.create({
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COULEURS_TOKEN.cream,
    borderBottomWidth: 2,
    borderBottomColor: COULEURS_TOKEN.bordure,
    paddingHorizontal: ESPACEMENTS.xl,
    paddingVertical: ESPACEMENTS.s,
    gap: ESPACEMENTS.xl,
    minHeight: 64,
  },
  logoBloc: {
    paddingVertical: ESPACEMENTS.xs,
    paddingRight: ESPACEMENTS.l,
    borderRightWidth: 1,
    borderRightColor: COULEURS_TOKEN.bordure,
  },
  logoTexte: {
    fontFamily: POLICES.serif,
    fontSize: 22,
    color: COULEURS_TOKEN.leaf,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  logoSousTitre: {
    fontFamily: POLICES.mono,
    fontSize: 9,
    color: COULEURS_TOKEN.clay,
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
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  itemMenuActif: {
    borderBottomColor: COULEURS_TOKEN.leaf,
  },
  itemIcone: {},
  itemTexte: {
    fontFamily: POLICES.mono,
    fontSize: 11,
    color: COULEURS_TOKEN.clay,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  itemTexteActif: {
    color: COULEURS_TOKEN.leaf,
    fontFamily: POLICES.monoMedium,
  },
  itemUtilisateur: {
    backgroundColor: COULEURS_TOKEN.leaf,
    borderRadius: 999,
    paddingHorizontal: ESPACEMENTS.m,
    borderBottomWidth: 0,
    marginLeft: ESPACEMENTS.s,
  },
  itemUtilisateurTexte: {
    fontFamily: POLICES.monoMedium,
    fontSize: 11,
    color: COULEURS_TOKEN.cream,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
