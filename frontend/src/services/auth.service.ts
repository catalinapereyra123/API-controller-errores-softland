import { apiPost, api } from './api'
import type { Sesion, Usuario } from '../types'

export interface CredencialesLogin {
  email: string
  password: string
}

export interface DatosRegistro extends CredencialesLogin {
  nombre: string
  rol?: string
}

/** POST /auth/registro — crea la cuenta y devuelve la sesión ya iniciada. */
export function registrar(datos: DatosRegistro): Promise<Sesion> {
  return apiPost<Sesion>('/auth/registro', datos)
}

/** POST /auth/login */
export function login(credenciales: CredencialesLogin): Promise<Sesion> {
  return apiPost<Sesion>('/auth/login', credenciales)
}

/** GET /auth/me — se usa al recargar la página para revalidar el token. */
export function getPerfil(): Promise<Usuario> {
  return api<Usuario>('/auth/me')
}
