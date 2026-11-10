import { createContext } from 'react'
import type { CredencialesLogin, DatosRegistro } from '../services/auth.service'
import type { Usuario } from '../types'

export interface AuthContextValue {
  usuario: Usuario | null
  /** true mientras se revalida el token guardado al abrir la app. */
  cargando: boolean
  login: (credenciales: CredencialesLogin) => Promise<void>
  registrar: (datos: DatosRegistro) => Promise<void>
  /** SSO: lleva el navegador a Microsoft (vuelve solo a la app). */
  loginMicrosoft: () => void
  /** Por qué falló el último ingreso con Microsoft, para mostrarlo en el login. */
  errorMicrosoft: string | null
  salir: () => void
}

/** Vive en su propio archivo para no romper el fast refresh del provider. */
export const AuthContext = createContext<AuthContextValue | null>(null)
