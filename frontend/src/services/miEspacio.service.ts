import { api, qs } from './api'
import type { MiEspacio } from '../types'

/** Lo del usuario logueado; `dias`: 7, 30 o 90 (el back cuenta desde hoy). */
export function getMiEspacio(dias?: number): Promise<MiEspacio> {
  return api<MiEspacio>(
    `/mi-espacio${qs({ dias: dias ? String(dias) : undefined })}`,
  )
}
