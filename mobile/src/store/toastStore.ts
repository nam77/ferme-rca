import { create } from 'zustand'

export type TypeToast = 'info' | 'succes' | 'erreur' | 'avertissement'

export type Toast = {
  id: string
  message: string
  type: TypeToast
  duree: number
}

type EtatToast = {
  toasts: Toast[]
  afficher: (message: string, type?: TypeToast, duree?: number) => string
  retirer: (id: string) => void
}

const genererId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export const useToastStore = create<EtatToast>((set, get) => ({
  toasts: [],
  afficher: (message, type = 'info', duree = 3500) => {
    const id = genererId()
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duree }] }))
    setTimeout(() => get().retirer(id), duree)
    return id
  },
  retirer: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))