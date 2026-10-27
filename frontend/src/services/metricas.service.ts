import { api } from './api'
import type { Metricas } from '../types'

export function getMetricas(dias: number): Promise<Metricas> {
  return api<Metricas>(`/metricas?dias=${dias}`)
}
