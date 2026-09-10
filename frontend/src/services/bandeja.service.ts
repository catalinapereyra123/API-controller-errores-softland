import { api, qs } from './api'
import type { ErrorTransaccion } from '../types'

export interface BandejaQuery extends Record<string, string | undefined> {
  empresa?: string
  modulo?: string
  estado?: string
  responsableId?: string
  /** 'false' trae también los cerrados (RESUELTO y DESCARTADO). */
  soloAbiertos?: 'true' | 'false'
}

/** GET /errores — bandeja plana, ya ordenada por detección descendente. */
export function getBandejaErrores(
  query: BandejaQuery = {},
): Promise<ErrorTransaccion[]> {
  return api<ErrorTransaccion[]>(`/errores${qs(query)}`)
}
