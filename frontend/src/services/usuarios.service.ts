import { api } from './api'
import type { Usuario } from '../types'

/**
 * GET /users — usuarios que pueden ser responsables de un error.
 * El perfil de la sesión vive en `auth.service.ts` (`/auth/me`).
 */
export function getUsuarios(): Promise<Usuario[]> {
  return api<Usuario[]>('/users')
}
