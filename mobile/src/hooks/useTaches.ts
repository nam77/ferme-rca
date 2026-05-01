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
    let refus = 0
    let echecsReseau = 0
    for (const action of queue) {
      try {
        const misAJour = await changerStatutTache(action.tacheId, action.nouveauStatut)
        await supprimerAction(action.id)
        setEtat((s) => ({
          ...s,
          taches: s.taches.map((t) => (t.id === misAJour.id ? misAJour : t)),
        }))
        succes += 1
      } catch (e) {
        const erreurAxios = e as { response?: { status?: number } }
        const statutHttp = erreurAxios.response?.status
        // 4xx hors timeout : refus définitif → on purge l'action et on continue
        if (statutHttp && statutHttp >= 400 && statutHttp < 500 && statutHttp !== 408) {
          await supprimerAction(action.id)
          refus += 1
          continue
        }
        // Erreur réseau / 5xx : on garde et on stoppe la sync
        echecsReseau += 1
        break
      }
    }
    setEtat((s) => ({ ...s, enSynchronisation: false }))
    if (succes > 0) {
      afficherToast(
        `${succes} action${succes > 1 ? 's' : ''} synchronisée${succes > 1 ? 's' : ''}`,
        'succes',
      )
    }
    if (refus > 0) {
      afficherToast(
        `${refus} action${refus > 1 ? 's' : ''} refusée${refus > 1 ? 's' : ''} par le serveur (purgée${refus > 1 ? 's' : ''}).`,
        'avertissement',
      )
    }
    if (echecsReseau > 0 && succes === 0) {
      afficherToast(
        `Synchronisation impossible (${echecsReseau} action${echecsReseau > 1 ? 's' : ''} en attente)`,
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
        const erreurAxios = e as {
          response?: { status?: number; data?: { message?: string } }
        }
        const statutHttp = erreurAxios.response?.status

        // Refus du serveur (4xx hors 408 timeout) : on rollback la carte et on prévient
        if (statutHttp && statutHttp >= 400 && statutHttp < 500 && statutHttp !== 408) {
          setEtat((s) => ({
            ...s,
            taches: s.taches.map((t) =>
              t.id === id ? { ...t, statut: ancien.statut } : t,
            ),
          }))
          const message =
            erreurAxios.response?.data?.message ??
            (statutHttp === 403
              ? 'Action interdite : votre rôle ne permet pas de déplacer cette tâche.'
              : `Action refusée par le serveur (${statutHttp}).`)
          afficherToast(message, 'erreur')
          return
        }

        // Sinon (réseau coupé, 5xx, timeout) : on enfile et on garde l'optimiste
        await enfilerAction({
          tacheId: id,
          ancienStatut: ancien.statut,
          nouveauStatut,
        })
        afficherToast(
          'Connexion perdue. Action mise en file pour synchronisation.',
          'avertissement',
        )
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
