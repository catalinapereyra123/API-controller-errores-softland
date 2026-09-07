import { api } from './api'
import type { Usuario } from '../types'

/** GET /users/me — null mientras no haya usuarios cargados (todavía no hay auth). */
export function getCurrentUser(): Promise<Usuario | null> {
  return api<Usuario | null>('/users/me')
}

export function getUsuarios(): Promise<Usuario[]> {
  return api<Usuario[]>('/users')
}
