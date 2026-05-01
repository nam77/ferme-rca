import { useCallback, useEffect, useState } from 'react'
import { recupererDashboard } from '../api/dashboard.api'
import type { Dashboard } from '../types/dashboard.types'

export const useDashboard = () => {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [enChargement, setEnChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    setEnChargement(true)
    setErreur(null)
    try {
      const d = await recupererDashboard()
      setDashboard(d)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setEnChargement(false)
    }
  }, [])

  useEffect(() => {
    recharger()
  }, [recharger])

  return { dashboard, enChargement, erreur, recharger }
}
