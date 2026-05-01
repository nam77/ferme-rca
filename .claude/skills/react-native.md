
# Skill : React Native — Ferme RCA

## Structure obligatoire d'un écran
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native'
import { COULEURS } from '../constants/couleurs'

export const MonEcran = () => {
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [donnees, setDonnees] = useState([])

  useEffect(() => {
    chargerDonnees()
  }, [])

  if (chargement) return (
    <View style={styles.centré}>
      <ActivityIndicator size="large" color={COULEURS.vert} />
    </View>
  )

  if (erreur) return (
    <View style={styles.centré}>
      <Text style={styles.erreur}>{erreur}</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.conteneur}>
      {/* contenu */}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS.fond },
  centré: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  erreur: { color: '#e74c3c', fontSize: 16, textAlign: 'center', padding: 20 }
})

## Composants réutilisables à créer
- BoutonPrincipal : vert, height 52px, icône optionnelle, gros texte
- CarteTache : bordure gauche colorée par filière, info complète
- BadgePriorite : rouge/orange/vert selon priorité
- BadgeFiliere : icône emoji + couleur de fond
- ModalCreation : modal plein écran avec formulaire de tâche
- KPICard : chiffre grand + label + couleur d'accent
- GaleriePhotos : FlatList horizontal avec images swipeables

## Gestion erreur API standard
try {
  const rep = await api.getTaches()
  setDonnees(rep.data.donnees)
} catch (err) {
  setErreur('Impossible de charger. Vérifiez la connexion.')
} finally {
  setChargement(false)
}

## Mode offline Kanban
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'

// Sauvegarder action offline
const sauvegarderActionOffline = async (action) => {
  const queue = JSON.parse(await AsyncStorage.getItem('kanban_queue') || '[]')
  queue.push({ ...action, timestamp: Date.now() })
  await AsyncStorage.setItem('kanban_queue', JSON.stringify(queue))
}

// Synchroniser au retour de connexion
NetInfo.addEventListener(state => {
  if (state.isConnected) synchroniserActionsOffline()
})

## Règles d'accessibilité terrain RCA
- Font size minimum 16 pour les contenus
- Boutons : height 48px minimum, padding horizontal 20px
- Contraste élevé (ratio > 4.5:1) - lisible en plein soleil
- accessibilityLabel sur tout élément interactif
- Pas d'animations complexes (performance sur vieux téléphones)
      