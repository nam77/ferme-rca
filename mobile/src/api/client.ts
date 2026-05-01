import axios, { type InternalAxiosRequestConfig } from 'axios'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const CLE_JETON = 'ferme_rca_jeton'

const URL_PAR_DEFAUT = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001'

export const URL_API = process.env.EXPO_PUBLIC_API_URL ?? URL_PAR_DEFAUT

export const client = axios.create({
  baseURL: URL_API,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const jeton = await AsyncStorage.getItem(CLE_JETON)
  if (jeton) {
    config.headers.set('Authorization', `Bearer ${jeton}`)
  }
  return config
})
