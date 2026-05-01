export type Role = 'admin' | 'responsable' | 'ouvrier' | 'investisseur'

export type Filiere =
  | 'pisciculture'
  | 'aviculture'
  | 'porcins'
  | 'caprins'
  | 'cultures'
  | 'infrastructure'
  | 'habitat'

export type Utilisateur = {
  id: string
  email: string
  prenom: string
  nom: string
  role: Role
  filiere: Filiere | null
}

export type ReponseConnexion = {
  utilisateur: Utilisateur
  jeton: string
}

export type ReponseApi<T> = {
  succes: boolean
  donnees?: T
  message?: string
}
