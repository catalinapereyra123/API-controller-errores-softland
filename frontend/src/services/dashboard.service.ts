import { api } from './api'
import type { DashboardStats, ErrorTransaccion } from '../types'

export function getDashboardStats(): Promise<DashboardStats> {
  return api<DashboardStats>('/dashboard/stats')
}

/** Abiertos sin responsable o abiertos hace más de 2 h. */
export function getErroresPrioritarios(): Promise<ErrorTransaccion[]> {
  return api<ErrorTransaccion[]>('/errores/prioritarios')
}
