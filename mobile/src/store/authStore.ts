import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CLE_JETON } from '../api/client'
import {
  demanderReinitialisation,
  recupererProfil,
  seConnecter,
  sInscrire,
  type DonneesInscription,
} from '../api/auth.api'
import type { Utilisateur } from '../types/auth.types'

const CLE_UTILISATEUR = 'ferme_rca_utilisateur'

type EtatAuth = {
  utilisateur: Utilisateur | null
  jeton: string | null
  enChargement: boolean
  pretInitial: boolean
  erreur: string | null
  initialiser: () => Promise<void>
  connexion: (email: string, motDePasse: string) => Promise<void>
  inscription: (donnees: DonneesInscription) => Promise<void>
  demanderReset: (email: string) => Promise<string>
  deconnexion: () => Promise<void>
}

export const useAuthStore = create<EtatAuth>((set) => ({
  utilisateur: null,
  jeton: null,
  enChargement: false,
  pretInitial: false,
  erreur: null,

  initialiser: async () => {
    try {
      const jeton = await AsyncStorage.getItem(CLE_JETON)
      const utilisateurJson = await AsyncStorage.getItem(CLE_UTILISATEUR)
      if (!jeton || !utilisateurJson) {
        set({ pretInitial: true })
        return
      }
      const utilisateurLocal: Utilisateur = JSON.parse(utilisateurJson)
      set({ utilisateur: utilisateurLocal, jeton })
      try {
        const utilisateurFrais = await recupererProfil()
        await AsyncStorage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateurFrais))
        set({ utilisateur: utilisateurFrais })
      } catch {
        await AsyncStorage.removeItem(CLE_JETON)
        await AsyncStorage.removeItem(CLE_UTILISATEUR)
        set({ utilisateur: null, jeton: null })
      }
    } finally {
      set({ pretInitial: true })
    }
  },

  connexion: async (email, motDePasse) => {
    set({ enChargement: true, erreur: null })
    try {
      const { utilisateur, jeton } = await seConnecter(email, motDePasse)
      await AsyncStorage.setItem(CLE_JETON, jeton)
      await AsyncStorage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateur))
      set({ utilisateur, jeton, enChargement: false })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur de connexion'
      set({ erreur: message, enChargement: false })
      throw e
    }
  },

  inscription: async (donnees) => {
    set({ enChargement: true, erreur: null })
    try {
      const { utilisateur, jeton } = await sInscrire(donnees)
      await AsyncStorage.setItem(CLE_JETON, jeton)
      await AsyncStorage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateur))
      set({ utilisateur, jeton, enChargement: false })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur d'inscription"
      set({ erreur: message, enChargement: false })
      throw e
    }
  },

  demanderReset: async (email) => {
    set({ enChargement: true, erreur: null })
    try {
      const message = await demanderReinitialisation(email)
      set({ enChargement: false })
      return message
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur de demande'
      set({ erreur: message, enChargement: false })
      throw e
    }
  },

  deconnexion: async () => {
    await AsyncStorage.removeItem(CLE_JETON)
    await AsyncStorage.removeItem(CLE_UTILISATEUR)
    set({ utilisateur: null, jeton: null, erreur: null })
  },
}))
