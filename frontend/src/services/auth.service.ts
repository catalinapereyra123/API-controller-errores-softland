import { API_URL, apiPost, api } from './api'
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

/** GET /auth/microsoft/config — si el SSO con Microsoft está prendido en el backend. */
export async function getSsoMicrosoft(): Promise<boolean> {
  const { microsoft } = await api<{ microsoft: boolean }>(
    '/auth/microsoft/config',
  )
  return microsoft === true
}

/**
 * GET /auth/microsoft/login — no es un fetch: el navegador va a Microsoft y
 * vuelve a la app con `?ms=ok` (o `?ms_error=<motivo>`).
 */
export function urlLoginMicrosoft(): string {
  return `${API_URL}/auth/microsoft/login`
}

/**
 * POST /auth/microsoft/sesion — el código de un solo uso viaja en una cookie
 * httpOnly que dejó el callback: sólo lo puede canjear este navegador.
 */
export function canjearSesionMicrosoft(): Promise<Sesion> {
  return apiPost<Sesion>('/auth/microsoft/sesion')
}

/** GET /auth/me — se usa al recargar la página para revalidar el token. */
export function getPerfil(): Promise<Usuario> {
  return api<Usuario>('/auth/me')
}
