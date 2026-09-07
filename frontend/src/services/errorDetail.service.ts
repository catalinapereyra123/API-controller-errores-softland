import { api, apiPatch, apiPost } from './api'
import type { ErrorDetalle, ErrorEstado } from '../types'

export function getErrorDetail(id: string): Promise<ErrorDetalle> {
  return api<ErrorDetalle>(`/errores/${id}`)
}

/** PATCH /errores/:id/asignacion — `null` desasigna. */
export function asignarResponsable(
  id: string,
  responsableId: string | null,
  autorId?: string,
): Promise<ErrorDetalle> {
  return apiPatch<ErrorDetalle>(`/errores/${id}/asignacion`, {
    responsableId,
    autorId,
  })
}

/** PATCH /errores/:id/estado — sólo estados manuales. */
export function cambiarEstado(
  id: string,
  estado: ErrorEstado,
  autorId?: string,
): Promise<ErrorDetalle> {
  return apiPatch<ErrorDetalle>(`/errores/${id}/estado`, { estado, autorId })
}

export function agregarObservacion(
  id: string,
  texto: string,
  autorId?: string,
): Promise<ErrorDetalle> {
  return apiPost<ErrorDetalle>(`/errores/${id}/observaciones`, {
    texto,
    autorId,
  })
}

/**
 * POST /errores/:id/reproceso — "marcar como corregido".
 * El back avisa a n8n y devuelve el detalle con `reprocesoNotificado`.
 */
export function solicitarReproceso(
  id: string,
  observacion?: string,
  autorId?: string,
): Promise<ErrorDetalle & { reprocesoNotificado: boolean }> {
  return apiPost<ErrorDetalle & { reprocesoNotificado: boolean }>(
    `/errores/${id}/reproceso`,
    { observacion, autorId },
  )
}
