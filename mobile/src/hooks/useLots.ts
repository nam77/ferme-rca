import { useCallback, useEffect, useState } from 'react'
import { listerLots, obtenirLot, ajouterMouvement } from '../api/lots.api'
import { useToastStore } from '../store/toastStore'
import type {
  EntreeMouvement,
  Espece,
  LotDetail,
  LotResume,
} from '../types/lot.types'

export const useLots = (filtreEspece?: Espece) => {
  const [lots, setLots] = useState<LotResume[]>([])
  const [enChargement, setEnChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    setEnChargement(true)
    setErreur(null)
    try {
      const liste = await listerLots(filtreEspece ? { espece: filtreEspece } : {})
      setLots(liste)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setEnChargement(false)
    }
  }, [filtreEspece])

  useEffect(() => {
    recharger()
  }, [recharger])

  return { lots, enChargement, erreur, recharger }
}

export const useLot = (lotId: string | null) => {
  const [lot, setLot] = useState<LotDetail | null>(null)
  const [enChargement, setEnChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const afficherToast = useToastStore((s) => s.afficher)

  const recharger = useCallback(async () => {
    if (!lotId) return
    setEnChargement(true)
    setErreur(null)
    try {
      const detail = await obtenirLot(lotId)
      setLot(detail)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setEnChargement(false)
    }
  }, [lotId])

  useEffect(() => {
    recharger()
  }, [recharger])

  const enregistrerMouvement = useCallback(
    async (entree: EntreeMouvement) => {
      if (!lotId) return
      try {
        await ajouterMouvement(lotId, entree)
        afficherToast('Mouvement enregistré.', 'succes')
        await recharger()
      } catch (e) {
        const erreurAxios = e as {
          response?: { status?: number; data?: { message?: string } }
        }
        const message =
          erreurAxios.response?.data?.message ??
          (e instanceof Error ? e.message : 'Mouvement impossible')
        afficherToast(message, 'erreur')
        throw e
      }
    },
    [lotId, recharger, afficherToast],
  )

  return { lot, enChargement, erreur, recharger, enregistrerMouvement }
}
