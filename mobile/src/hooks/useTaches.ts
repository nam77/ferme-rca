import { useCallback, useEffect, useRef, useState } from 'react'
import {
  changerStatutTache,
  creerTache,
  listerTaches,
  supprimerTache,
} from '../api/taches.api'
import {
  enfilerAction,
  lireQueue,
  supprimerAction,
  type ActionOffline,
} from '../lib/queueOffline'
import { useReseau } from './useReseau'
import { useToastStore } from '../store/toastStore'
import type { EntreeCreationTache, Statut, Tache } from '../types/tache.types'

type EtatTaches = {
  taches: Tache[]
  enChargement: boolean
  erreur: string | null
  enSynchronisation: boolean
}

const appliquerActionsLocales = (taches: Tache[], actions: ActionOffline[]): Tache[] => {
  if (actions.length === 0) return taches
  return taches.map((t) => {
    const dernierePourTache = [...actions]
      .reverse()
      .find((a) => a.tacheId === t.id)
    if (dernierePourTache) {
      return { ...t, statut: dernierePourTache.nouveauStatut }
    }
    return t
  })
}

export const useTaches = () => {
  const [etat, setEtat] = useState<EtatTaches>({
    taches: [],
    enChargement: true,
    erreur: null,
    enSynchronisation: false,
  })
  const tachesRef = useRef<Tache[]>([])
  tachesRef.current = etat.taches
  const { enLigne } = useReseau()
  const enLigneRef = useRef(enLigne)
  enLigneRef.current = enLigne
  const afficherToast = useToastStore((s) => s.afficher)

  const recharger = useCallback(async () => {
    setEtat((s) => ({ ...s, enChargement: true, erreur: null }))
    try {
      const liste = await listerTaches()
      const queue = await lireQueue()
      const fusionnees = appliquerActionsLocales(liste, queue)
      setEtat((s) => ({ ...s, taches: fusionnees, enChargement: false, erreur: null }))
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur de chargement'
      setEtat((s) => ({ ...s, enChargement: false, erreur: message }))
    }
  }, [])

  useEffect(() => {
    recharger()
  }, [recharger])

  const synchroniserQueue = useCallback(async (): Promise<void> => {
    const queue = await lireQueue()
    if (queue.length === 0) return
    setEtat((s) => ({ ...s, enSynchronisation: true }))
    let succes = 0
    let echecs = 0
    for (const action of queue) {
      try {
        const misAJour = await changerStatutTache(action.tacheId, action.nouveauStatut)
        await supprimerAction(action.id)
        setEtat((s) => ({
          ...s,
          taches: s.taches.map((t) => (t.id === misAJour.id ? misAJour : t)),
        }))
        succes += 1
      } catch {
        echecs += 1
        // On garde l'action en queue et on arrête (peut-être déconnexion)
        break
      }
    }
    setEtat((s) => ({ ...s, enSynchronisation: false }))
    if (succes > 0) {
      afficherToast(
        `${succes} action${succes > 1 ? 's' : ''} synchronisée${succes > 1 ? 's' : ''}` +
          (echecs > 0 ? ` (${echecs} échec${echecs > 1 ? 's' : ''})` : ''),
        echecs > 0 ? 'avertissement' : 'succes',
      )
    } else if (echecs > 0) {
      afficherToast(
        `Synchronisation impossible (${echecs} action${echecs > 1 ? 's' : ''} en attente)`,
        'erreur',
      )
    }
  }, [afficherToast])

  // Synchro auto au passage offline → online
  const dejaEnLigne = useRef(enLigne)
  useEffect(() => {
    if (enLigne && !dejaEnLigne.current) {
      synchroniserQueue()
    }
    dejaEnLigne.current = enLigne
  }, [enLigne, synchroniserQueue])

  const deplacer = useCallback(
    async (id: string, nouveauStatut: Statut) => {
      const ancien = tachesRef.current.find((t) => t.id === id)
      if (!ancien || ancien.statut === nouveauStatut) return

      // Mise à jour optimiste immédiate
      setEtat((s) => ({
        ...s,
        taches: s.taches.map((t) => (t.id === id ? { ...t, statut: nouveauStatut } : t)),
      }))

      if (!enLigneRef.current) {
        await enfilerAction({
          tacheId: id,
          ancienStatut: ancien.statut,
          nouveauStatut,
        })
        afficherToast(
          'Action mise en file. Synchronisation au retour de la connexion.',
          'avertissement',
        )
        return
      }

      try {
        const misAJour = await changerStatutTache(id, nouveauStatut)
        setEtat((s) => ({
          ...s,
          taches: s.taches.map((t) => (t.id === id ? misAJour : t)),
        }))
      } catch (e) {
        // Réseau peut-être tombé entre-temps : on enfile et on garde l'optimiste
        await enfilerAction({
          tacheId: id,
          ancienStatut: ancien.statut,
          nouveauStatut,
        })
        afficherToast(
          'Connexion perdue. Action mise en file pour synchronisation.',
          'avertissement',
        )
        // Pas de rollback ici : l'optimiste devient la valeur attendue
        void e
      }
    },
    [afficherToast],
  )

  const ajouter = useCallback(
    async (entree: EntreeCreationTache) => {
      if (!enLigneRef.current) {
        afficherToast(
          'Création impossible hors ligne pour le moment.',
          'erreur',
        )
        throw new Error('Création nécessite une connexion')
      }
      const cree = await creerTache(entree)
      setEtat((s) => ({ ...s, taches: [cree, ...s.taches] }))
      return cree
    },
    [afficherToast],
  )

  const supprimer = useCallback(
    async (id: string) => {
      if (!enLigneRef.current) {
        afficherToast(
          'Suppression impossible hors ligne pour le moment.',
          'erreur',
        )
        throw new Error('Suppression nécessite une connexion')
      }
      const ancien = tachesRef.current
      setEtat((s) => ({ ...s, taches: s.taches.filter((t) => t.id !== id) }))
      try {
        await supprimerTache(id)
      } catch (e) {
        setEtat((s) => ({
          ...s,
          taches: ancien,
          erreur: e instanceof Error ? e.message : 'Suppression impossible',
        }))
      }
    },
    [afficherToast],
  )

  return {
    taches: etat.taches,
    enChargement: etat.enChargement,
    erreur: etat.erreur,
    enSynchronisation: etat.enSynchronisation,
    recharger,
    deplacer,
    ajouter,
    supprimer,
  }
}
