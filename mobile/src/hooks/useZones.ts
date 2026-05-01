import { useCallback, useEffect, useState } from 'react'
import { listerZones, recupererZone } from '../api/zones.api'
import type { ZoneDetail, ZoneListe } from '../types/zone.types'

export const useZones = () => {
  const [zones, setZones] = useState<ZoneListe[]>([])
  const [enChargement, setEnChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    setEnChargement(true)
    setErreur(null)
    try {
      const liste = await listerZones()
      setZones(liste)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setEnChargement(false)
    }
  }, [])

  useEffect(() => {
    recharger()
  }, [recharger])

  return { zones, enChargement, erreur, recharger }
}

export const useZone = (id: string | null) => {
  const [zone, setZone] = useState<ZoneDetail | null>(null)
  const [enChargement, setEnChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setZone(null)
      return
    }
    let annule = false
    setEnChargement(true)
    setErreur(null)
    recupererZone(id)
      .then((z) => {
        if (!annule) setZone(z)
      })
      .catch((e) => {
        if (!annule) setErreur(e instanceof Error ? e.message : 'Erreur')
      })
      .finally(() => {
        if (!annule) setEnChargement(false)
      })
    return () => {
      annule = true
    }
  }, [id])

  return { zone, enChargement, erreur }
}