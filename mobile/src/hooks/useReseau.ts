import { useEffect, useState } from 'react'
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'

export const useReseau = () => {
  const [enLigne, setEnLigne] = useState<boolean>(true)
  const [type, setType] = useState<string>('inconnu')

  useEffect(() => {
    const appliquer = (state: NetInfoState) => {
      setEnLigne(state.isConnected !== false && state.isInternetReachable !== false)
      setType(state.type ?? 'inconnu')
    }

    NetInfo.fetch().then(appliquer)
    const unsubscribe = NetInfo.addEventListener(appliquer)
    return unsubscribe
  }, [])

  return { enLigne, type }
}