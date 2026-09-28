import { api, qs } from './api'
import type { HistorialResumen } from '../types'

/** `dias`: 1 (hoy), 7, 30 o 90. El back cuenta hacia atrás desde hoy. */
export function getHistorial(dias?: number): Promise<HistorialResumen> {
  return api<HistorialResumen>(
    `/historial${qs({ dias: dias ? String(dias) : undefined })}`,
  )
}
