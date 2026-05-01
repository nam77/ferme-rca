import { useCallback, useEffect, useState } from 'react'
import {
  listerParcelles,
  obtenirParcelle,
  creerParcelle,
  ajouterEvenement,
} from '../api/parcelles.api'
import { useToastStore } from '../store/toastStore'
import type {
  EntreeCreationParcelle,
  EntreeEvenement,
  ParcelleDetail,
  ParcelleResume,
  TypeCulture,
} from '../types/culture.types'

export const useParcelles = (filtreType?: TypeCulture) => {
  const [parcelles, setParcelles] = useState<ParcelleResume[]>([])
  const [enChargement, setEnChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const afficherToast = useToastStore((s) => s.afficher)

  const recharger = useCallback(async () => {
    setEnChargement(true)
    setErreur(null)
    try {
      const liste = await listerParcelles(filtreType ? { typeCulture: filtreType } : {})
      setParcelles(liste)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setEnChargement(false)
    }
  }, [filtreType])

  useEffect(() => {
    recharger()
  }, [recharger])

  const ajouter = useCallback(
    async (entree: EntreeCreationParcelle) => {
      try {
        const cree = await creerParcelle(entree)
        setParcelles((s) =>
          [...s, cree].sort((a, b) =>
            a.typeCulture === b.typeCulture
              ? a.nom.localeCompare(b.nom)
              : a.typeCulture.localeCompare(b.typeCulture),
          ),
        )
        afficherToast('Parcelle créée.', 'succes')
        return cree
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } }
        const message =
          err.response?.data?.message ??
          (e instanceof Error ? e.message : 'Création impossible')
        afficherToast(message, 'erreur')
        throw e
      }
    },
    [afficherToast],
  )

  return { parcelles, enChargement, erreur, recharger, ajouter }
}

export const useParcelle = (parcelleId: string | null) => {
  const [parcelle, setParcelle] = useState<ParcelleDetail | null>(null)
  const [enChargement, setEnChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const afficherToast = useToastStore((s) => s.afficher)

  const recharger = useCallback(async () => {
    if (!parcelleId) return
    setEnChargement(true)
    setErreur(null)
    try {
      const detail = await obtenirParcelle(parcelleId)
      setParcelle(detail)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setEnChargement(false)
    }
  }, [parcelleId])

  useEffect(() => {
    recharger()
  }, [recharger])

  const enregistrerEvenement = useCallback(
    async (entree: EntreeEvenement) => {
      if (!parcelleId) return
      try {
        await ajouterEvenement(parcelleId, entree)
        afficherToast('Événement enregistré.', 'succes')
        await recharger()
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } } }
        const message =
          err.response?.data?.message ??
          (e instanceof Error ? e.message : 'Événement impossible')
        afficherToast(message, 'erreur')
        throw e
      }
    },
    [parcelleId, recharger, afficherToast],
  )

  return { parcelle, enChargement, erreur, recharger, enregistrerEvenement }
}
